/**
 * API para sincronizar una sola entrada (sync incremental)
 */

import { NextRequest, NextResponse } from "next/server"

interface EncryptedEntry {
  id: string
  date: string
  data: unknown
  updatedAt: number
  deleted?: boolean
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
    
    if (!global.syncUsers?.has(userId)) {
      return NextResponse.json(
        { message: "Usuario no registrado" },
        { status: 401 }
      )
    }
    
    const entry: EncryptedEntry = await request.json()
    
    // Inicializar storage si no existe
    if (!global.syncData.has(userId)) {
      global.syncData.set(userId, {
        entries: new Map(),
        reviews: new Map(),
      })
    }
    
    const userData = global.syncData.get(userId)!
    const existing = userData.entries.get(entry.id)
    
    // Solo actualizar si es más reciente
    if (!existing || entry.updatedAt > existing.updatedAt) {
      userData.entries.set(entry.id, entry)
    }
    
    return NextResponse.json({ 
      success: true,
      synced: !existing || entry.updatedAt > existing.updatedAt
    })
    
  } catch (error) {
    console.error("Error en sync entry:", error)
    return NextResponse.json(
      { message: "Error de sincronización" },
      { status: 500 }
    )
  }
}
