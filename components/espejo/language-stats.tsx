"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WordCloud } from "./word-cloud"
import { analyzePeriod, type PeriodAnalysis } from "@/lib/text-analysis"
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subWeeks, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import type { Entry } from "@/lib/db"

interface LanguageStatsProps {
  entries: Entry[]
}

export function LanguageStats({ entries }: LanguageStatsProps) {
  const [period, setPeriod] = useState<"week" | "month">("week")

  const analysis = useMemo((): PeriodAnalysis | null => {
    if (entries.length === 0) return null

    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (period === "week") {
      startDate = startOfWeek(now, { weekStartsOn: 1 })
      endDate = endOfWeek(now, { weekStartsOn: 1 })
    } else {
      startDate = startOfMonth(now)
      endDate = endOfMonth(now)
    }

    const startStr = format(startDate, "yyyy-MM-dd")
    const endStr = format(endDate, "yyyy-MM-dd")

    const periodEntries = entries.filter((e) => e.date >= startStr && e.date <= endStr)

    if (periodEntries.length === 0) return null

    return analyzePeriod(periodEntries.map((e) => ({ date: e.date, content: e.content })))
  }, [entries, period])

  const previousAnalysis = useMemo((): PeriodAnalysis | null => {
    if (entries.length === 0) return null

    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (period === "week") {
      const prevWeek = subWeeks(now, 1)
      startDate = startOfWeek(prevWeek, { weekStartsOn: 1 })
      endDate = endOfWeek(prevWeek, { weekStartsOn: 1 })
    } else {
      const prevMonth = subMonths(now, 1)
      startDate = startOfMonth(prevMonth)
      endDate = endOfMonth(prevMonth)
    }

    const startStr = format(startDate, "yyyy-MM-dd")
    const endStr = format(endDate, "yyyy-MM-dd")

    const periodEntries = entries.filter((e) => e.date >= startStr && e.date <= endStr)

    if (periodEntries.length === 0) return null

    return analyzePeriod(periodEntries.map((e) => ({ date: e.date, content: e.content })))
  }, [entries, period])

  if (!analysis) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">No hay entradas en este período</CardContent>
      </Card>
    )
  }

  const wordChange = previousAnalysis
    ? Math.round(
        ((analysis.avgWordsPerEntry - previousAnalysis.avgWordsPerEntry) / previousAnalysis.avgWordsPerEntry) * 100,
      )
    : null

  return (
    <div className="space-y-6">
      {/* Period selector - moved to top as buttons */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Análisis de lenguaje</h3>
        <div className="flex gap-1 rounded-lg border bg-background p-1">
          <button
            onClick={() => setPeriod("week")}
            className={`rounded px-3 py-1 text-sm transition-colors ${
              period === "week"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`rounded px-3 py-1 text-sm transition-colors ${
              period === "month"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mes
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-medium">{analysis.totalWords.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Palabras totales</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-medium">{Math.round(analysis.avgWordsPerEntry)}</div>
            <div className="text-xs text-muted-foreground">
              Promedio/entrada
              {wordChange !== null && wordChange !== 0 && (
                <span className={wordChange > 0 ? "text-chart-2" : "text-chart-5"}>
                  {" "}
                  ({wordChange > 0 ? "+" : ""}
                  {wordChange}%)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-medium">{analysis.totalEntries}</div>
            <div className="text-xs text-muted-foreground">Entradas</div>
          </CardContent>
        </Card>
      </div>

      {/* Top words */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Palabras más usadas</CardTitle>
        </CardHeader>
        <CardContent>
          <WordCloud words={analysis.topWords} maxWords={25} />
        </CardContent>
      </Card>

      {/* Fillers */}
      {analysis.fillerTotals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Muletillas detectadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.fillerTotals.slice(0, 8).map(({ filler, count }) => (
                <div key={filler} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{filler}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 rounded-full bg-chart-5/60"
                      style={{ width: `${Math.min(count * 20, 100)}px` }}
                    />
                    <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signal words */}
      {analysis.signalWordTotals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Palabras señal</CardTitle>
            <p className="text-xs text-muted-foreground">Indicadores de estado emocional</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.signalWordTotals.slice(0, 10).map(({ word, count }) => (
                <span key={word} className="rounded-full bg-accent px-3 py-1 text-sm" title={`${count} veces`}>
                  {word} <span className="text-muted-foreground">({count})</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Word trend chart */}
      {analysis.wordTrend.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Palabras por día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.wordTrend}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => format(new Date(date), "d", { locale: es })}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    labelFormatter={(date) => format(new Date(date), "d 'de' MMMM", { locale: es })}
                    formatter={(value: number) => [`${value} palabras`, "Cantidad"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
