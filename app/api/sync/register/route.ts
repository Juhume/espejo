/**
 * API de sincronización - Registro de usuario
 * 
 * El servidor NUNCA ve datos descifrados.
 * Solo almacena blobs cifrados asociados a un userId.
 */

import { NextRequest, NextResponse } from "next/server"

// En producción, esto sería una base de datos real (PostgreSQL, MongoDB, etc.)
// Por ahora usamos un Map en memoria para demostración
declare global {
  // eslint-disable-next-line no-var
  var syncUsers: Map<string, { 
    verificationToken: string
    devices: string[]
    createdAt: number 
  }>
}

if (!global.syncUsers) {
  global.syncUsers = new Map()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, deviceId, verificationToken } = body
    
    if (!userId || !deviceId || !verificationToken) {
      return NextResponse.json(
        { message: "Faltan campos requeridos" },
        { status: 400 }
      )
    }
    
    // Verificar si el usuario ya existe
    const existingUser = global.syncUsers.get(userId)
    
    if (existingUser) {
      // Usuario existe - verificar token
      if (existingUser.verificationToken !== verificationToken) {
        return NextResponse.json(
          { message: "Credenciales inválidas" },
          { status: 401 }
        )
      }
      
      // Añadir dispositivo si es nuevo
      if (!existingUser.devices.includes(deviceId)) {
        existingUser.devices.push(deviceId)
      }
      
      return NextResponse.json({ 
        message: "Sesión iniciada",
        isNewUser: false 
      })
    }
    
    // Crear nuevo usuario
    global.syncUsers.set(userId, {
      verificationToken,
      devices: [deviceId],
      createdAt: Date.now(),
    })
    
    return NextResponse.json({ 
      message: "Usuario registrado",
      isNewUser: true 
    })
    
  } catch (error) {
    console.error("Error en registro:", error)
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
