"use client"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeeklyReview } from "@/components/espejo/weekly-review"
import { MonthlyReview } from "@/components/espejo/monthly-review"

export default function ReviewPage() {
  return (
    <div className="mx-auto min-h-svh max-w-2xl px-4 py-6">
      {/* Header */}
      <header className="mb-6">
        <Link href="/" className="mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span>Volver</span>
        </Link>
        <h1 className="text-2xl font-light tracking-tight">Revisión</h1>
        <p className="mt-1 text-sm text-muted-foreground">Reflexiona sobre tu progreso y patrones</p>
      </header>

      {/* Content */}
      <Tabs defaultValue="weekly" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekly">Semanal</TabsTrigger>
          <TabsTrigger value="monthly">Mensual</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <WeeklyReview />
        </TabsContent>

        <TabsContent value="monthly">
          <MonthlyReview />
        </TabsContent>
      </Tabs>
    </div>
  )
}
