"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Settings, Download, Upload, AlertTriangle, Sparkles, Trash2 } from "lucide-react"
import { exportEncrypted, importEncrypted, downloadExport } from "@/lib/export"
import { generateDemoData, clearDemoData, isDemoMode } from "@/lib/demo-data"
import { format } from "date-fns"

interface SettingsModalProps {
  onDataChange?: () => void
}

export function SettingsModal({ onDataChange }: SettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false)
  const [isClearingDemo, setIsClearingDemo] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [demoResult, setDemoResult] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    if (isOpen) {
      isDemoMode().then(setIsDemo)
    }
  }, [isOpen])

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      const data = await exportEncrypted()
      const filename = `espejo-backup-${format(new Date(), "yyyy-MM-dd")}.espejo`
      downloadExport(data, filename)
    } catch (e) {
      setError("Error al exportar datos")
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setImportResult(null)

    try {
      const text = await file.text()
      const result = await importEncrypted(text)
      setImportResult(result)
      onDataChange?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar")
    }

    e.target.value = ""
  }

  const handleGenerateDemo = async () => {
    if (
      !confirm("Esto generará datos de demostración ficticios. Si tienes datos reales, expórtalos primero. ¿Continuar?")
    ) {
      return
    }

    setIsGeneratingDemo(true)
    setError(null)
    setDemoResult(null)

    try {
      const count = await generateDemoData(120)
      setDemoResult(count)
      setIsDemo(true)
      onDataChange?.()
    } catch (e) {
      setError("Error al generar datos de demostración")
    } finally {
      setIsGeneratingDemo(false)
    }
  }

  const handleClearDemo = async () => {
    if (!confirm("¿Estás seguro? Esto borrará todos los datos de demostración.")) return

    setIsClearingDemo(true)
    try {
      await clearDemoData()
      setIsDemo(false)
      setDemoResult(null)
      onDataChange?.()
    } catch (e) {
      setError("Error al borrar datos")
    } finally {
      setIsClearingDemo(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configuración</DialogTitle>
          <DialogDescription>Gestiona tus datos y preferencias de Espejo</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Copia de seguridad</h4>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              variant="outline"
              className="w-full gap-2 bg-transparent"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exportando..." : "Exportar datos cifrados"}
            </Button>
          </div>

          {/* Import */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Restaurar datos</h4>
            <Label
              htmlFor="import-file"
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/50 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <Upload className="h-4 w-4" />
              Seleccionar archivo .espejo
            </Label>
            <Input id="import-file" type="file" accept=".espejo" onChange={handleImport} className="hidden" />
          </div>

          {/* Results */}
          {importResult && (
            <div className="rounded-lg bg-chart-2/20 p-3 text-sm text-chart-2">
              Importadas {importResult.imported} entradas.{" "}
              {importResult.skipped > 0 && `(${importResult.skipped} duplicadas)`}
            </div>
          )}

          {demoResult && (
            <div className="rounded-lg bg-chart-2/20 p-3 text-sm text-chart-2">
              Generadas {demoResult} entradas de demostración
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/20 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Separator />

          {/* Demo Mode */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Modo portfolio / demo</h4>
            <p className="text-xs text-muted-foreground">
              Genera datos ficticios para mostrar la aplicación sin exponer datos reales.
            </p>
            {isDemo ? (
              <Button
                onClick={handleClearDemo}
                disabled={isClearingDemo}
                variant="outline"
                className="w-full gap-2 border-chart-5/50 bg-transparent text-chart-5 hover:bg-chart-5/10"
              >
                <Trash2 className="h-4 w-4" />
                {isClearingDemo ? "Borrando..." : "Borrar datos de demostración"}
              </Button>
            ) : (
              <Button
                onClick={handleGenerateDemo}
                disabled={isGeneratingDemo}
                variant="outline"
                className="w-full gap-2 bg-transparent"
              >
                <Sparkles className="h-4 w-4" />
                {isGeneratingDemo ? "Generando..." : "Generar datos de demostración"}
              </Button>
            )}
          </div>

          {/* Privacy note */}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              Tus datos se guardan localmente en tu navegador. Los archivos exportados están codificados y solo tú
              puedes leerlos. El servidor nunca tiene acceso a tu contenido.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
