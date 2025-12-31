/**
 * API de sincronización principal
 * 
 * Recibe datos CIFRADOS, los almacena, y devuelve cambios de otros dispositivos.
 * El servidor es "ciego" - no puede descifrar nada.
 */

import { NextRequest, NextResponse } from "next/server"

// Tipos para datos cifrados (el servidor no conoce el contenido)
interface EncryptedEntry {
  id: string
  date: string
  data: unknown  // Blob cifrado - servidor no lo toca
  updatedAt: number
  deleted?: boolean
}

interface EncryptedReview {
  id: string
  type: string
  periodStart: string
  data: unknown  // Blob cifrado
  updatedAt: number
  deleted?: boolean
}

interface SyncPayload {
  entries: EncryptedEntry[]
  reviews: EncryptedReview[]
  lastSyncAt: number
  deviceId: string
}

// Storage en memoria (en producción: base de datos)
declare global {
  // eslint-disable-next-line no-var
  var syncData: Map<string, {
    entries: Map<string, EncryptedEntry>
    reviews: Map<string, EncryptedReview>
  }>
}

if (!global.syncData) {
  global.syncData = new Map()
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("X-User-Id")
    const deviceId = request.headers.get("X-Device-Id")
    
    if (!userId || !deviceId) {
      return NextResponse.json(
        { message: "Headers de autenticación faltantes" },
        { status: 401 }
      )
    }
    
    // Verificar que el usuario existe
    if (!global.syncUsers?.has(userId)) {
      return NextResponse.json(
        { message: "Usuario no registrado" },
        { status: 401 }
      )
    }
    
    const payload: SyncPayload = await request.json()
    
    // Inicializar storage del usuario si no existe
    if (!global.syncData.has(userId)) {
      global.syncData.set(userId, {
        entries: new Map(),
        reviews: new Map(),
      })
    }
    
    const userData = global.syncData.get(userId)!
    
    // 1. Guardar entries enviados por el cliente
    for (const entry of payload.entries) {
      const existing = userData.entries.get(entry.id)
      
      // Solo actualizar si es más reciente
      if (!existing || entry.updatedAt > existing.updatedAt) {
        userData.entries.set(entry.id, entry)
      }
    }
    
    // 2. Guardar reviews enviados
    for (const review of payload.reviews) {
      const existing = userData.reviews.get(review.id)
      
      if (!existing || review.updatedAt > existing.updatedAt) {
        userData.reviews.set(review.id, review)
      }
    }
    
    // 3. Preparar respuesta con cambios desde otros dispositivos
    const responseEntries: EncryptedEntry[] = []
    const responseReviews: EncryptedReview[] = []
    
    // Filtrar entries modificados después del último sync del cliente
    for (const entry of userData.entries.values()) {
      if (entry.updatedAt > payload.lastSyncAt) {
        responseEntries.push(entry)
      }
    }
    
    for (const review of userData.reviews.values()) {
      if (review.updatedAt > payload.lastSyncAt) {
        responseReviews.push(review)
      }
    }
    
    return NextResponse.json({
      entries: responseEntries,
      reviews: responseReviews,
      lastSyncAt: Date.now(),
      deviceId: "server",
    } satisfies SyncPayload)
    
  } catch (error) {
    console.error("Error en sync:", error)
    return NextResponse.json(
      { message: "Error de sincronización" },
      { status: 500 }
    )
  }
}

// GET para verificar estado
export async function GET(request: NextRequest) {
  const userId = request.headers.get("X-User-Id")
  
  if (!userId) {
    return NextResponse.json({ status: "not_authenticated" })
  }
  
  const userData = global.syncData.get(userId)
  
  return NextResponse.json({
    status: "ok",
    entriesCount: userData?.entries.size ?? 0,
    reviewsCount: userData?.reviews.size ?? 0,
  })
}
