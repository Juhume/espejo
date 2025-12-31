"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  buildHabitMoodMatrix,
  analyzeSleepLanguage,
  analyzeHabitMoodCorrelation,
  comparePeriods,
} from "@/lib/cross-analysis"
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus, Dumbbell, BookOpen, Moon, ArrowRight } from "lucide-react"
import type { Entry } from "@/lib/db"

interface CrossAnalysisProps {
  entries: Entry[]
}

const MOOD_COLORS: Record<string, string> = {
  calma: "bg-[oklch(0.6_0.1_180)]",
  alegría: "bg-[oklch(0.65_0.13_85)]",
  tristeza: "bg-[oklch(0.45_0.08_250)]",
  ansiedad: "bg-[oklch(0.55_0.12_35)]",
  gratitud: "bg-[oklch(0.6_0.12_145)]",
  cansancio: "bg-[oklch(0.45_0.04_60)]",
  energía: "bg-[oklch(0.6_0.15_55)]",
  foco: "bg-[oklch(0.5_0.08_220)]",
}

const HABIT_LABELS: Record<string, string> = {
  exercise: "Ejercicio",
  reading: "Lectura",
  sleep: "Sueño",
  wellbeing: "Bienestar",
}

export function CrossAnalysis({ entries }: CrossAnalysisProps) {
  const matrix = useMemo(() => buildHabitMoodMatrix(entries), [entries])
  const sleepLanguage = useMemo(() => analyzeSleepLanguage(entries), [entries])
  const exerciseCorrelation = useMemo(() => analyzeHabitMoodCorrelation(entries, "exercise"), [entries])
  const readingCorrelation = useMemo(() => analyzeHabitMoodCorrelation(entries, "reading"), [entries])

  const periodComparison = useMemo(() => {
    const now = new Date()
    const currentStart = startOfWeek(now, { weekStartsOn: 1 })
    const currentEnd = endOfWeek(now, { weekStartsOn: 1 })
    const previousStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    const previousEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })

    const currentStartStr = format(currentStart, "yyyy-MM-dd")
    const currentEndStr = format(currentEnd, "yyyy-MM-dd")
    const previousStartStr = format(previousStart, "yyyy-MM-dd")
    const previousEndStr = format(previousEnd, "yyyy-MM-dd")

    const currentEntries = entries.filter((e) => e.date >= currentStartStr && e.date <= currentEndStr)
    const previousEntries = entries.filter((e) => e.date >= previousStartStr && e.date <= previousEndStr)

    return comparePeriods(currentEntries, previousEntries)
  }, [entries])

  if (entries.length < 3) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Necesitas al menos 3 entradas para ver cruces y patrones</p>
          <p className="mt-2 text-sm text-muted-foreground/70">Sigue escribiendo para desbloquear estos análisis</p>
        </CardContent>
      </Card>
    )
  }

  const maxMatrixValue = Math.max(...matrix.matrix.flat(), 1)

  return (
    <div className="space-y-6">
      {/* Week comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Esta semana vs anterior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-medium">{periodComparison.current.avgWords}</span>
                <ChangeIndicator value={periodComparison.changes.words} suffix="%" />
              </div>
              <p className="text-xs text-muted-foreground">Palabras/día</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-medium">{periodComparison.current.avgWellbeing || "-"}</span>
                <ChangeIndicator value={periodComparison.changes.wellbeing} suffix="%" />
              </div>
              <p className="text-xs text-muted-foreground">Bienestar medio</p>
            </div>
          </div>

          {periodComparison.current.dominantMood && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Emoción dominante:</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-sm capitalize text-white",
                  MOOD_COLORS[periodComparison.current.dominantMood] || "bg-muted-foreground",
                )}
              >
                {periodComparison.current.dominantMood}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Habit-Mood Matrix */}
      {matrix.moods.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hábitos y emociones</CardTitle>
            <p className="text-xs text-muted-foreground">Frecuencia de cada emoción cuando completas un hábito</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="pb-2 text-left font-medium" />
                    {matrix.moods.map((mood) => (
                      <th key={mood} className="pb-2 text-center font-normal capitalize text-muted-foreground">
                        {mood}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.habits.map((habit, habitIndex) => (
                    <tr key={habit}>
                      <td className="py-1.5 pr-3 text-muted-foreground">{HABIT_LABELS[habit]}</td>
                      {matrix.moods.map((mood, moodIndex) => {
                        const value = matrix.matrix[habitIndex][moodIndex]
                        const intensity = value / maxMatrixValue

                        return (
                          <td key={mood} className="p-1 text-center">
                            <div
                              className={cn(
                                "mx-auto flex h-8 w-8 items-center justify-center rounded-md text-xs transition-colors",
                                intensity === 0 && "bg-muted/30",
                                intensity > 0 && intensity <= 0.25 && "bg-primary/20",
                                intensity > 0.25 && intensity <= 0.5 && "bg-primary/40",
                                intensity > 0.5 && intensity <= 0.75 && "bg-primary/60",
                                intensity > 0.75 && "bg-primary/80 text-primary-foreground",
                              )}
                            >
                              {value > 0 ? value : ""}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sleep-Language Correlation */}
      {(sleepLanguage.goodSleep.entries > 0 || sleepLanguage.badSleep.entries > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon className="h-4 w-4" />
              Sueño y lenguaje
            </CardTitle>
            <p className="text-xs text-muted-foreground">Cómo el sueño afecta tu escritura</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-chart-2/10 p-4">
                <div className="mb-2 text-xs font-medium text-chart-2">Buen sueño (4-5)</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Palabras/entrada</span>
                    <span className="font-medium">{sleepLanguage.goodSleep.avgWords}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Palabras negativas</span>
                    <span className="font-medium">{sleepLanguage.goodSleep.negativeWords}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entradas</span>
                    <span className="font-medium">{sleepLanguage.goodSleep.entries}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-chart-5/10 p-4">
                <div className="mb-2 text-xs font-medium text-chart-5">Mal sueño (1-3)</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Palabras/entrada</span>
                    <span className="font-medium">{sleepLanguage.badSleep.avgWords}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Palabras negativas</span>
                    <span className="font-medium">{sleepLanguage.badSleep.negativeWords}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entradas</span>
                    <span className="font-medium">{sleepLanguage.badSleep.entries}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercise Correlation */}
      {exerciseCorrelation && exerciseCorrelation.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Dumbbell className="h-4 w-4" />
              Ejercicio y emociones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exerciseCorrelation.slice(0, 4).map((corr) => (
                <div key={corr.mood} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", MOOD_COLORS[corr.mood] || "bg-muted-foreground")} />
                    <span className="text-sm capitalize">{corr.mood}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Con ejercicio: <span className="font-medium text-foreground">{corr.withHabit.count}</span>
                    </span>
                    <ArrowRight className="h-3 w-3" />
                    <span>
                      Sin ejercicio: <span className="font-medium text-foreground">{corr.withoutHabit.count}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reading Correlation */}
      {readingCorrelation && readingCorrelation.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" />
              Lectura y emociones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {readingCorrelation.slice(0, 4).map((corr) => (
                <div key={corr.mood} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", MOOD_COLORS[corr.mood] || "bg-muted-foreground")} />
                    <span className="text-sm capitalize">{corr.mood}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Con lectura: <span className="font-medium text-foreground">{corr.withHabit.count}</span>
                    </span>
                    <ArrowRight className="h-3 w-3" />
                    <span>
                      Sin lectura: <span className="font-medium text-foreground">{corr.withoutHabit.count}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ChangeIndicator({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0 || isNaN(value)) {
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  if (value > 0) {
    return (
      <span className="flex items-center gap-0.5 text-sm text-chart-2">
        <TrendingUp className="h-3.5 w-3.5" />+{value}
        {suffix}
      </span>
    )
  }

  return (
    <span className="flex items-center gap-0.5 text-sm text-chart-5">
      <TrendingDown className="h-3.5 w-3.5" />
      {value}
      {suffix}
    </span>
  )
}
