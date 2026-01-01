"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WordCloud } from "./word-cloud"
import { analyzePeriod, type PeriodAnalysis } from "@/lib/text-analysis"
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subWeeks, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "@/lib/utils"
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
      <div className="space-y-6">
        {/* Period selector - always visible */}
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
        
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No hay entradas {period === "week" ? "esta semana" : "este mes"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Escribe algo para ver el análisis
            </p>
          </CardContent>
        </Card>
      </div>
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
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardContent className="p-3 text-center sm:p-4">
            <div className="text-xl font-semibold text-primary sm:text-2xl">{analysis.totalWords.toLocaleString()}</div>
            <div className="mt-1 text-[10px] text-muted-foreground sm:text-xs">Palabras totales</div>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardContent className="p-3 text-center sm:p-4">
            <div className="text-xl font-semibold text-primary sm:text-2xl">{Math.round(analysis.avgWordsPerEntry)}</div>
            <div className="mt-1 text-[10px] text-muted-foreground sm:text-xs">
              Promedio/entrada
              {wordChange !== null && wordChange !== 0 && (
                <span className={cn("ml-1", wordChange > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                  ({wordChange > 0 ? "+" : ""}
                  {wordChange}%)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardContent className="p-3 text-center sm:p-4">
            <div className="text-xl font-semibold text-primary sm:text-2xl">{analysis.totalEntries}</div>
            <div className="mt-1 text-[10px] text-muted-foreground sm:text-xs">Entradas</div>
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
            <div className="h-48 rounded-lg bg-muted/20 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.wordTrend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => format(new Date(date), "d", { locale: es })}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                    axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} 
                    tickLine={false} 
                    width={35} 
                  />
                  <Tooltip
                    labelFormatter={(date) => format(new Date(date), "d 'de' MMMM", { locale: es })}
                    formatter={(value: number) => [`${value} palabras`, ""]}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    labelStyle={{ 
                      color: "hsl(var(--popover-foreground))",
                      fontWeight: 500,
                      marginBottom: "4px"
                    }}
                    itemStyle={{ 
                      color: "hsl(var(--popover-foreground))",
                      padding: "2px 0"
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="url(#barGradient)" 
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
