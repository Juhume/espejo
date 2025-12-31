"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Cloud, 
  CloudOff, 
  Lock, 
  RefreshCw, 
  Check, 
  AlertTriangle,
  Eye,
  EyeOff,
  Shield
} from "lucide-react"
import { 
  setupSync, 
  getSyncConfig, 
  clearSyncConfig,
  sync,
  verifyPassword,
  setSyncPassword,
  getSyncPassword,
  needsPassword,
  isSyncEnabled,
  getLastSyncTime,
} from "@/lib/sync"
import { cn } from "@/lib/utils"

interface SyncModalProps {
  onSyncComplete?: () => void
}

export function SyncModal({ onSyncComplete }: SyncModalProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"status" | "setup" | "unlock">("status")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Form fields
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  
  // Status
  const [syncEnabled, setSyncEnabled] = useState(false)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [needsUnlock, setNeedsUnlock] = useState(false)

  useEffect(() => {
    if (open) {
      refreshStatus()
    }
  }, [open])

  const refreshStatus = () => {
    setSyncEnabled(isSyncEnabled())
    setLastSync(getLastSyncTime())
    setNeedsUnlock(needsPassword())
    
    if (needsPassword()) {
      setStep("unlock")
    } else {
      setStep("status")
    }
  }

  const handleSetup = async () => {
    setError(null)
    
    if (!email || !password) {
      setError("Email y contraseña son requeridos")
      return
    }
    
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }
    
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }
    
    setIsLoading(true)
    
    try {
      const result = await setupSync(email, password)
      
      if (result.success) {
        setSuccess("¡Sincronización activada!")
        refreshStatus()
        setStep("status")
        
        // Sincronizar inmediatamente
        await sync(password)
        onSyncComplete?.()
      } else {
        setError(result.error || "Error al configurar")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlock = async () => {
    setError(null)
    
    if (!password) {
      setError("Introduce tu contraseña")
      return
    }
    
    setIsLoading(true)
    
    try {
      const valid = await verifyPassword(password)
      
      if (valid) {
        setSyncPassword(password)
        setSuccess("Desbloqueado")
        refreshStatus()
        setStep("status")
        
        // Sincronizar
        const result = await sync(password)
        if (result.success) {
          onSyncComplete?.()
        }
      } else {
        setError("Contraseña incorrecta")
      }
    } catch (err) {
      setError("Error al verificar")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await sync()
      
      if (result.success) {
        setSuccess(`Sincronizado: ${result.pushed} subidos, ${result.pulled} descargados`)
        setLastSync(Date.now())
        onSyncComplete?.()
      } else {
        setError(result.error || "Error de sincronización")
      }
    } catch {
      setError("Error de red")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable = () => {
    if (confirm("¿Desactivar sincronización? Tus datos locales se mantendrán.")) {
      clearSyncConfig()
      refreshStatus()
      setSuccess("Sincronización desactivada")
    }
  }

  const formatLastSync = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return "Hace un momento"
    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours}h`
    return `Hace ${days} días`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "relative",
            syncEnabled && "text-green-500"
          )}
          title={syncEnabled ? "Sincronización activa" : "Sincronización"}
        >
          {syncEnabled ? (
            <Cloud className="h-5 w-5" />
          ) : (
            <CloudOff className="h-5 w-5" />
          )}
          {needsUnlock && (
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500" />
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sincronización cifrada
          </DialogTitle>
          <DialogDescription>
            Sincroniza entre dispositivos con cifrado de extremo a extremo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Status View */}
          {step === "status" && syncEnabled && (
            <>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Sincronización activa
                    </p>
                    {lastSync && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Última sync: {formatLastSync(lastSync)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleSync} 
                  disabled={isLoading}
                  className="flex-1"
                >
                  <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                  Sincronizar ahora
                </Button>
              </div>
              
              <Button 
                variant="ghost" 
                onClick={handleDisable}
                className="w-full text-muted-foreground"
              >
                Desactivar sincronización
              </Button>
            </>
          )}
          
          {/* Status View - Not Enabled */}
          {step === "status" && !syncEnabled && (
            <>
              <div className="rounded-lg border p-4 text-center">
                <CloudOff className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  La sincronización no está activada.
                </p>
                <p className="text-xs text-muted-foreground">
                  Actívala para acceder desde otros dispositivos.
                </p>
              </div>
              
              <Button onClick={() => setStep("setup")} className="w-full">
                <Lock className="mr-2 h-4 w-4" />
                Activar sincronización cifrada
              </Button>
            </>
          )}
          
          {/* Setup View */}
          {step === "setup" && (
            <>
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">🔐 Cifrado de extremo a extremo</p>
                <p className="mt-1 text-muted-foreground">
                  Tus datos se cifran antes de salir de tu dispositivo.
                  Ni el servidor ni nadie más puede leerlos.
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Se usa como identificador (hasheado)
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Contraseña de cifrado</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Confirmar contraseña</label>
                  <Input
                    type="password"
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    <strong>¡Recuerda esta contraseña!</strong> Si la olvidas, 
                    no podrás recuperar tus datos sincronizados.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("status")}>
                  Cancelar
                </Button>
                <Button onClick={handleSetup} disabled={isLoading} className="flex-1">
                  {isLoading ? "Configurando..." : "Activar"}
                </Button>
              </div>
            </>
          )}
          
          {/* Unlock View */}
          {step === "unlock" && (
            <>
              <div className="rounded-lg border p-4 text-center">
                <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 font-medium">Sesión bloqueada</p>
                <p className="text-sm text-muted-foreground">
                  Introduce tu contraseña para sincronizar
                </p>
              </div>
              
              <div>
                <Input
                  type="password"
                  placeholder="Contraseña de cifrado"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                />
              </div>
              
              <Button onClick={handleUnlock} disabled={isLoading} className="w-full">
                {isLoading ? "Verificando..." : "Desbloquear"}
              </Button>
            </>
          )}
          
          {/* Error/Success messages */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}
          
          {success && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-950/30 dark:text-green-400">
              {success}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
