"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface WordCloudProps {
  words: Array<{ word: string; count: number }>
  maxWords?: number
  className?: string
}

export function WordCloud({ words, maxWords = 20, className }: WordCloudProps) {
  const displayWords = useMemo(() => {
    const sorted = [...words].sort((a, b) => b.count - a.count).slice(0, maxWords)
    const maxCount = sorted[0]?.count || 1
    const minCount = sorted[sorted.length - 1]?.count || 1

    return sorted
      .map(({ word, count }) => {
        // Calculate relative size (1-5 scale)
        const range = maxCount - minCount || 1
        const normalized = (count - minCount) / range
        const size = Math.ceil(normalized * 4) + 1

        return { word, count, size }
      })
      .sort(() => Math.random() - 0.5) // Shuffle for visual variety
  }, [words, maxWords])

  if (displayWords.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-muted-foreground", className)}>
        No hay suficientes datos
      </div>
    )
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2 py-4", className)}>
      {displayWords.map(({ word, count, size }) => (
        <span
          key={word}
          title={`${count} veces`}
          className={cn(
            "cursor-default rounded-md px-2 py-1 transition-colors hover:bg-accent",
            size === 1 && "text-xs text-muted-foreground",
            size === 2 && "text-sm text-muted-foreground",
            size === 3 && "text-base text-foreground/80",
            size === 4 && "text-lg font-medium text-foreground",
            size === 5 && "text-xl font-semibold text-primary",
          )}
        >
          {word}
        </span>
      ))}
    </div>
  )
}
