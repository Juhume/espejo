"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, ChevronUp, PenLine } from "lucide-react"
import type { Entry } from "@/lib/db"

interface PostSavePanelProps {
  entry: Entry
  moodOptions: string[]
  onUpdate: (updates: Partial<Entry>) => void
  onClose: () => void
  onContinueEditing: () => void
}

// Emojis más intuitivos para emociones
const MOOD_EMOJIS: Record<string, string> = {
  calma: "😌",
  alegría: "😊",
  tristeza: "😢",
  ansiedad: "😰",
  gratitud: "🙏",
  cansancio: "😴",
  energía: "⚡",
  foco: "🎯",
}

export function PostSavePanel({ entry, moodOptions, onUpdate, onClose, onContinueEditing }: PostSavePanelProps) {
  const [selectedMoods, setSelectedMoods] = useState<string[]>(entry.moodTags || [])
  const [showHabits, setShowHabits] = useState(false)
  const [exercise, setExercise] = useState(entry.habits?.exercise?.done || false)
  const [reading, setReading] = useState(entry.habits?.reading?.done || false)
  const [social, setSocial] = useState(entry.habits?.social?.done || false)
  const [sleepRating, setSleepRating] = useState<number | null>(entry.habits?.sleep?.rating ?? null)

  const toggleMood = (mood: string) => {
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(selectedMoods.filter((m) => m !== mood))
    } else if (selectedMoods.length < 2) {
      setSelectedMoods([...selectedMoods, mood])
    }
  }

  const handleDone = () => {
    onUpdate({
      moodTags: selectedMoods,
      habits: {
        ...entry.habits,
        exercise: { ...entry.habits?.exercise, done: exercise },
        reading: { ...entry.habits?.reading, done: reading },
        social: { done: social },
        sleep: sleepRating !== null ? { ...entry.habits?.sleep, rating: sleepRating } : entry.habits?.sleep,
      },
    })
    onClose()
  }

  const handleSkip = () => {
    onClose()
  }

  // Quick habits
  const quickHabits = [
    { key: "exercise", label: "Ejercicio", emoji: "🏃", checked: exercise, toggle: () => setExercise(!exercise) },
    { key: "reading", label: "Lectura", emoji: "📚", checked: reading, toggle: () => setReading(!reading) },
    { key: "social", label: "Socialicé", emoji: "👋", checked: social, toggle: () => setSocial(!social) },
  ]

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-4 space-y-6 duration-300">
      {/* Quick feedback header */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {entry.wordCount} {entry.wordCount === 1 ? "palabra" : "palabras"} · ¿Algo más sobre hoy?
        </p>
      </div>

      {/* Mood selection - simplified */}
      <div className="space-y-3">
        <p className="text-center text-sm text-muted-foreground">
          ¿Cómo te sientes? <span className="opacity-60">(opcional)</span>
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {moodOptions.slice(0, 6).map((mood) => (
            <button
              key={mood}
              onClick={() => toggleMood(mood)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm transition-all",
                selectedMoods.includes(mood)
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              <span>{MOOD_EMOJIS[mood] || "😐"}</span>
              <span className="capitalize">{mood}</span>
            </button>
          ))}
        </div>
        {selectedMoods.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Máximo 2 seleccionadas
          </p>
        )}
      </div>

      {/* Collapsible habits section */}
      <div className="rounded-lg bg-muted/30">
        <button
          onClick={() => setShowHabits(!showHabits)}
          className="flex w-full items-center justify-between p-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <span>Hábitos del día</span>
          {showHabits ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {showHabits && (
          <div className="space-y-4 px-3 pb-3">
            {/* Sleep rating */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">¿Cómo dormiste? 😴</p>
              <div className="flex w-fit flex-col gap-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setSleepRating(sleepRating === rating ? null : rating)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-all",
                        sleepRating === rating
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between px-1 text-[10px] text-muted-foreground/60">
                  <span>Mal</span>
                  <span>Excelente</span>
                </div>
              </div>
            </div>
            
            {/* Quick habits */}
            <div className="flex flex-wrap gap-2">
              {quickHabits.map(({ key, label, emoji, checked, toggle }) => (
                <button
                  key={key}
                  onClick={toggle}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all",
                    checked
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                  {checked && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {/* Botón de editar más visible arriba */}
        <Button variant="outline" onClick={onContinueEditing} className="w-full gap-2">
          <PenLine className="h-4 w-4" />
          Seguir escribiendo
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleSkip} className="flex-1">
            Omitir
          </Button>
          <Button onClick={handleDone} className="flex-1 gap-2">
            <Check className="h-4 w-4" />
            Listo
          </Button>
        </div>
      </div>
    </div>
  )
}
