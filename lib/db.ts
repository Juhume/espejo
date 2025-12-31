import Dexie, { type Table } from "dexie"

// Types for the journal entries
export interface Entry {
  id: string
  date: string // YYYY-MM-DD
  createdAt: number
  updatedAt: number
  content: string // Will be encrypted
  moodTags: string[] // 0-2 emotion tags
  habits: {
    exercise?: {
      done: boolean
      type?: "strength" | "run" | "mobility" | "other"
      durationMin?: number
      intensity?: number
    }
    reading?: { done: boolean; pages?: number; minutes?: number; book?: string }
    sleep?: { rating?: number; hours?: number }
    social?: { done: boolean }
    wellbeing?: { rating?: number }
  }
  highlights: {
    oneLiner?: string
    weeklyWinCandidate?: string
  }
  wordCount: number
}

export interface Settings {
  id: string
  encryptionSalt?: string
  enabledHabits: string[]
  moodOptions: string[]
  colorPalette: "minimal" | "narrative" | "vivid"
  isDemoMode: boolean
}

export interface Review {
  id: string
  type: "weekly" | "monthly"
  periodStart: string // YYYY-MM-DD or YYYY-MM
  reflectionText: string
  goals?: string[]
  createdAt: number
}

class EspejoDatabase extends Dexie {
  entries!: Table<Entry, string>
  settings!: Table<Settings, string>
  reviews!: Table<Review, string>

  constructor() {
    super("EspejoDB")
    this.version(1).stores({
      entries: "id, date, createdAt, updatedAt",
      settings: "id",
      reviews: "id, type, periodStart, createdAt",
    })
  }
}

export const db = new EspejoDatabase()

// Helper to generate UUID
export function generateId(): string {
  return crypto.randomUUID()
}

// Get today's date in YYYY-MM-DD format (Europe/Madrid timezone)
export function getTodayDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" })
}

// Initialize default settings
export async function initializeSettings(): Promise<Settings> {
  const existing = await db.settings.get("main")
  if (existing) return existing

  const defaultSettings: Settings = {
    id: "main",
    enabledHabits: ["exercise", "reading", "sleep", "wellbeing"],
    moodOptions: ["calma", "alegría", "tristeza", "ansiedad", "gratitud", "cansancio", "energía", "foco"],
    colorPalette: "minimal",
    isDemoMode: false,
  }

  await db.settings.put(defaultSettings)
  return defaultSettings
}
