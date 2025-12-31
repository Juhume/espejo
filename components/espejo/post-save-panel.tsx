"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import type { Entry } from "@/lib/db"

interface PostSavePanelProps {
  entry: Entry
  moodOptions: string[]
  onUpdate: (updates: Partial<Entry>) => void
  onClose: () => void
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

export function PostSavePanel({ entry, moodOptions, onUpdate, onClose }: PostSavePanelProps) {
  const [selectedMoods, setSelectedMoods] = useState<string[]>(entry.moodTags || [])
  const [showHabits, setShowHabits] = useState(false)
  const [exercise, setExercise] = useState(entry.habits?.exercise?.done || false)
  const [reading, setReading] = useState(entry.habits?.reading?.done || false)
  const [social, setSocial] = useState(entry.habits?.social?.done || false)

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
      {/* Success message */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
          <Check className="h-6 w-6 text-green-500" />
        </div>
        <h3 className="text-lg font-medium">¡Guardado!</h3>
        <p className="text-sm text-muted-foreground">
          {entry.wordCount} palabras escritas hoy
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
          <div className="flex flex-wrap gap-2 px-3 pb-3">
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
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="ghost" onClick={handleSkip} className="flex-1">
          Saltar
        </Button>
        <Button onClick={handleDone} className="flex-1 gap-2">
          <Check className="h-4 w-4" />
          Guardar
        </Button>
      </div>
    </div>
  )
}
