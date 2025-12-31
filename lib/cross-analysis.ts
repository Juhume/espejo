import type { Entry } from "./db"

export interface MoodHabitCorrelation {
  mood: string
  habitName: string
  withHabit: { count: number; avgWellbeing: number }
  withoutHabit: { count: number; avgWellbeing: number }
  correlation: number // Positive = habit correlates with this mood
}

export interface HabitMoodMatrix {
  habits: string[]
  moods: string[]
  matrix: number[][] // [habitIndex][moodIndex] = frequency
}

export interface SleepLanguageCorrelation {
  goodSleep: { avgWords: number; negativeWords: number; entries: number }
  badSleep: { avgWords: number; negativeWords: number; entries: number }
}

export interface PeriodComparison {
  current: {
    avgWords: number
    avgWellbeing: number
    habitCompletion: Record<string, number>
    dominantMood: string | null
  }
  previous: {
    avgWords: number
    avgWellbeing: number
    habitCompletion: Record<string, number>
    dominantMood: string | null
  }
  changes: {
    words: number
    wellbeing: number
    habits: Record<string, number>
  }
}

// Negative signal words for sleep correlation analysis
const NEGATIVE_WORDS = [
  "cansado",
  "cansada",
  "agotado",
  "agotada",
  "mal",
  "terrible",
  "horrible",
  "estresado",
  "estresada",
  "ansiedad",
  "ansioso",
  "ansiosa",
  "triste",
  "frustrado",
  "frustrada",
  "enfadado",
  "enfadada",
  "preocupado",
  "preocupada",
]

function countNegativeWords(text: string): number {
  const lower = text.toLowerCase()
  return NEGATIVE_WORDS.reduce((count, word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi")
    const matches = lower.match(regex)
    return count + (matches?.length || 0)
  }, 0)
}

// Build a matrix of habits vs moods
export function buildHabitMoodMatrix(entries: Entry[]): HabitMoodMatrix {
  const habits = ["exercise", "reading", "sleep", "wellbeing"]
  const moodCounts = new Map<string, number>()

  // Collect all moods
  entries.forEach((entry) => {
    entry.moodTags.forEach((mood) => {
      moodCounts.set(mood, (moodCounts.get(mood) || 0) + 1)
    })
  })

  // Get top moods
  const moods = Array.from(moodCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([mood]) => mood)

  // Build matrix
  const matrix: number[][] = habits.map(() => moods.map(() => 0))

  entries.forEach((entry) => {
    habits.forEach((habit, habitIndex) => {
      const habitData = entry.habits[habit as keyof typeof entry.habits]
      let habitDone = false

      if (habit === "exercise" || habit === "reading") {
        habitDone = !!(habitData as { done?: boolean })?.done
      } else if (habit === "sleep" || habit === "wellbeing") {
        const rating = (habitData as { rating?: number })?.rating
        habitDone = rating !== undefined && rating >= 4
      }

      if (habitDone) {
        entry.moodTags.forEach((mood) => {
          const moodIndex = moods.indexOf(mood)
          if (moodIndex !== -1) {
            matrix[habitIndex][moodIndex]++
          }
        })
      }
    })
  })

  return { habits, moods, matrix }
}

// Analyze correlation between sleep quality and language negativity
export function analyzeSleepLanguage(entries: Entry[]): SleepLanguageCorrelation {
  const goodSleep = { avgWords: 0, negativeWords: 0, entries: 0, totalWords: 0, totalNegative: 0 }
  const badSleep = { avgWords: 0, negativeWords: 0, entries: 0, totalWords: 0, totalNegative: 0 }

  entries.forEach((entry) => {
    const sleepRating = entry.habits.sleep?.rating
    if (sleepRating === undefined) return

    const negativeCount = countNegativeWords(entry.content)
    const target = sleepRating >= 4 ? goodSleep : badSleep

    target.entries++
    target.totalWords += entry.wordCount
    target.totalNegative += negativeCount
  })

  return {
    goodSleep: {
      avgWords: goodSleep.entries > 0 ? Math.round(goodSleep.totalWords / goodSleep.entries) : 0,
      negativeWords: goodSleep.entries > 0 ? Math.round((goodSleep.totalNegative / goodSleep.entries) * 10) / 10 : 0,
      entries: goodSleep.entries,
    },
    badSleep: {
      avgWords: badSleep.entries > 0 ? Math.round(badSleep.totalWords / badSleep.entries) : 0,
      negativeWords: badSleep.entries > 0 ? Math.round((badSleep.totalNegative / badSleep.entries) * 10) / 10 : 0,
      entries: badSleep.entries,
    },
  }
}

// Analyze mood correlations with specific habits
export function analyzeHabitMoodCorrelation(
  entries: Entry[],
  habit: "exercise" | "reading",
): MoodHabitCorrelation[] | null {
  const moodStats = new Map<
    string,
    {
      withHabit: { count: number; wellbeingSum: number }
      withoutHabit: { count: number; wellbeingSum: number }
    }
  >()

  entries.forEach((entry) => {
    const habitDone = (entry.habits[habit] as { done?: boolean })?.done || false
    const wellbeing = entry.habits.wellbeing?.rating || 3

    entry.moodTags.forEach((mood) => {
      if (!moodStats.has(mood)) {
        moodStats.set(mood, {
          withHabit: { count: 0, wellbeingSum: 0 },
          withoutHabit: { count: 0, wellbeingSum: 0 },
        })
      }

      const stats = moodStats.get(mood)!
      if (habitDone) {
        stats.withHabit.count++
        stats.withHabit.wellbeingSum += wellbeing
      } else {
        stats.withoutHabit.count++
        stats.withoutHabit.wellbeingSum += wellbeing
      }
    })
  })

  if (moodStats.size === 0) return null

  const correlations: MoodHabitCorrelation[] = Array.from(moodStats.entries())
    .map(([mood, stats]) => {
      const withAvg = stats.withHabit.count > 0 ? stats.withHabit.wellbeingSum / stats.withHabit.count : 0
      const withoutAvg = stats.withoutHabit.count > 0 ? stats.withoutHabit.wellbeingSum / stats.withoutHabit.count : 0

      return {
        mood,
        habitName: habit,
        withHabit: {
          count: stats.withHabit.count,
          avgWellbeing: Math.round(withAvg * 10) / 10,
        },
        withoutHabit: {
          count: stats.withoutHabit.count,
          avgWellbeing: Math.round(withoutAvg * 10) / 10,
        },
        correlation: withAvg - withoutAvg,
      }
    })
    .filter((c) => c.withHabit.count >= 2 || c.withoutHabit.count >= 2)
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))

  return correlations.slice(0, 6)
}

// Compare current period with previous
export function comparePeriods(currentEntries: Entry[], previousEntries: Entry[]): PeriodComparison {
  const analyze = (entries: Entry[]) => {
    if (entries.length === 0) {
      return {
        avgWords: 0,
        avgWellbeing: 0,
        habitCompletion: {} as Record<string, number>,
        dominantMood: null as string | null,
      }
    }

    const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0)
    const avgWords = Math.round(totalWords / entries.length)

    const wellbeingRatings = entries.map((e) => e.habits.wellbeing?.rating).filter((r): r is number => r !== undefined)
    const avgWellbeing =
      wellbeingRatings.length > 0
        ? Math.round((wellbeingRatings.reduce((a, b) => a + b, 0) / wellbeingRatings.length) * 10) / 10
        : 0

    const habitCompletion: Record<string, number> = {
      exercise: entries.filter((e) => e.habits.exercise?.done).length,
      reading: entries.filter((e) => e.habits.reading?.done).length,
    }

    const moodCounts = new Map<string, number>()
    entries.forEach((e) => {
      e.moodTags.forEach((mood) => {
        moodCounts.set(mood, (moodCounts.get(mood) || 0) + 1)
      })
    })
    const dominantMood = Array.from(moodCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    return { avgWords, avgWellbeing, habitCompletion, dominantMood }
  }

  const current = analyze(currentEntries)
  const previous = analyze(previousEntries)

  const changes = {
    words: previous.avgWords > 0 ? Math.round(((current.avgWords - previous.avgWords) / previous.avgWords) * 100) : 0,
    wellbeing:
      previous.avgWellbeing > 0
        ? Math.round(((current.avgWellbeing - previous.avgWellbeing) / previous.avgWellbeing) * 100)
        : 0,
    habits: {} as Record<string, number>,
  }

  Object.keys(current.habitCompletion).forEach((habit) => {
    const curr = current.habitCompletion[habit]
    const prev = previous.habitCompletion[habit]
    changes.habits[habit] = curr - prev
  })

  return { current, previous, changes }
}
