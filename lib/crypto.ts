/**
 * Cifrado E2E con AES-256-GCM y PBKDF2
 * 
 * Seguridad:
 *   - AES-256-GCM para confidencialidad + integridad
 *   - PBKDF2 con 310,000 iteraciones (OWASP 2023 recommendation)
 *   - IV aleatorio de 12 bytes por cifrado
 *   - Salt aleatorio de 16 bytes por derivación
 *   - Payload versionado para futuras migraciones
 */

// OWASP 2023 recomienda 310,000 para PBKDF2-SHA256
// Ref: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
const PBKDF2_ITERATIONS_V2 = 310000
const PBKDF2_ITERATIONS_V1 = 100000  // Legacy, para descifrar datos antiguos
const SALT_LENGTH = 16
const IV_LENGTH = 12
const KEY_LENGTH = 256

// Versión actual del payload cifrado
const CURRENT_CRYPTO_VERSION = 2

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
 * @param version - Versión del payload (para usar iteraciones correctas)
 */
export async function deriveKey(
  password: string, 
  salt?: Uint8Array,
  version: number = CURRENT_CRYPTO_VERSION
): Promise<CryptoKeys> {
  // Generar salt si no se proporciona
  const useSalt = salt || crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  
  // Usar iteraciones según versión (para compatibilidad con datos antiguos)
  const iterations = version >= 2 ? PBKDF2_ITERATIONS_V2 : PBKDF2_ITERATIONS_V1
  
  // Importar contraseña como clave base
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  
  // Derivar clave AES-GCM
  // Nota: creamos un nuevo Uint8Array para garantizar compatibilidad browser/Node
  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(useSalt),
      iterations,
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
 * Usa la versión actual de crypto (310k iteraciones PBKDF2)
 */
export async function encrypt(
  data: string, 
  password: string
): Promise<EncryptedPayload> {
  const { encryptionKey, salt } = await deriveKey(password, undefined, CURRENT_CRYPTO_VERSION)
  
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
    iv: uint8ArrayToBase64(iv),
    salt: uint8ArrayToBase64(salt),
    version: CURRENT_CRYPTO_VERSION,
  }
}

/**
 * Descifra datos con AES-256-GCM
 * Soporta v1 (100k iter) y v2 (310k iter) automáticamente
 */
export async function decrypt(
  payload: EncryptedPayload, 
  password: string
): Promise<string> {
  const salt = base64ToUint8Array(payload.salt)
  // Usar la versión del payload para derivar con las iteraciones correctas
  const payloadVersion = payload.version || 1
  const { encryptionKey } = await deriveKey(password, salt, payloadVersion)
  
  const iv = base64ToUint8Array(payload.iv)
  const ciphertext = base64ToUint8Array(payload.ciphertext)
  
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      encryptionKey,
      ciphertext as BufferSource
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

/**
 * Convierte ArrayBuffer a Base64
 * Compatible con browser y Node.js
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convierte Uint8Array a Base64
 * Garantiza que no hay offsets problemáticos
 */
function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i])
  }
  return btoa(binary)
}

/**
 * Convierte Base64 a Uint8Array
 * Compatible con browser y Node.js
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// Reservada para uso futuro - conversión directa a ArrayBuffer
function _base64ToArrayBuffer(base64: string): ArrayBuffer {
  return base64ToUint8Array(base64).buffer as ArrayBuffer
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
