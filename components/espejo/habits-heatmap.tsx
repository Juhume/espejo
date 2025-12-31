"use client"

import { useMemo } from "react"
import { format, eachDayOfInterval, startOfYear, endOfYear, getDay, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { Entry } from "@/lib/db"

interface HabitsHeatmapProps {
  entries: Entry[]
  habit: "exercise" | "reading" | "sleep" | "wellbeing"
  year?: number
}

const HABIT_LABELS: Record<string, string> = {
  exercise: "Ejercicio",
  reading: "Lectura",
  sleep: "Sueño",
  wellbeing: "Bienestar",
}

const HABIT_COLORS: Record<string, string> = {
  exercise: "bg-chart-1",
  reading: "bg-chart-2",
  sleep: "bg-chart-4",
  wellbeing: "bg-chart-5",
}

export function HabitsHeatmap({ entries, habit, year = new Date().getFullYear() }: HabitsHeatmapProps) {
  const { weeks, entriesByDate } = useMemo(() => {
    const start = startOfYear(new Date(year, 0, 1))
    const end = endOfYear(new Date(year, 0, 1))
    const days = eachDayOfInterval({ start, end })

    const entriesMap = new Map<string, Entry>()
    entries.forEach((entry) => {
      entriesMap.set(entry.date, entry)
    })

    const weeksArray: Date[][] = []
    let currentWeek: Date[] = []

    const firstDayOfWeek = getDay(start)
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(addDays(start, -(firstDayOfWeek - i)))
    }

    days.forEach((day) => {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek)
        currentWeek = []
      }
    })

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(addDays(currentWeek[currentWeek.length - 1], 1))
      }
      weeksArray.push(currentWeek)
    }

    return { weeks: weeksArray, entriesByDate: entriesMap }
  }, [entries, year])

  const getIntensity = (entry?: Entry): number => {
    if (!entry) return 0

    const habitData = entry.habits[habit]
    if (!habitData) return 0

    if (habit === "exercise" || habit === "reading") {
      return (habitData as { done: boolean }).done ? 4 : 0
    }

    if (habit === "sleep" || habit === "wellbeing") {
      const rating = (habitData as { rating?: number }).rating
      return rating || 0
    }

    return 0
  }

  const baseColor = HABIT_COLORS[habit] || "bg-primary"

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{HABIT_LABELS[habit]}</h4>

      <div className="flex gap-[2px]">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-1 flex-col gap-[2px]">
            {week.map((day, dayIndex) => {
              const dateStr = format(day, "yyyy-MM-dd")
              const entry = entriesByDate.get(dateStr)
              const intensity = getIntensity(entry)
              const isCurrentYear = day.getFullYear() === year

              return (
                <div
                  key={dayIndex}
                  title={
                    isCurrentYear
                      ? `${format(day, "d MMM", { locale: es })}: ${intensity > 0 ? "Sí" : "No"}`
                      : undefined
                  }
                  className={cn(
                    "aspect-square rounded-sm",
                    !isCurrentYear && "invisible",
                    intensity === 0 && "bg-muted/30",
                    intensity === 1 && `${baseColor}/20`,
                    intensity === 2 && `${baseColor}/40`,
                    intensity === 3 && `${baseColor}/60`,
                    intensity === 4 && `${baseColor}/80`,
                    intensity === 5 && baseColor,
                  )}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
