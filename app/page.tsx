"use client"

import { useState, useEffect, useCallback } from "react"
import { EntryEditor } from "@/components/espejo/entry-editor"
import { PostSavePanel } from "@/components/espejo/post-save-panel"
import { EntryList } from "@/components/espejo/entry-list"
import { ContinuityHeatmap } from "@/components/espejo/continuity-heatmap"
import { SettingsModal } from "@/components/espejo/settings-modal"
import { InstallPrompt } from "@/components/espejo/install-prompt"
import { DemoBanner } from "@/components/espejo/demo-banner"
import { SyncModal } from "@/components/espejo/sync-modal"
import { Logo } from "@/components/espejo/logo"
import { Button } from "@/components/ui/button"
import { PenLine, List, ArrowLeft, BarChart3, CalendarCheck, Trash2 } from "lucide-react"
import Link from "next/link"
import { initializeSettings, getTodayDate, type Entry, type Settings } from "@/lib/db"
import { getAllEntries, createOrUpdateEntry, getEntryByDate, deleteEntry } from "@/lib/entries"
import { syncEntry, isSyncEnabled, getSyncPassword } from "@/lib/sync"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

type View = "home" | "editor" | "list"
type EditorMode = "free" | "guided" | "bad-day"

export default function EspejoApp() {
  const [view, setView] = useState<View>("home")
  const [entries, setEntries] = useState<Entry[]>([])
  const [currentEntry, setCurrentEntry] = useState<Entry | null>(null)
  const [editingDate, setEditingDate] = useState<string | null>(null) // Fecha de la entrada que estamos editando
  const [settings, setSettings] = useState<Settings | null>(null)
  const [editorMode, setEditorMode] = useState<EditorMode>("free")
  const [showPostSave, setShowPostSave] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Load data on mount and when refreshKey changes
  useEffect(() => {
    async function loadData() {
      const [loadedSettings, loadedEntries] = await Promise.all([initializeSettings(), getAllEntries()])
      setSettings(loadedSettings)
      setEntries(loadedEntries)

      // Check if there's an entry for today
      const todayEntry = await getEntryByDate(getTodayDate())
      if (todayEntry) {
        setCurrentEntry(todayEntry)
      } else {
        setCurrentEntry(null)
      }

      setIsLoading(false)
    }
    loadData()
  }, [refreshKey])

  const handleDataChange = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const handleStartWriting = useCallback(async () => {
    const todayEntry = await getEntryByDate(getTodayDate())
    setCurrentEntry(todayEntry || null)
    setEditingDate(getTodayDate())
    setView("editor")
    setShowPostSave(false)
  }, [])

  const handleSaveEntry = useCallback(
    async (content: string, isAutoSave?: boolean) => {
      const saved = await createOrUpdateEntry(
        {
          content,
          moodTags: currentEntry?.moodTags || [],
          habits: currentEntry?.habits || {},
          highlights: currentEntry?.highlights || {},
        },
        editingDate || undefined
      )
      setCurrentEntry(saved)

      // Refresh entries list
      const updated = await getAllEntries()
      setEntries(updated)

      // Sync if enabled - only show toast on error/warning
      if (isSyncEnabled() && getSyncPassword()) {
        syncEntry(saved).then((result) => {
          if (result.needsUnlock) {
            toast.warning("Sesión expirada. Abre sync para reconectar.", { duration: 4000 })
          } else if (!result.success) {
            toast.error(`Error sync: ${result.error}`, { duration: 4000 })
          }
          // No toast on success - the UI already shows "Guardado"
        }).catch((err) => {
          toast.error(`Error: ${err.message}`, { duration: 4000 })
        })
      }

      // Only show post-save panel on manual save, not autosave
      if (!isAutoSave) {
        setShowPostSave(true)
      }
    },
    [currentEntry, editingDate],
  )

  const handleUpdateEntry = useCallback(
    async (updates: Partial<Entry>) => {
      if (!currentEntry) return
      const saved = await createOrUpdateEntry(
        {
          ...currentEntry,
          ...updates,
          content: currentEntry.content,
        },
        editingDate || undefined
      )
      setCurrentEntry(saved)

      // Refresh entries list
      const updatedEntries = await getAllEntries()
      setEntries(updatedEntries)
      
      // Sync if enabled - only show toast on error/warning
      if (isSyncEnabled() && getSyncPassword()) {
        syncEntry(saved).then((result) => {
          if (result.needsUnlock) {
            toast.warning("Sesión expirada. Abre sync para reconectar.", { duration: 4000 })
          } else if (!result.success) {
            toast.error(`Error sync: ${result.error}`, { duration: 4000 })
          }
          // No toast on success - avoid notification overload
        }).catch(() => {
          // Silent fail for metadata updates
        })
      }
    },
    [currentEntry, editingDate],
  )

  const handleSelectEntry = useCallback((entry: Entry) => {
    setCurrentEntry(entry)
    setEditingDate(entry.date)
    setView("editor")
    setShowPostSave(false)
  }, [])

  const handleDayClick = useCallback(
    async (date: string) => {
      const entry = await getEntryByDate(date)
      if (entry) {
        // Editar entrada existente
        setCurrentEntry(entry)
        setEditingDate(entry.date)
        setView("editor")
        setShowPostSave(false)
      } else {
        // Crear nueva entrada para este día (pasado o hoy)
        setCurrentEntry(null)
        setEditingDate(date)
        setView("editor")
        setShowPostSave(false)
      }
    },
    [],
  )

  const handleDeleteEntry = useCallback(async () => {
    if (!currentEntry) return
    
    const confirmDelete = confirm("¿Eliminar esta entrada? Esta acción no se puede deshacer.")
    if (!confirmDelete) return
    
    await deleteEntry(currentEntry.id)
    
    // Refresh entries list
    const updated = await getAllEntries()
    setEntries(updated)
    
    toast.success("Entrada eliminada", { duration: 2000 })
    setView("home")
    setCurrentEntry(null)
    setEditingDate(null)
  }, [currentEntry])

  // Calculate streak
  const currentStreak = entries.reduce((streak, entry, index) => {
    if (index === 0) return 1
    const prev = entries[index - 1]
    const dayDiff = Math.floor((new Date(prev.date).getTime() - new Date(entry.date).getTime()) / (1000 * 60 * 60 * 24))
    return dayDiff === 1 ? streak + 1 : streak
  }, 0)

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto flex min-h-svh max-w-2xl flex-col px-4 py-6">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          {view !== "home" ? (
            <button
              onClick={() => setView("home")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Volver</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <Logo size={36} />
              <h1 className="text-2xl font-light tracking-tight">Espejo</h1>
            </div>
          )}
          <div className="flex items-center gap-1">
            <SyncModal onSyncComplete={handleDataChange} />
            <SettingsModal onDataChange={handleDataChange} />
          </div>
        </header>

        {/* Demo banner */}
        {view === "home" && <DemoBanner onDataCleared={handleDataChange} />}

        {/* Home View */}
        {view === "home" && (
          <main className="flex flex-1 flex-col gap-8">
            {/* Empty state for new users */}
            {entries.length === 0 ? (
              <section className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
                <Logo size={80} />
                <div className="space-y-2">
                  <h2 className="text-xl font-medium">Tu espacio de reflexión</h2>
                  <p className="mx-auto max-w-sm text-muted-foreground">
                    Un diario personal para escribir sin filtros. Tus pensamientos, cifrados. Tu privacidad, garantizada.
                  </p>
                </div>
                <Button onClick={handleStartWriting} size="lg" className="mt-4 h-14 gap-3 px-8 text-lg">
                  <PenLine className="h-5 w-5" />
                  Empezar a escribir
                </Button>
                
                {/* Info note */}
                <div className="mx-auto mt-6 max-w-sm space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4 text-left text-sm">
                  <ul className="space-y-2 text-muted-foreground">
                    <li>📝 Escribe lo que quieras, cuando quieras</li>
                    <li>🔒 Tus datos nunca salen de tu dispositivo</li>
                    <li>📊 Descubre patrones en tu día a día</li>
                    <li>☁️ Sincroniza entre móvil y ordenador (opcional)</li>
                  </ul>
                </div>
              </section>
            ) : (
              <>
                {/* Primary action */}
                <section className="text-center">
                  <Button onClick={handleStartWriting} size="lg" className="h-16 w-full gap-3 text-lg">
                    <PenLine className="h-5 w-5" />
                    {currentEntry ? "Continuar escribiendo" : "Escribir hoy"}
                  </Button>
                  {currentStreak > 1 && (
                    <p className="mt-3 text-sm text-muted-foreground">{currentStreak} días seguidos escribiendo ✨</p>
                  )}
                </section>

                {/* Continuity heatmap */}
                <section className="space-y-3">
                  <h2 className="text-sm font-medium text-muted-foreground">Tu año</h2>
                  <ContinuityHeatmap entries={entries} onDayClick={handleDayClick} />
                </section>

                {/* Quick stats */}
                <section className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="rounded-lg bg-card p-3 text-center sm:p-4">
                    <div className="text-xl font-medium sm:text-2xl">{entries.length}</div>
                    <div className="text-[10px] text-muted-foreground sm:text-xs">Entradas</div>
                  </div>
                  <div className="rounded-lg bg-card p-3 text-center sm:p-4">
                    <div className="text-xl font-medium sm:text-2xl">
                      {entries.reduce((sum, e) => sum + e.wordCount, 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground sm:text-xs">Palabras</div>
                  </div>
                  <div className="rounded-lg bg-card p-3 text-center sm:p-4">
                    <div className="text-xl font-medium sm:text-2xl">{currentStreak}</div>
                    <div className="text-[10px] text-muted-foreground sm:text-xs">Racha</div>
                  </div>
                </section>

                {/* Navigation */}
                <nav className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => setView("list")} className="gap-2">
                    <List className="h-4 w-4" />
                    Entradas
                  </Button>
                  <Button variant="outline" asChild className="gap-2 bg-transparent">
                    <Link href="/patterns">
                      <BarChart3 className="h-4 w-4" />
                      Patrones
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="col-span-2 gap-2 bg-transparent">
                    <Link href="/review">
                      <CalendarCheck className="h-4 w-4" />
                      Revisión semanal
                    </Link>
                  </Button>
                </nav>
              </>
            )}
          </main>
        )}

        {/* Editor View */}
        {view === "editor" && (
          <main className="flex flex-1 flex-col">
            {/* Date indicator and delete button */}
            {editingDate && (
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {editingDate === getTodayDate() 
                    ? "Hoy" 
                    : format(parseISO(editingDate), "EEEE d 'de' MMMM", { locale: es })}
                </p>
                {currentEntry && (
                  <button
                    onClick={handleDeleteEntry}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Eliminar
                  </button>
                )}
              </div>
            )}
            
            {showPostSave && currentEntry && settings ? (
              <PostSavePanel
                entry={currentEntry}
                moodOptions={settings.moodOptions}
                onUpdate={handleUpdateEntry}
                onClose={() => {
                  setShowPostSave(false)
                  setView("home")
                }}
                onContinueEditing={() => {
                  setShowPostSave(false)
                }}
              />
            ) : (
              <EntryEditor
                initialContent={currentEntry?.content || ""}
                onSave={handleSaveEntry}
                onContinue={() => setShowPostSave(true)}
                mode={editorMode}
                onModeChange={setEditorMode}
              />
            )}
          </main>
        )}

        {/* List View */}
        {view === "list" && (
          <main className="flex-1">
            <EntryList entries={entries} onSelect={handleSelectEntry} selectedId={currentEntry?.id} />
          </main>
        )}
      </div>

      {/* Install prompt */}
      <InstallPrompt />
    </>
  )
}
