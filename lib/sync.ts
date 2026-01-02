/**
 * Sincronización cifrada E2E con Supabase
 */

import { db, type Entry, type Review } from "./db"
import { 
  encrypt, 
  decrypt, 
  hashPassword, 
  getDeviceId,
  type EncryptedPayload 
} from "./crypto"
import { getSupabase, isSupabaseConfigured } from "./supabase"

export interface SyncConfig {
  enabled: boolean
  userHash: string            // Hash del email
  passwordHash: string        // Para verificar contraseña localmente
  lastSyncAt: number
  deviceId: string
}

export interface EncryptedSyncEntry {
  id: string
  date: string
  data: EncryptedPayload
  updatedAt: number
  deleted?: boolean
}

export interface EncryptedSyncReview {
  id: string
  type: "weekly" | "monthly"
  periodStart: string
  data: EncryptedPayload
  updatedAt: number
  deleted?: boolean
}

export interface SyncResult {
  success: boolean
  pushed: number
  pulled: number
  conflicts: number
  error?: string
}

// Tipos para respuestas RPC de Supabase
interface RpcAuthResponse {
  success: boolean
  user_id?: string
  is_new?: boolean
  error?: string
}

interface RpcSyncEntriesResponse {
  success: boolean
  pushed: number
  pulled: number
  entries: EncryptedSyncEntry[]
  serverTime: number
  error?: string
}

interface RpcSyncReviewsResponse {
  success: boolean
  pushed: number
  pulled: number
  reviews: EncryptedSyncReview[]
  serverTime: number
  error?: string
}

interface RpcSingleEntryResponse {
  success: boolean
  synced: boolean
  error?: string
}

// ===== STORAGE KEYS =====
const SYNC_CONFIG_KEY = "espejo_sync_config"
const SYNC_PASSWORD_KEY = "espejo_sync_password"

// ===== CONFIGURACIÓN =====

export function getSyncConfig(): SyncConfig | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(SYNC_CONFIG_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function saveSyncConfig(config: SyncConfig): void {
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config))
}

export function clearSyncConfig(): void {
  localStorage.removeItem(SYNC_CONFIG_KEY)
  sessionStorage.removeItem(SYNC_PASSWORD_KEY)
}

export function setSyncPassword(password: string): void {
  sessionStorage.setItem(SYNC_PASSWORD_KEY, password)
}

export function getSyncPassword(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(SYNC_PASSWORD_KEY)
}

// ===== SETUP =====

/**
 * Configura la sincronización por primera vez
 */
export async function setupSync(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; isNew?: boolean }> {
  const supabase = getSupabase()
  
  if (!supabase) {
    return { success: false, error: "Supabase no configurado" }
  }
  
  try {
    const userHash = await hashPassword(email.toLowerCase().trim())
    const passwordHash = await hashPassword(password)
    const verificationToken = await hashPassword(passwordHash)
    
    // @ts-expect-error RPC dinámico
    const { data, error } = await supabase.rpc("register_or_auth_user", {
      p_user_hash: userHash,
      p_verification_token: verificationToken,
      p_device_id: getDeviceId(),
      p_device_name: getDeviceName(),
    }) as { data: RpcAuthResponse | null, error: Error | null }
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    if (!data || !data.success) {
      return { 
        success: false, 
        error: data?.error === "INVALID_CREDENTIALS" 
          ? "Email o contraseña incorrectos" 
          : "Error de autenticación"
      }
    }
    
    const config: SyncConfig = {
      enabled: true,
      userHash,
      passwordHash,
      lastSyncAt: 0,
      deviceId: getDeviceId(),
    }
    
    saveSyncConfig(config)
    setSyncPassword(password)
    
    return { success: true, isNew: data.is_new }
  } catch {
    return { success: false, error: "Error de conexión" }
  }
}

/**
 * Verifica la contraseña localmente
 */
export async function verifyPassword(password: string): Promise<boolean> {
  const config = getSyncConfig()
  if (!config) return false
  
  const hash = await hashPassword(password)
  return hash === config.passwordHash
}

/**
 * Sincronización completa con Supabase
 */
export async function sync(password?: string): Promise<SyncResult> {
  const config = getSyncConfig()
  const supabase = getSupabase()
  
  if (!config?.enabled) {
    return { success: false, pushed: 0, pulled: 0, conflicts: 0, error: "Sync no configurado" }
  }
  
  if (!supabase) {
    return { success: false, pushed: 0, pulled: 0, conflicts: 0, error: "Supabase no disponible" }
  }
  
  const syncPassword = password || getSyncPassword()
  if (!syncPassword) {
    return { success: false, pushed: 0, pulled: 0, conflicts: 0, error: "Contraseña requerida" }
  }
  
  try {
    let totalPushed = 0
    let totalPulled = 0
    let conflicts = 0
    
    // Obtener entries locales modificados
    const localEntries = await db.entries
      .where("updatedAt")
      .above(config.lastSyncAt)
      .toArray()
    
    // Cifrar entries
    const encryptedEntries = await Promise.all(
      localEntries.map(e => encryptEntryForSync(e, syncPassword))
    )
    
    // Enviar y recibir de Supabase
    // @ts-expect-error RPC dinámico
    const { data: entriesResult, error: entriesError } = await supabase.rpc("sync_entries", {
      p_user_hash: config.userHash,
      p_entries: encryptedEntries,
      p_last_sync_at: Math.floor(config.lastSyncAt),
    }) as { data: RpcSyncEntriesResponse | null, error: Error | null }
    
    if (entriesError) {
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, error: "Error al sincronizar entries" }
    }
    
    if (!entriesResult || !entriesResult.success) {
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, error: "Error de sincronización" }
    }
    
    totalPushed += entriesResult.pushed
    
    // 4. Descifrar y aplicar entries remotos
    for (const encEntry of entriesResult.entries || []) {
      try {
        const decrypted = await decryptEntryFromSync(encEntry, syncPassword)
        const local = await db.entries.get(decrypted.id)
        
        if (!local || decrypted.updatedAt > local.updatedAt) {
          if (encEntry.deleted) {
            await db.entries.delete(decrypted.id)
          } else {
            await db.entries.put(decrypted)
          }
          totalPulled++
        } else if (local && decrypted.updatedAt < local.updatedAt) {
          conflicts++
        }
      } catch (err) {
        console.error("Error decrypting entry:", err)
      }
    }
    
    // Sync reviews
    const localReviews = await db.reviews
      .filter(r => r.createdAt > config.lastSyncAt)
      .toArray()
    
    const encryptedReviews = await Promise.all(
      localReviews.map(r => encryptReviewForSync(r, syncPassword))
    )
    
    // @ts-expect-error RPC dinámico
    const { data: reviewsResult, error: reviewsError } = await supabase.rpc("sync_reviews", {
      p_user_hash: config.userHash,
      p_reviews: encryptedReviews,
      p_last_sync_at: Math.floor(config.lastSyncAt),
    }) as { data: RpcSyncReviewsResponse | null, error: Error | null }
    
    if (!reviewsError && reviewsResult?.success) {
      totalPushed += reviewsResult.pushed
      
      for (const encReview of reviewsResult.reviews || []) {
        try {
          const decrypted = await decryptReviewFromSync(encReview, syncPassword)
          const local = await db.reviews.get(decrypted.id)
          
          if (!local && !encReview.deleted) {
            await db.reviews.put(decrypted)
            totalPulled++
          }
        } catch {
          // Error al descifrar review
        }
      }
    }
    
    config.lastSyncAt = Math.floor(entriesResult.serverTime || Date.now())
    saveSyncConfig(config)
    
    return {
      success: true,
      pushed: totalPushed,
      pulled: totalPulled,
      conflicts,
    }
  } catch {
    return {
      success: false,
      pushed: 0,
      pulled: 0,
      conflicts: 0,
      error: "Error de sincronización",
    }
  }
}

/**
 * Sync rápido de una sola entrada
 * Devuelve un objeto con más información sobre el resultado
 */
export async function syncEntry(entry: Entry): Promise<{ success: boolean; needsUnlock?: boolean; error?: string }> {
  const config = getSyncConfig()
  const password = getSyncPassword()
  const supabase = getSupabase()
  
  if (!config?.enabled) {
    return { success: false, error: "Sync no habilitado" }
  }
  
  if (!password) {
    return { success: false, needsUnlock: true, error: "Sesión expirada" }
  }
  
  if (!supabase) {
    return { success: false, error: "Supabase no disponible" }
  }
  
  try {
    const encrypted = await encryptEntryForSync(entry, password)
    
    // @ts-expect-error RPC dinámico
    const { data, error } = await supabase.rpc("sync_single_entry", {
      p_user_hash: config.userHash,
      p_entry: encrypted,
    }) as { data: RpcSingleEntryResponse | null, error: Error | null }
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    if (data?.success) {
      // Actualizar timestamp de última sincronización
      config.lastSyncAt = Date.now()
      saveSyncConfig(config)
      return { success: true }
    }
    
    return { success: false, error: data?.error || "Error desconocido" }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error de red" }
  }
}

// ===== HELPERS DE CIFRADO =====

async function encryptEntryForSync(
  entry: Entry, 
  password: string
): Promise<EncryptedSyncEntry> {
  const sensitiveData = JSON.stringify({
    content: entry.content,
    moodTags: entry.moodTags,
    habits: entry.habits,
    highlights: entry.highlights,
    wordCount: entry.wordCount,
    createdAt: entry.createdAt,
  })
  
  return {
    id: entry.id,
    date: entry.date,
    data: await encrypt(sensitiveData, password),
    updatedAt: entry.updatedAt,
  }
}

async function decryptEntryFromSync(
  encrypted: EncryptedSyncEntry,
  password: string
): Promise<Entry> {
  const decrypted = await decrypt(encrypted.data, password)
  const data = JSON.parse(decrypted)
  
  return {
    id: encrypted.id,
    date: encrypted.date,
    updatedAt: encrypted.updatedAt,
    ...data,
  }
}

async function encryptReviewForSync(
  review: Review,
  password: string
): Promise<EncryptedSyncReview> {
  const sensitiveData = JSON.stringify({
    reflectionText: review.reflectionText,
    goals: review.goals,
    createdAt: review.createdAt,
  })
  
  return {
    id: review.id,
    type: review.type,
    periodStart: review.periodStart,
    data: await encrypt(sensitiveData, password),
    updatedAt: review.createdAt,
  }
}

async function decryptReviewFromSync(
  encrypted: EncryptedSyncReview,
  password: string
): Promise<Review> {
  const decrypted = await decrypt(encrypted.data, password)
  const data = JSON.parse(decrypted)
  
  return {
    id: encrypted.id,
    type: encrypted.type,
    periodStart: encrypted.periodStart,
    ...data,
  }
}

function getDeviceName(): string {
  if (typeof navigator === "undefined") return "Unknown"
  
  const ua = navigator.userAgent
  if (ua.includes("iPhone")) return "iPhone"
  if (ua.includes("iPad")) return "iPad"
  if (ua.includes("Android")) return "Android"
  if (ua.includes("Mac")) return "Mac"
  if (ua.includes("Windows")) return "Windows"
  if (ua.includes("Linux")) return "Linux"
  return "Web Browser"
}

// ===== ESTADO =====

export function isSyncEnabled(): boolean {
  const config = getSyncConfig()
  return config?.enabled ?? false
}

export function isSyncAvailable(): boolean {
  return isSupabaseConfigured()
}

export function needsPassword(): boolean {
  const config = getSyncConfig()
  return config?.enabled === true && !getSyncPassword()
}

export function getLastSyncTime(): number | null {
  const config = getSyncConfig()
  return config?.lastSyncAt ?? null
}
