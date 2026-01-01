"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, BarChart3, BookOpen, Flame, MessageSquare } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LanguageStats } from "@/components/espejo/language-stats"
import { HabitsHeatmap } from "@/components/espejo/habits-heatmap"
import { ContinuityHeatmap } from "@/components/espejo/continuity-heatmap"
import { CrossAnalysis } from "@/components/espejo/cross-analysis"
import { getAllEntries } from "@/lib/entries"
import type { Entry } from "@/lib/db"

export default function PatternsPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const loadedEntries = await getAllEntries()
      setEntries(loadedEntries)
      setIsLoading(false)
    }
    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="mx-auto min-h-svh max-w-2xl px-4 py-6">
        <header className="mb-6">
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span>Volver</span>
          </Link>
        </header>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-lg font-medium">Aún no hay patrones</h2>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Escribe algunas entradas y podrás ver patrones en tu escritura, emociones y hábitos.
          </p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Escribir primera entrada
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-svh max-w-2xl px-4 py-6">
      {/* Header */}
      <header className="mb-6">
        <Link href="/" className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span>Volver</span>
        </Link>
        <h1 className="text-2xl font-light tracking-tight">Patrones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {entries.length} {entries.length === 1 ? "entrada" : "entradas"} · {entries.reduce((sum, e) => sum + e.wordCount, 0).toLocaleString()} palabras
        </p>
      </header>

      {/* Content */}
      <Tabs defaultValue="continuity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 gap-1">
          <TabsTrigger value="continuity" className="gap-1 text-xs sm:gap-1.5 sm:text-sm">
            <Flame className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Racha</span>
          </TabsTrigger>
          <TabsTrigger value="language" className="gap-1 text-xs sm:gap-1.5 sm:text-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lenguaje</span>
          </TabsTrigger>
          <TabsTrigger value="habits" className="gap-1 text-xs sm:gap-1.5 sm:text-sm">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Hábitos</span>
          </TabsTrigger>
          <TabsTrigger value="crosses" className="gap-1 text-xs sm:gap-1.5 sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cruces</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="continuity" className="space-y-4">
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Tu año</h3>
            <ContinuityHeatmap entries={entries} />
          </div>
          <div className="rounded-lg bg-muted/30 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {entries.length >= 7 
                ? "¡Buen ritmo! La constancia importa más que la cantidad."
                : "Cada día que escribes construye tu práctica de reflexión."
              }
            </p>
          </div>
        </TabsContent>

        <TabsContent value="language" className="space-y-6">
          <LanguageStats entries={entries} />
        </TabsContent>

        <TabsContent value="habits" className="space-y-6">
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Ejercicio</h3>
              <HabitsHeatmap entries={entries} habit="exercise" />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Lectura</h3>
              <HabitsHeatmap entries={entries} habit="reading" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="crosses" className="space-y-6">
          <CrossAnalysis entries={entries} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
