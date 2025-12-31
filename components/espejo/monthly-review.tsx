"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { generateMonthlyReviewData, saveReview, getReview, type MonthlyReviewData } from "@/lib/reviews"
import { ChevronLeft, ChevronRight, Check, Quote, TrendingUp, TrendingDown } from "lucide-react"

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

const MONTHLY_PROMPTS = [
  "¿Qué has aprendido este mes?",
  "¿De qué te sientes orgulloso/a?",
  "¿Qué llevas al próximo mes?",
]

export function MonthlyReview() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [data, setData] = useState<MonthlyReviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reflection, setReflection] = useState("")
  const [principle, setPrinciple] = useState("")
  const [isSaved, setIsSaved] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState(0)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const reviewData = await generateMonthlyReviewData(monthOffset)
      setData(reviewData)

      // Load existing review if any
      const existingReview = await getReview("monthly", reviewData.month)
      if (existingReview) {
        setReflection(existingReview.reflectionText)
        setPrinciple(existingReview.goals?.[0] || "")
        setIsSaved(true)
      } else {
        setReflection("")
        setPrinciple("")
        setIsSaved(false)
      }

      setIsLoading(false)
    }
    loadData()
  }, [monthOffset])

  const handleSave = async () => {
    if (!data) return
    await saveReview("monthly", data.month, reflection, principle ? [principle] : undefined)
    setIsSaved(true)
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setMonthOffset(monthOffset + 1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-medium capitalize">{data.monthLabel}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonthOffset(monthOffset - 1)}
          disabled={monthOffset === 0}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {data.entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No hay entradas este mes</CardContent>
        </Card>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-medium">{data.stats.totalEntries}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  Entradas
                  {data.previousMonthStats && (
                    <ChangeIndicator
                      current={data.stats.totalEntries}
                      previous={data.previousMonthStats.totalEntries}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-medium">{data.stats.totalWords.toLocaleString()}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  Palabras
                  {data.previousMonthStats && (
                    <ChangeIndicator current={data.stats.totalWords} previous={data.previousMonthStats.totalWords} />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-medium">{data.stats.avgWords}</div>
                <div className="text-xs text-muted-foreground">Promedio/entrada</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-medium">{data.stats.avgWellbeing || "-"}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  Bienestar medio
                  {data.previousMonthStats && data.previousMonthStats.avgWellbeing > 0 && (
                    <ChangeIndicator
                      current={data.stats.avgWellbeing}
                      previous={data.previousMonthStats.avgWellbeing}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mood distribution */}
          {data.stats.moodDistribution.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Distribución emocional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.stats.moodDistribution.slice(0, 5).map(({ mood, count, percentage }) => (
                  <div key={mood} className="flex items-center gap-3">
                    <span className={cn("h-3 w-3 rounded-full", MOOD_COLORS[mood] || "bg-muted-foreground")} />
                    <span className="flex-1 text-sm capitalize">{mood}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", MOOD_COLORS[mood] || "bg-primary")}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-muted-foreground">{percentage}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Habits summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Hábitos del mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-medium">{data.stats.habitCounts.exercise}</div>
                  <div className="text-xs text-muted-foreground">Ejercicio</div>
                </div>
                <div>
                  <div className="text-xl font-medium">{data.stats.habitCounts.reading}</div>
                  <div className="text-xs text-muted-foreground">Lectura</div>
                </div>
                <div>
                  <div className="text-xl font-medium">{data.stats.habitCounts.goodSleep}</div>
                  <div className="text-xs text-muted-foreground">Buen sueño</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Highlights */}
          {(data.highlights.oneLiners.length > 0 || data.highlights.topPhrases.length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Quote className="h-4 w-4" />
                  Frases destacadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.highlights.oneLiners.slice(0, 3).map((line, i) => (
                  <p key={i} className="border-l-2 border-primary/50 pl-3 text-sm italic">
                    {line}
                  </p>
                ))}
                {data.highlights.topPhrases.slice(0, 3).map((phrase, i) => (
                  <p key={`p-${i}`} className="text-sm text-muted-foreground">
                    &ldquo;{phrase}&rdquo;
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Reflection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Reflexión mensual</CardTitle>
              <p className="text-xs text-muted-foreground">{MONTHLY_PROMPTS[currentPrompt]}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-1">
                {MONTHLY_PROMPTS.map((_, i) => (
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
                placeholder="Escribe tu reflexión del mes..."
                className="min-h-[120px] resize-none"
              />
            </CardContent>
          </Card>

          {/* Principle of the month */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Principio del mes</CardTitle>
              <p className="text-xs text-muted-foreground">Una frase que guíe el próximo mes</p>
            </CardHeader>
            <CardContent>
              <Input
                value={principle}
                onChange={(e) => {
                  setPrinciple(e.target.value)
                  setIsSaved(false)
                }}
                placeholder="Ej: Menos prisa, más presencia"
                className="text-center"
              />
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

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous
  const percentChange = previous > 0 ? Math.round((diff / previous) * 100) : 0

  if (diff === 0) return null

  return (
    <span className={cn("flex items-center gap-0.5 text-xs", diff > 0 ? "text-chart-2" : "text-chart-5")}>
      {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {percentChange > 0 ? "+" : ""}
      {percentChange}%
    </span>
  )
}
