"use client"

import { useMemo, useState } from "react"
import { format, eachDayOfInterval, startOfYear, endOfYear, addDays, startOfWeek, differenceInWeeks } from "date-fns"
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
    const yearStart = startOfYear(new Date(year, 0, 1))
    const yearEnd = endOfYear(new Date(year, 0, 1))
    
    // Start from the Monday of the week containing Jan 1
    const gridStart = startOfWeek(yearStart, { weekStartsOn: 1 })
    
    // Create a map of entries by date
    const entriesMap = new Map<string, Entry>()
    entries.forEach((entry) => {
      entriesMap.set(entry.date, entry)
    })

    // Generate all weeks from grid start through year end
    const weeksArray: Date[][] = []
    let currentDate = gridStart
    
    while (currentDate <= yearEnd || weeksArray.length < 53) {
      const week: Date[] = []
      for (let i = 0; i < 7; i++) {
        week.push(currentDate)
        currentDate = addDays(currentDate, 1)
      }
      weeksArray.push(week)
      
      // Stop if we've gone past the year and have enough weeks
      if (currentDate.getFullYear() > year && weeksArray.length >= 52) break
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
  
  const canGoPrev = availableYears.length > 0 && year > Math.min(...availableYears, currentYear - 5)
  const canGoNext = year < currentYear

  // Calculate which week each month starts on
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = []
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    
    for (let month = 0; month < 12; month++) {
      const firstOfMonth = new Date(year, month, 1)
      const gridStart = startOfWeek(startOfYear(new Date(year, 0, 1)), { weekStartsOn: 1 })
      const weekIndex = differenceInWeeks(firstOfMonth, gridStart)
      
      if (weekIndex >= 0 && weekIndex < weeks.length) {
        labels.push({ month: monthNames[month], weekIndex })
      }
    }
    
    return labels
  }, [weeks, year])

  // Sizing: 12px cells with 3px gap = 15px per week
  // 53 weeks × 15px = 795px total grid - good for desktop
  // On mobile will scroll horizontally slightly
  const cellSize = 12
  const cellGap = 3
  const totalCellWidth = cellSize + cellGap
  const dayLabelWidth = 18 // Width of day labels column in px

  return (
    <div className="space-y-2">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setYear(y => y - 1)}
          disabled={!canGoPrev}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
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
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            canGoNext ? "hover:bg-accent text-foreground" : "text-muted-foreground/30 cursor-not-allowed"
          )}
          aria-label="Año siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <div className="inline-block min-w-fit">
          {/* Month labels */}
          <div 
            className="relative mb-1 h-4 text-[10px] text-muted-foreground"
            style={{ marginLeft: dayLabelWidth }}
          >
            {monthLabels.map(({ month, weekIndex }, index) => (
              <span
                key={`${month}-${weekIndex}-${index}`}
                className="absolute whitespace-nowrap"
                style={{ left: weekIndex * totalCellWidth }}
              >
                {month}
              </span>
            ))}
          </div>
          
          {/* Heatmap grid */}
          <div className="flex">
            {/* Day labels */}
            <div 
              className="mr-1 flex flex-shrink-0 flex-col text-[9px] text-muted-foreground"
              style={{ width: dayLabelWidth - 4, gap: cellGap }}
            >
              <div className="flex items-center justify-end" style={{ height: cellSize }}>L</div>
              <div className="flex items-center justify-end" style={{ height: cellSize }}>M</div>
              <div className="flex items-center justify-end" style={{ height: cellSize }}>X</div>
              <div className="flex items-center justify-end" style={{ height: cellSize }}>J</div>
              <div className="flex items-center justify-end" style={{ height: cellSize }}>V</div>
              <div className="flex items-center justify-end" style={{ height: cellSize }}>S</div>
              <div className="flex items-center justify-end" style={{ height: cellSize }}>D</div>
            </div>

            {/* Grid */}
            <div className="flex" style={{ gap: cellGap }}>
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col" style={{ gap: cellGap }}>
                  {week.map((day, dayIndex) => {
                    const dateStr = format(day, "yyyy-MM-dd")
                    const entry = entriesByDate.get(dateStr)
                    const intensity = getIntensity(entry)
                    const isCurrentYear = day.getFullYear() === year
                    const isPast = day <= new Date()

                    return (
                      <button
                        key={dayIndex}
                        onClick={() => isCurrentYear && isPast && onDayClick?.(dateStr)}
                        disabled={!isCurrentYear || !isPast}
                        title={isCurrentYear && isPast ? format(day, "d 'de' MMMM", { locale: es }) : undefined}
                        style={{ width: cellSize, height: cellSize }}
                        className={cn(
                          "rounded-[2px] transition-colors",
                          !isCurrentYear && "invisible",
                          isCurrentYear && !isPast && "bg-muted/20 cursor-not-allowed",
                          isCurrentYear && isPast && intensity === 0 && "bg-muted/50",
                          intensity === 1 && "bg-primary/25",
                          intensity === 2 && "bg-primary/45",
                          intensity === 3 && "bg-primary/65",
                          intensity === 4 && "bg-primary/90",
                          isCurrentYear && isPast && "hover:ring-1 hover:ring-ring cursor-pointer",
                        )}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        <span>Menos</span>
        <div className="flex" style={{ gap: 3 }}>
          <div className="rounded-sm bg-muted/50" style={{ width: 12, height: 12 }} />
          <div className="rounded-sm bg-primary/25" style={{ width: 12, height: 12 }} />
          <div className="rounded-sm bg-primary/45" style={{ width: 12, height: 12 }} />
          <div className="rounded-sm bg-primary/65" style={{ width: 12, height: 12 }} />
          <div className="rounded-sm bg-primary/90" style={{ width: 12, height: 12 }} />
        </div>
        <span>Más</span>
      </div>
    </div>
  )
}
