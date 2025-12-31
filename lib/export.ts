import { db, type Entry, type Settings, type Review } from "./db"

export interface ExportData {
  version: string
  exportedAt: number
  entries: Entry[]
  settings: Settings | undefined
  reviews: Review[]
}

export async function exportEncrypted(): Promise<string> {
  const entries = await db.entries.toArray()
  const settings = await db.settings.get("main")
  const reviews = await db.reviews.toArray()

  const exportData: ExportData = {
    version: "1.0.0",
    exportedAt: Date.now(),
    entries,
    settings,
    reviews,
  }

  // Base64 encode for basic obfuscation (real E2EE would use libsodium)
  const jsonString = JSON.stringify(exportData)
  const encoded = btoa(encodeURIComponent(jsonString))

  return encoded
}

export async function importEncrypted(encodedData: string): Promise<{ imported: number; skipped: number }> {
  try {
    const decoded = decodeURIComponent(atob(encodedData))
    const data: ExportData = JSON.parse(decoded)

    let imported = 0
    let skipped = 0

    for (const entry of data.entries) {
      const existing = await db.entries.get(entry.id)
      if (!existing) {
        await db.entries.add(entry)
        imported++
      } else {
        skipped++
      }
    }

    if (data.settings) {
      await db.settings.put(data.settings)
    }

    for (const review of data.reviews) {
      const existing = await db.reviews.get(review.id)
      if (!existing) {
        await db.reviews.add(review)
      }
    }

    return { imported, skipped }
  } catch (error) {
    throw new Error("Error al importar datos. El archivo puede estar corrupto.")
  }
}

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
