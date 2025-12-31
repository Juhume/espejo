import { db, generateId, getTodayDate, type Entry } from "./db"

export async function getEntryByDate(date: string): Promise<Entry | undefined> {
  return db.entries.where("date").equals(date).first()
}

export async function getTodayEntry(): Promise<Entry | undefined> {
  return getEntryByDate(getTodayDate())
}

export async function createOrUpdateEntry(data: Partial<Entry> & { content: string }): Promise<Entry> {
  const today = getTodayDate()
  const existing = await getEntryByDate(today)

  const wordCount = data.content.trim().split(/\s+/).filter(Boolean).length

  if (existing) {
    const updated: Entry = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
      wordCount,
    }
    await db.entries.put(updated)
    return updated
  }

  const newEntry: Entry = {
    id: generateId(),
    date: today,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    content: data.content,
    moodTags: data.moodTags || [],
    habits: data.habits || {},
    highlights: data.highlights || {},
    wordCount,
  }

  await db.entries.add(newEntry)
  return newEntry
}

export async function getAllEntries(): Promise<Entry[]> {
  return db.entries.orderBy("date").reverse().toArray()
}

export async function getEntriesByDateRange(startDate: string, endDate: string): Promise<Entry[]> {
  return db.entries.where("date").between(startDate, endDate, true, true).toArray()
}

export async function deleteEntry(id: string): Promise<void> {
  await db.entries.delete(id)
}

export async function searchEntries(query: string): Promise<Entry[]> {
  const allEntries = await getAllEntries()
  const lowerQuery = query.toLowerCase()
  return allEntries.filter(
    (entry) =>
      entry.content.toLowerCase().includes(lowerQuery) || entry.highlights.oneLiner?.toLowerCase().includes(lowerQuery),
  )
}
