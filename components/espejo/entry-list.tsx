"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Search, ChevronRight, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { Entry } from "@/lib/db"

interface EntryListProps {
  entries: Entry[]
  onSelect: (entry: Entry) => void
  selectedId?: string
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

export function EntryList({ entries, onSelect, selectedId }: EntryListProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      entry.content.toLowerCase().includes(query) ||
      entry.highlights.oneLiner?.toLowerCase().includes(query) ||
      entry.moodTags.some((tag) => tag.toLowerCase().includes(query))
    )
  })

  const getPreview = (content: string, maxLength = 80) => {
    const cleaned = content.replace(/\n/g, " ").trim()
    if (cleaned.length <= maxLength) return cleaned
    return cleaned.slice(0, maxLength).trim() + "..."
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar en tus entradas..."
          className="pl-9"
        />
      </div>

      {/* List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {searchQuery ? "No se encontraron entradas" : "Aún no hay entradas"}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelect(entry)}
              className={cn(
                "group w-full rounded-lg p-4 text-left transition-all hover:bg-accent",
                selectedId === entry.id && "bg-accent",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {format(parseISO(entry.date), "d 'de' MMMM", { locale: es })}
                    </span>
                    {entry.moodTags.length > 0 && (
                      <div className="flex gap-1">
                        {entry.moodTags.map((mood) => (
                          <span
                            key={mood}
                            className={cn("h-2 w-2 rounded-full", MOOD_COLORS[mood] || "bg-muted-foreground")}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {entry.highlights.oneLiner || getPreview(entry.content)}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                    <span>{entry.wordCount} palabras</span>
                    {entry.habits.exercise?.done && <span>🏋️</span>}
                    {entry.habits.reading?.done && <span>📚</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
