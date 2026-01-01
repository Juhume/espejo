"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, Sparkles, CloudOff, HelpCircle } from "lucide-react"

interface EntryEditorProps {
  initialContent?: string
  onSave: (content: string) => void
  mode: "free" | "guided" | "bad-day"
  onModeChange: (mode: "free" | "guided" | "bad-day") => void
}

const PROMPTS = [
  { id: "notice", text: "Hoy me he dado cuenta de…", emoji: "💡" },
  { id: "best", text: "Lo mejor del día fue…", emoji: "✨" },
  { id: "avoid", text: "Lo que estoy evitando es…", emoji: "🙈" },
  { id: "grateful", text: "Una cosa que agradezco…", emoji: "🙏" },
]

export function EntryEditor({ initialContent = "", onSave, mode, onModeChange }: EntryEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setContent(initialContent)
  }, [initialContent])

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length
    setWordCount(words)
  }, [content])

  // Focus textarea on mount
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [])

  const handleSave = useCallback(async () => {
    if (!content.trim()) return
    setIsSaving(true)
    await onSave(content)
    setIsSaving(false)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }, [content, onSave])

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
        handleSave()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleSave])

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

      {/* Footer - simplified */}
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
        <span className="text-sm text-muted-foreground/60">
          {wordCount} {wordCount === 1 ? "palabra" : "palabras"}
        </span>
        <Button 
          onClick={handleSave} 
          disabled={!content.trim() || isSaving}
          size="lg"
          className={cn(
            "gap-2 transition-all",
            showSaved && "bg-green-600 hover:bg-green-600"
          )}
        >
          {showSaved ? (
            <>
              <Check className="h-4 w-4" />
              Guardado
            </>
          ) : (
            isSaving ? "Guardando..." : "Guardar"
          )}
        </Button>
      </div>
    </div>
  )
}
