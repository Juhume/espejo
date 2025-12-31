"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { generateWeeklyReviewData, saveReview, getReview, type WeeklyReviewData } from "@/lib/reviews"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Check, Plus, X, Dumbbell, BookOpen, Moon, Quote } from "lucide-react"

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

const REFLECTION_PROMPTS = [
  "¿Qué patrón ves esta semana?",
  "¿Qué quieres mantener la semana que viene?",
  "¿Qué quieres soltar o cambiar?",
]

export function WeeklyReview() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [data, setData] = useState<WeeklyReviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reflection, setReflection] = useState("")
  const [goals, setGoals] = useState<string[]>([])
  const [newGoal, setNewGoal] = useState("")
  const [isSaved, setIsSaved] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState(0)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const reviewData = await generateWeeklyReviewData(weekOffset)
      setData(reviewData)

      // Load existing review if any
      const existingReview = await getReview("weekly", reviewData.weekStart)
      if (existingReview) {
        setReflection(existingReview.reflectionText)
        setGoals(existingReview.goals || [])
        setIsSaved(true)
      } else {
        setReflection("")
        setGoals([])
        setIsSaved(false)
      }

      setIsLoading(false)
    }
    loadData()
  }, [weekOffset])

  const handleSave = async () => {
    if (!data) return
    await saveReview("weekly", data.weekStart, reflection, goals)
    setIsSaved(true)
  }

  const addGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, newGoal.trim()])
      setNewGoal("")
      setIsSaved(false)
    }
  }

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index))
    setIsSaved(false)
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  const weekLabel = `${format(parseISO(data.weekStart), "d MMM", { locale: es })} - ${format(parseISO(data.weekEnd), "d MMM", { locale: es })}`

  return (
    <div className="space-y-6">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset(weekOffset + 1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-medium">{weekLabel}</h2>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset(weekOffset - 1)} disabled={weekOffset === 0}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {data.entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No hay entradas esta semana</CardContent>
        </Card>
      ) : (
        <>
          {/* Stats summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-medium">{data.stats.totalEntries}</div>
                <div className="text-xs text-muted-foreground">
                  Entradas
                  {data.previousWeekStats && (
                    <CompareIndicator
                      current={data.stats.totalEntries}
                      previous={data.previousWeekStats.totalEntries}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-medium">{data.stats.totalWords.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  Palabras
                  {data.previousWeekStats && (
                    <CompareIndicator current={data.stats.totalWords} previous={data.previousWeekStats.totalWords} />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Habits */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Hábitos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <HabitRow
                icon={<Dumbbell className="h-4 w-4" />}
                label="Ejercicio"
                count={data.stats.habitCounts.exercise}
                total={7}
                previous={data.previousWeekStats?.habitCounts.exercise}
              />
              <HabitRow
                icon={<BookOpen className="h-4 w-4" />}
                label="Lectura"
                count={data.stats.habitCounts.reading}
                total={7}
                previous={data.previousWeekStats?.habitCounts.reading}
              />
              <HabitRow
                icon={<Moon className="h-4 w-4" />}
                label="Buen sueño"
                count={data.stats.habitCounts.goodSleep}
                total={7}
                previous={data.previousWeekStats?.habitCounts.goodSleep}
              />
            </CardContent>
          </Card>

          {/* Dominant mood */}
          {data.stats.dominantMood && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Emoción dominante</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.stats.moodCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([mood, count]) => (
                      <span
                        key={mood}
                        className={cn(
                          "rounded-full px-3 py-1 text-sm capitalize text-white",
                          MOOD_COLORS[mood] || "bg-muted-foreground",
                        )}
                      >
                        {mood} ({count})
                      </span>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Highlights */}
          {(data.highlights.oneLiners.length > 0 || data.highlights.randomPhrases.length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Quote className="h-4 w-4" />
                  Frases de la semana
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.highlights.oneLiners.map((line, i) => (
                  <p key={i} className="border-l-2 border-primary/50 pl-3 text-sm italic">
                    {line}
                  </p>
                ))}
                {data.highlights.randomPhrases.map((phrase, i) => (
                  <p key={`r-${i}`} className="text-sm text-muted-foreground">
                    &ldquo;{phrase}&rdquo;
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Reflection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Reflexión</CardTitle>
              <p className="text-xs text-muted-foreground">{REFLECTION_PROMPTS[currentPrompt]}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-1">
                {REFLECTION_PROMPTS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPrompt(i)}
                    className={cn(
                      "h-1.5 w-8 rounded-full transition-colors",
                      i === currentPrompt ? "bg-primary" : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <Textarea
                value={reflection}
                onChange={(e) => {
                  setReflection(e.target.value)
                  setIsSaved(false)
                }}
                placeholder="Escribe tu reflexión..."
                className="min-h-[100px] resize-none"
              />
            </CardContent>
          </Card>

          {/* Goals */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Objetivos para la próxima semana</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {goals.map((goal, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                  <Check className="h-4 w-4 text-chart-2" />
                  <span className="flex-1 text-sm">{goal}</span>
                  <button onClick={() => removeGoal(i)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGoal()}
                  placeholder="Nuevo objetivo..."
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={addGoal}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <Button onClick={handleSave} className="w-full gap-2" disabled={isSaved && reflection === ""}>
            <Check className="h-4 w-4" />
            {isSaved ? "Guardado" : "Guardar revisión"}
          </Button>
        </>
      )}
    </div>
  )
}

function HabitRow({
  icon,
  label,
  count,
  total,
  previous,
}: {
  icon: React.ReactNode
  label: string
  count: number
  total: number
  previous?: number
}) {
  const percentage = Math.round((count / total) * 100)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {count}/{total}
          </span>
          {previous !== undefined && <CompareIndicator current={count} previous={previous} />}
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function CompareIndicator({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous
  if (diff === 0) return null

  return (
    <span className={cn("text-xs", diff > 0 ? "text-chart-2" : "text-chart-5")}>
      {diff > 0 ? "+" : ""}
      {diff}
    </span>
  )
}
