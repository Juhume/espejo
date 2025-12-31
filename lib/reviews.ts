import { db, generateId, type Review, type Entry } from "./db"
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subWeeks, subMonths } from "date-fns"

export interface WeeklyReviewData {
  weekStart: string
  weekEnd: string
  entries: Entry[]
  stats: {
    totalEntries: number
    totalWords: number
    avgWords: number
    habitCounts: {
      exercise: number
      reading: number
      goodSleep: number
    }
    dominantMood: string | null
    moodCounts: Record<string, number>
  }
  highlights: {
    oneLiners: string[]
    randomPhrases: string[]
  }
  previousWeekStats: {
    totalEntries: number
    totalWords: number
    habitCounts: {
      exercise: number
      reading: number
      goodSleep: number
    }
  } | null
}

export interface MonthlyReviewData {
  month: string
  monthLabel: string
  entries: Entry[]
  stats: {
    totalEntries: number
    totalWords: number
    avgWords: number
    habitCounts: {
      exercise: number
      reading: number
      goodSleep: number
    }
    dominantMood: string | null
    moodDistribution: Array<{ mood: string; count: number; percentage: number }>
    avgWellbeing: number
  }
  highlights: {
    oneLiners: string[]
    topPhrases: string[]
  }
  previousMonthStats: {
    totalEntries: number
    totalWords: number
    avgWellbeing: number
  } | null
}

function extractRandomPhrases(entries: Entry[], count: number): string[] {
  const allSentences: string[] = []

  entries.forEach((entry) => {
    const sentences = entry.content
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && s.length < 200)

    allSentences.push(...sentences)
  })

  // Shuffle and take random ones
  const shuffled = allSentences.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function getMoodCounts(entries: Entry[]): Record<string, number> {
  const counts: Record<string, number> = {}
  entries.forEach((entry) => {
    entry.moodTags.forEach((mood) => {
      counts[mood] = (counts[mood] || 0) + 1
    })
  })
  return counts
}

function getDominantMood(moodCounts: Record<string, number>): string | null {
  const sorted = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || null
}

export async function generateWeeklyReviewData(weekOffset = 0): Promise<WeeklyReviewData> {
  const targetDate = subWeeks(new Date(), weekOffset)
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 })

  const weekStartStr = format(weekStart, "yyyy-MM-dd")
  const weekEndStr = format(weekEnd, "yyyy-MM-dd")

  // Get entries for this week
  const allEntries = await db.entries.toArray()
  const entries = allEntries.filter((e) => e.date >= weekStartStr && e.date <= weekEndStr)

  // Get previous week entries for comparison
  const prevWeekStart = startOfWeek(subWeeks(targetDate, 1), { weekStartsOn: 1 })
  const prevWeekEnd = endOfWeek(subWeeks(targetDate, 1), { weekStartsOn: 1 })
  const prevStartStr = format(prevWeekStart, "yyyy-MM-dd")
  const prevEndStr = format(prevWeekEnd, "yyyy-MM-dd")
  const prevEntries = allEntries.filter((e) => e.date >= prevStartStr && e.date <= prevEndStr)

  // Calculate stats
  const moodCounts = getMoodCounts(entries)
  const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0)

  const stats = {
    totalEntries: entries.length,
    totalWords,
    avgWords: entries.length > 0 ? Math.round(totalWords / entries.length) : 0,
    habitCounts: {
      exercise: entries.filter((e) => e.habits.exercise?.done).length,
      reading: entries.filter((e) => e.habits.reading?.done).length,
      goodSleep: entries.filter((e) => (e.habits.sleep?.rating || 0) >= 4).length,
    },
    dominantMood: getDominantMood(moodCounts),
    moodCounts,
  }

  // Extract highlights
  const oneLiners = entries.map((e) => e.highlights.oneLiner).filter((o): o is string => !!o)

  const randomPhrases = extractRandomPhrases(entries, 3)

  // Previous week stats
  const prevTotalWords = prevEntries.reduce((sum, e) => sum + e.wordCount, 0)
  const previousWeekStats =
    prevEntries.length > 0
      ? {
          totalEntries: prevEntries.length,
          totalWords: prevTotalWords,
          habitCounts: {
            exercise: prevEntries.filter((e) => e.habits.exercise?.done).length,
            reading: prevEntries.filter((e) => e.habits.reading?.done).length,
            goodSleep: prevEntries.filter((e) => (e.habits.sleep?.rating || 0) >= 4).length,
          },
        }
      : null

  return {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    entries,
    stats,
    highlights: { oneLiners, randomPhrases },
    previousWeekStats,
  }
}

export async function generateMonthlyReviewData(monthOffset = 0): Promise<MonthlyReviewData> {
  const targetDate = subMonths(new Date(), monthOffset)
  const monthStart = startOfMonth(targetDate)
  const monthEnd = endOfMonth(targetDate)

  const monthStartStr = format(monthStart, "yyyy-MM-dd")
  const monthEndStr = format(monthEnd, "yyyy-MM-dd")
  const monthLabel = format(targetDate, "MMMM yyyy")
  const monthKey = format(targetDate, "yyyy-MM")

  // Get entries for this month
  const allEntries = await db.entries.toArray()
  const entries = allEntries.filter((e) => e.date >= monthStartStr && e.date <= monthEndStr)

  // Get previous month for comparison
  const prevMonthStart = startOfMonth(subMonths(targetDate, 1))
  const prevMonthEnd = endOfMonth(subMonths(targetDate, 1))
  const prevStartStr = format(prevMonthStart, "yyyy-MM-dd")
  const prevEndStr = format(prevMonthEnd, "yyyy-MM-dd")
  const prevEntries = allEntries.filter((e) => e.date >= prevStartStr && e.date <= prevEndStr)

  // Calculate stats
  const moodCounts = getMoodCounts(entries)
  const totalMoods = Object.values(moodCounts).reduce((a, b) => a + b, 0)
  const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0)

  const wellbeingRatings = entries.map((e) => e.habits.wellbeing?.rating).filter((r): r is number => r !== undefined)

  const stats = {
    totalEntries: entries.length,
    totalWords,
    avgWords: entries.length > 0 ? Math.round(totalWords / entries.length) : 0,
    habitCounts: {
      exercise: entries.filter((e) => e.habits.exercise?.done).length,
      reading: entries.filter((e) => e.habits.reading?.done).length,
      goodSleep: entries.filter((e) => (e.habits.sleep?.rating || 0) >= 4).length,
    },
    dominantMood: getDominantMood(moodCounts),
    moodDistribution: Object.entries(moodCounts)
      .map(([mood, count]) => ({
        mood,
        count,
        percentage: totalMoods > 0 ? Math.round((count / totalMoods) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count),
    avgWellbeing:
      wellbeingRatings.length > 0
        ? Math.round((wellbeingRatings.reduce((a, b) => a + b, 0) / wellbeingRatings.length) * 10) / 10
        : 0,
  }

  // Extract highlights
  const oneLiners = entries.map((e) => e.highlights.oneLiner).filter((o): o is string => !!o)

  const topPhrases = extractRandomPhrases(entries, 5)

  // Previous month stats
  const prevTotalWords = prevEntries.reduce((sum, e) => sum + e.wordCount, 0)
  const prevWellbeingRatings = prevEntries
    .map((e) => e.habits.wellbeing?.rating)
    .filter((r): r is number => r !== undefined)

  const previousMonthStats =
    prevEntries.length > 0
      ? {
          totalEntries: prevEntries.length,
          totalWords: prevTotalWords,
          avgWellbeing:
            prevWellbeingRatings.length > 0
              ? Math.round((prevWellbeingRatings.reduce((a, b) => a + b, 0) / prevWellbeingRatings.length) * 10) / 10
              : 0,
        }
      : null

  return {
    month: monthKey,
    monthLabel,
    entries,
    stats,
    highlights: { oneLiners, topPhrases },
    previousMonthStats,
  }
}

export async function saveReview(
  type: "weekly" | "monthly",
  periodStart: string,
  reflectionText: string,
  goals?: string[],
): Promise<Review> {
  const review: Review = {
    id: generateId(),
    type,
    periodStart,
    reflectionText,
    goals,
    createdAt: Date.now(),
  }

  await db.reviews.put(review)
  return review
}

export async function getReview(type: "weekly" | "monthly", periodStart: string): Promise<Review | undefined> {
  return db.reviews.where({ type, periodStart }).first()
}
