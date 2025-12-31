"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, X, Trash2 } from "lucide-react"
import { isDemoMode, clearDemoData } from "@/lib/demo-data"

interface DemoBannerProps {
  onDataCleared?: () => void
}

export function DemoBanner({ onDataCleared }: DemoBannerProps) {
  const [isDemo, setIsDemo] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [showBanner, setShowBanner] = useState(true)

  useEffect(() => {
    isDemoMode().then(setIsDemo)
  }, [])

  const handleClear = async () => {
    if (!confirm("¿Estás seguro? Esto borrará todos los datos de demostración.")) return

    setIsClearing(true)
    await clearDemoData()
    setIsDemo(false)
    setIsClearing(false)
    onDataCleared?.()
  }

  if (!isDemo || !showBanner) return null

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg bg-chart-5/10 p-3">
      <AlertTriangle className="h-5 w-5 shrink-0 text-chart-5" />
      <div className="flex-1">
        <p className="text-sm font-medium">Modo demostración</p>
        <p className="text-xs text-muted-foreground">Estos datos son ficticios para mostrar la app.</p>
      </div>
      <Button variant="ghost" size="sm" onClick={handleClear} disabled={isClearing} className="gap-1.5">
        <Trash2 className="h-4 w-4" />
        {isClearing ? "..." : "Borrar"}
      </Button>
      <button onClick={() => setShowBanner(false)} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
