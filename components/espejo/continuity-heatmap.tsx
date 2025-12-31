"use client"

import { useMemo } from "react"
import { format, eachDayOfInterval, startOfYear, endOfYear, getDay, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { Entry } from "@/lib/db"

interface ContinuityHeatmapProps {
  entries: Entry[]
  year?: number
  onDayClick?: (date: string) => void
}

export function ContinuityHeatmap({ entries, year = new Date().getFullYear(), onDayClick }: ContinuityHeatmapProps) {
  const { weeks, entriesByDate } = useMemo(() => {
    const start = startOfYear(new Date(year, 0, 1))
    const end = endOfYear(new Date(year, 0, 1))
    const days = eachDayOfInterval({ start, end })

    // Create a map of entries by date
    const entriesMap = new Map<string, Entry>()
    entries.forEach((entry) => {
      entriesMap.set(entry.date, entry)
    })

    // Group days into weeks
    const weeksArray: Date[][] = []
    let currentWeek: Date[] = []

    // Pad the first week
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

    // Pad the last week
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
    if (entry.wordCount < 20) return 1
    if (entry.wordCount < 100) return 2
    if (entry.wordCount < 300) return 3
    return 4
  }

  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

  return (
    <div className="space-y-2">
      {/* Month labels */}
      <div className="flex">
        <div className="w-8" /> {/* Spacer for day labels */}
        <div className="flex flex-1 text-xs text-muted-foreground">
          {months.map((month, i) => (
            <div key={month} className="flex-1 text-center">
              {month}
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex w-6 flex-col justify-around text-xs text-muted-foreground">
          <span>L</span>
          <span>M</span>
          <span>M</span>
          <span>J</span>
          <span>V</span>
          <span>S</span>
          <span>D</span>
        </div>

        {/* Grid */}
        <div className="flex flex-1 gap-[2px]">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-1 flex-col gap-[2px]">
              {week.map((day, dayIndex) => {
                const dateStr = format(day, "yyyy-MM-dd")
                const entry = entriesByDate.get(dateStr)
                const intensity = getIntensity(entry)
                const isCurrentYear = day.getFullYear() === year

                return (
                  <button
                    key={dayIndex}
                    onClick={() => onDayClick?.(dateStr)}
                    disabled={!isCurrentYear}
                    title={isCurrentYear ? format(day, "d 'de' MMMM", { locale: es }) : undefined}
                    className={cn(
                      "aspect-square rounded-sm transition-colors",
                      !isCurrentYear && "invisible",
                      intensity === 0 && "bg-muted/50",
                      intensity === 1 && "bg-primary/20",
                      intensity === 2 && "bg-primary/40",
                      intensity === 3 && "bg-primary/60",
                      intensity === 4 && "bg-primary/90",
                      isCurrentYear && "hover:ring-1 hover:ring-ring",
                    )}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>Menos</span>
        <div className="flex gap-[2px]">
          <div className="h-3 w-3 rounded-sm bg-muted/50" />
          <div className="h-3 w-3 rounded-sm bg-primary/20" />
          <div className="h-3 w-3 rounded-sm bg-primary/40" />
          <div className="h-3 w-3 rounded-sm bg-primary/60" />
          <div className="h-3 w-3 rounded-sm bg-primary/90" />
        </div>
        <span>Más</span>
      </div>
    </div>
  )
}
