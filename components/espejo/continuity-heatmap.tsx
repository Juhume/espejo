"use client"

import { useMemo, useState } from "react"
import { format, eachDayOfInterval, startOfYear, endOfYear, getDay, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Entry } from "@/lib/db"

interface ContinuityHeatmapProps {
  entries: Entry[]
  onDayClick?: (date: string) => void
}

export function ContinuityHeatmap({ entries, onDayClick }: ContinuityHeatmapProps) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  
  // Get available years from entries
  const availableYears = useMemo(() => {
    const years = new Set(entries.map(e => new Date(e.date).getFullYear()))
    return Array.from(years).sort((a, b) => b - a)
  }, [entries])
  
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
  
  const canGoPrev = availableYears.length > 0 && year > Math.min(...availableYears)
  const canGoNext = year < currentYear

  return (
    <div className="space-y-3">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setYear(y => y - 1)}
          disabled={!canGoPrev}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            canGoPrev ? "hover:bg-accent text-foreground" : "text-muted-foreground/30 cursor-not-allowed"
          )}
          aria-label="Año anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <span className="text-sm font-medium">{year}</span>
        
        <button
          onClick={() => setYear(y => y + 1)}
          disabled={!canGoNext}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            canGoNext ? "hover:bg-accent text-foreground" : "text-muted-foreground/30 cursor-not-allowed"
          )}
          aria-label="Año siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      <div className="space-y-2 overflow-x-auto">
        {/* Month labels */}
        <div className="flex min-w-[320px]">
          <div className="w-6 flex-shrink-0" /> {/* Spacer for day labels */}
          <div className="flex flex-1 text-[10px] text-muted-foreground sm:text-xs">
            {months.map((month, i) => (
              <div key={month} className="flex-1 text-center">
                {month}
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap grid */}
        <div className="flex min-w-[320px] gap-0.5 sm:gap-1">
        {/* Day labels */}
        <div className="flex w-5 flex-shrink-0 flex-col justify-around text-[10px] text-muted-foreground sm:w-6 sm:text-xs">
          <span>L</span>
          <span>M</span>
          <span>M</span>
          <span>J</span>
          <span>V</span>
          <span>S</span>
          <span>D</span>
        </div>

        {/* Grid */}
        <div className="flex flex-1 gap-[1px] sm:gap-[2px]">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-1 flex-col gap-[1px] sm:gap-[2px]">
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
                      "aspect-square rounded-[2px] transition-colors sm:rounded-sm",
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
