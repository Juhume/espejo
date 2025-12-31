/**
 * Cifrado E2E con AES-256-GCM y PBKDF2
 */

const PBKDF2_ITERATIONS = 100000
const SALT_LENGTH = 16
const IV_LENGTH = 12
const KEY_LENGTH = 256

export interface EncryptedPayload {
  ciphertext: string  // Base64
  iv: string          // Base64
  salt: string        // Base64
  version: number     // Para futuras migraciones
}

export interface CryptoKeys {
  encryptionKey: CryptoKey
  salt: Uint8Array
}

/**
 * Deriva una clave AES-GCM desde una contraseña usando PBKDF2
 */
export async function deriveKey(
  password: string, 
  salt?: Uint8Array
): Promise<CryptoKeys> {
  // Generar salt si no se proporciona
  const useSalt = salt || crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  
  // Importar contraseña como clave base
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  
  // Derivar clave AES-GCM
  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: useSalt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  )
  
  return { encryptionKey, salt: useSalt }
}

/**
 * Cifra datos con AES-256-GCM
 */
export async function encrypt(
  data: string, 
  password: string
): Promise<EncryptedPayload> {
  const { encryptionKey, salt } = await deriveKey(password)
  
  // Generar IV aleatorio
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  
  // Cifrar
  const encodedData = new TextEncoder().encode(data)
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    encryptionKey,
    encodedData
  )
  
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    version: 1,
  }
}

/**
 * Descifra datos con AES-256-GCM
 */
export async function decrypt(
  payload: EncryptedPayload, 
  password: string
): Promise<string> {
  const salt = base64ToArrayBuffer(payload.salt)
  const { encryptionKey } = await deriveKey(password, new Uint8Array(salt))
  
  const iv = base64ToArrayBuffer(payload.iv)
  const ciphertext = base64ToArrayBuffer(payload.ciphertext)
  
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      encryptionKey,
      ciphertext
    )
    
    return new TextDecoder().decode(decrypted)
  } catch {
    throw new Error("DECRYPTION_FAILED")
  }
}

/**
 * Genera un hash de la contraseña para verificación
 * (No se usa para cifrar, solo para verificar que el usuario recuerda su contraseña)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + "espejo_verify_salt")
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return arrayBufferToBase64(hashBuffer)
}

/**
 * Genera un ID único para el dispositivo/navegador
 */
export function getDeviceId(): string {
  const stored = localStorage.getItem("espejo_device_id")
  if (stored) return stored
  
  const newId = crypto.randomUUID()
  localStorage.setItem("espejo_device_id", newId)
  return newId
}

// ===== HELPERS =====

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// ===== CIFRADO BATCH =====

export interface EncryptedEntry {
  id: string
  date: string
  encryptedData: EncryptedPayload
  updatedAt: number
}

/**
 * Cifra una entrada completa (solo el contenido sensible)
 */
export async function encryptEntry(
  entry: { 
    id: string
    date: string
    content: string
    moodTags: string[]
    habits: unknown
    highlights: unknown
    wordCount: number
    updatedAt: number
  },
  password: string
): Promise<EncryptedEntry> {
  // Solo ciframos datos sensibles
  const sensitiveData = JSON.stringify({
    content: entry.content,
    moodTags: entry.moodTags,
    habits: entry.habits,
    highlights: entry.highlights,
    wordCount: entry.wordCount,
  })
  
  const encryptedData = await encrypt(sensitiveData, password)
  
  return {
    id: entry.id,
    date: entry.date,
    encryptedData,
    updatedAt: entry.updatedAt,
  }
}

/**
 * Descifra una entrada
 */
export async function decryptEntry(
  encrypted: EncryptedEntry,
  password: string
): Promise<{
  id: string
  date: string
  content: string
  moodTags: string[]
  habits: unknown
  highlights: unknown
  wordCount: number
  updatedAt: number
}> {
  const decrypted = await decrypt(encrypted.encryptedData, password)
  const data = JSON.parse(decrypted)
  
  return {
    id: encrypted.id,
    date: encrypted.date,
    updatedAt: encrypted.updatedAt,
    ...data,
  }
}
