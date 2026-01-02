"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, Sparkles, CloudOff, HelpCircle, Save, ArrowRight } from "lucide-react"

interface EntryEditorProps {
  initialContent?: string
  onSave: (content: string, isAutoSave?: boolean) => void
  onContinue: () => void
  mode: "free" | "guided" | "bad-day"
  onModeChange: (mode: "free" | "guided" | "bad-day") => void
}

const PROMPTS = [
  { id: "notice", text: "Hoy me he dado cuenta de…", emoji: "💡" },
  { id: "best", text: "Lo mejor del día fue…", emoji: "✨" },
  { id: "avoid", text: "Lo que estoy evitando es…", emoji: "🙈" },
  { id: "grateful", text: "Una cosa que agradezco…", emoji: "🙏" },
]

// Debounce delay for autosave (1 second after stop typing)
const AUTOSAVE_DELAY = 1000

export function EntryEditor({ initialContent = "", onSave, onContinue, mode, onModeChange }: EntryEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedContentRef = useRef(initialContent)

  useEffect(() => {
    setContent(initialContent)
    lastSavedContentRef.current = initialContent
    setHasUnsavedChanges(false)
  }, [initialContent])

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length
    setWordCount(words)
    
    // Track unsaved changes
    setHasUnsavedChanges(content !== lastSavedContentRef.current && content.trim().length > 0)
  }, [content])

  // Focus textarea on mount
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [])

  // Cleanup autosave timeout on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }
    }
  }, [])

  // Manual save (button click or Cmd+S) - shows post-save panel
  const handleManualSave = useCallback(async () => {
    if (!content.trim()) return
    if (content === lastSavedContentRef.current) return // No changes to save
    
    setIsSaving(true)
    await onSave(content, false) // false = not autosave, show post-save
    lastSavedContentRef.current = content
    setHasUnsavedChanges(false)
    setIsSaving(false)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }, [content, onSave])

  // Auto save - silent, doesn't show post-save panel
  const handleAutoSave = useCallback(async () => {
    if (!content.trim()) return
    if (content === lastSavedContentRef.current) return
    
    setIsSaving(true)
    await onSave(content, true) // true = autosave, don't show post-save
    lastSavedContentRef.current = content
    setHasUnsavedChanges(false)
    setIsSaving(false)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }, [content, onSave])

  // Autosave: save after user stops typing for AUTOSAVE_DELAY ms
  useEffect(() => {
    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
    }
    
    // Don't autosave if content is empty or unchanged
    if (!content.trim() || content === lastSavedContentRef.current) {
      return
    }
    
    // Set new timeout for autosave
    autosaveTimeoutRef.current = setTimeout(() => {
      handleAutoSave()
    }, AUTOSAVE_DELAY)
    
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }
    }
  }, [content, handleAutoSave])

  const insertPrompt = (promptText: string) => {
    const newContent = content ? `${content}\n\n${promptText} ` : `${promptText} `
    setContent(newContent)
    textareaRef.current?.focus()
  }

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleManualSave()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleManualSave])

  return (
    <div className="flex h-full flex-col">
      {/* Mode switcher - simplified */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => onModeChange("free")}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-all",
              mode === "free" 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Libre
          </button>
          <button
            onClick={() => onModeChange("guided")}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-all",
              mode === "guided" 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Sparkles className="h-3 w-3" />
            Guiado
          </button>
          <button
            onClick={() => onModeChange("bad-day")}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-all",
              mode === "bad-day"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CloudOff className="h-3 w-3" />
            Día duro
          </button>
        </div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          title="Ayuda"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Help tooltip */}
      {showHelp && (
        <div className="mb-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <p><strong>Libre:</strong> Escribe lo que quieras sin estructura.</p>
          <p><strong>Guiado:</strong> Usa prompts para reflexionar.</p>
          <p><strong>Día duro:</strong> Solo una frase, sin presión.</p>
          <p className="mt-2 text-xs">Atajo: ⌘S para guardar</p>
        </div>
      )}

      {/* Guided prompts - más compacto */}
      {mode === "guided" && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => insertPrompt(prompt.text)}
              className="rounded-lg bg-accent/50 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
            >
              {prompt.emoji} {prompt.text.replace("…", "")}
            </button>
          ))}
        </div>
      )}

      {/* Bad day hint */}
      {mode === "bad-day" && (
        <p className="mb-4 text-sm text-muted-foreground">
          Solo una frase. No hay presión hoy. 💙
        </p>
      )}

      {/* Editor */}
      <div className="relative flex-1">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            mode === "bad-day" 
              ? "Una frase sobre hoy..." 
              : mode === "guided"
              ? "Elige un prompt arriba o escribe libremente..."
              : "¿Qué hay en tu mente?"
          }
          className={cn(
            "min-h-[200px] w-full resize-none border-none bg-transparent p-0 text-lg leading-relaxed placeholder:text-muted-foreground/40 focus-visible:ring-0",
            mode === "bad-day" && "text-xl",
          )}
          rows={mode === "bad-day" ? 3 : 12}
        />
      </div>

      {/* Footer - with autosave indicator */}
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
          <span>{wordCount} {wordCount === 1 ? "palabra" : "palabras"}</span>
          <span className="text-muted-foreground/30">·</span>
          {hasUnsavedChanges && !isSaving && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
              </span>
              <span className="text-xs">autoguardado...</span>
            </span>
          )}
          {isSaving && (
            <span className="flex items-center gap-1.5 text-primary">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xs">sincronizando...</span>
            </span>
          )}
          {!hasUnsavedChanges && !isSaving && content.trim() && (
            <span className="flex items-center gap-1 text-green-500/80">
              <Check className="h-3 w-3" />
              <span className="text-xs">guardado</span>
            </span>
          )}
        </div>
        
        {/* Show "Continuar" when saved, "Guardar" when there are changes */}
        {hasUnsavedChanges ? (
          <Button 
            onClick={handleManualSave} 
            disabled={!content.trim() || isSaving}
            size="lg"
            className="gap-2"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        ) : (
          <Button 
            onClick={onContinue} 
            disabled={!content.trim()}
            size="lg"
            className="gap-2"
          >
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
