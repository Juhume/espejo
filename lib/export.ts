/**
 * Export/Import con cifrado AES-GCM real
 * 
 * Opciones:
 *   - exportPlaintext(): JSON sin cifrar (para backups locales)
 *   - exportEncrypted(password): JSON cifrado con AES-256-GCM
 *   - importData(): auto-detecta formato
 */

import { db, type Entry, type Settings, type Review } from "./db"
import { encrypt, decrypt, type EncryptedPayload } from "./crypto"

export interface ExportData {
  version: string
  exportedAt: number
  entries: Entry[]
  settings: Settings | undefined
  reviews: Review[]
}

export interface EncryptedExportData {
  version: string
  format: "encrypted"
  exportedAt: number
  payload: EncryptedPayload
}

export type ExportFormat = "plaintext" | "encrypted"

// ===== EXPORT =====

/**
 * Exporta datos sin cifrar (JSON plano)
 * Útil para backups locales donde el dispositivo ya está protegido
 */
export async function exportPlaintext(): Promise<string> {
  const entries = await db.entries.toArray()
  const settings = await db.settings.get("main")
  const reviews = await db.reviews.toArray()

  const exportData: ExportData = {
    version: "2.0.0",
    exportedAt: Date.now(),
    entries,
    settings,
    reviews,
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * Exporta datos cifrados con AES-256-GCM
 * Requiere contraseña que el usuario debe recordar
 * 
 * @deprecated Usa exportEncryptedSecure() en su lugar
 */
export async function exportEncrypted(): Promise<string> {
  // Mantener compatibilidad con código existente
  // pero ahora devuelve JSON plano (no Base64 ofuscado)
  return exportPlaintext()
}

/**
 * Exporta datos cifrados con AES-256-GCM (SEGURO)
 * Requiere contraseña que el usuario debe recordar
 */
export async function exportEncryptedSecure(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres")
  }

  const entries = await db.entries.toArray()
  const settings = await db.settings.get("main")
  const reviews = await db.reviews.toArray()

  const exportData: ExportData = {
    version: "2.0.0",
    exportedAt: Date.now(),
    entries,
    settings,
    reviews,
  }

  // Cifrar todo el contenido con AES-256-GCM
  const payload = await encrypt(JSON.stringify(exportData), password)

  const encryptedExport: EncryptedExportData = {
    version: "2.0.0",
    format: "encrypted",
    exportedAt: Date.now(),
    payload,
  }

  return JSON.stringify(encryptedExport)
}

// ===== IMPORT =====

export interface ImportResult {
  imported: number
  skipped: number
  format: ExportFormat
}

/**
 * Importa datos auto-detectando el formato
 * Si está cifrado, requiere contraseña
 */
export async function importData(
  data: string, 
  password?: string
): Promise<ImportResult> {
  try {
    const parsed = JSON.parse(data)
    
    // Detectar formato cifrado v2
    if (parsed.format === "encrypted") {
      return await importEncryptedSecure(parsed, password)
    }
    
    // Formato plaintext v2
    if (parsed.version && parsed.entries) {
      return await importPlaintext(parsed)
    }
    
    throw new Error("Formato no reconocido")
  } catch (error) {
    // Si el error viene de importEncryptedSecure, propagarlo
    if (error instanceof Error && 
        (error.message.includes("contraseña") || 
         error.message.includes("corrupto") ||
         error.message.includes("DECRYPTION"))) {
      throw error
    }
    
    // Último intento: formato v1 Base64 (legacy)
    try {
      return await importLegacyV1(data)
    } catch {
      throw new Error("Formato de archivo no reconocido o datos corruptos")
    }
  }
}

async function importPlaintext(data: ExportData): Promise<ImportResult> {
  let imported = 0
  let skipped = 0

  for (const entry of data.entries || []) {
    const existing = await db.entries.get(entry.id)
    if (!existing) {
      await db.entries.add(entry)
      imported++
    } else if (entry.updatedAt > existing.updatedAt) {
      await db.entries.put(entry)
      imported++
    } else {
      skipped++
    }
  }

  if (data.settings) {
    await db.settings.put(data.settings)
  }

  for (const review of data.reviews || []) {
    const existing = await db.reviews.get(review.id)
    if (!existing) {
      await db.reviews.add(review)
      imported++
    }
  }

  return { imported, skipped, format: "plaintext" }
}

async function importEncryptedSecure(
  data: EncryptedExportData, 
  password?: string
): Promise<ImportResult> {
  if (!password) {
    throw new Error("Este archivo está cifrado. Se requiere contraseña.")
  }

  try {
    const decrypted = await decrypt(data.payload, password)
    const exportData: ExportData = JSON.parse(decrypted)
    
    const result = await importPlaintext(exportData)
    return { ...result, format: "encrypted" }
  } catch (error) {
    if (error instanceof Error && error.message === "DECRYPTION_FAILED") {
      throw new Error("Contraseña incorrecta o archivo corrupto")
    }
    throw error
  }
}

/**
 * @deprecated Usa importData() en su lugar
 */
export async function importEncrypted(encodedData: string): Promise<{ imported: number; skipped: number }> {
  const result = await importData(encodedData)
  return { imported: result.imported, skipped: result.skipped }
}

/**
 * Compatibilidad con formato v1 (Base64 ofuscado)
 * @deprecated Solo para migración de backups antiguos
 */
async function importLegacyV1(encodedData: string): Promise<ImportResult> {
  try {
    const decoded = decodeURIComponent(atob(encodedData))
    const data: ExportData = JSON.parse(decoded)
    
    console.warn("Importando backup v1 (sin cifrar). Considera re-exportar con cifrado.")
    
    const result = await importPlaintext(data)
    return { ...result, format: "plaintext" }
  } catch {
    throw new Error("Error al importar datos v1. El archivo puede estar corrupto.")
  }
}

// ===== DOWNLOAD HELPER =====

export function downloadExport(data: string, filename: string): void {
  const blob = new Blob([data], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Genera nombre de archivo para el export
 */
export function getExportFilename(encrypted: boolean): string {
  const date = new Date().toISOString().split("T")[0]
  const suffix = encrypted ? "encrypted" : "backup"
  return `espejo-${suffix}-${date}.json`
}
