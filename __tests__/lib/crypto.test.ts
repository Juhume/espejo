/**
 * Tests críticos para el módulo de criptografía
 * 
 * Verifican:
 *   - Roundtrip encrypt/decrypt
 *   - Compatibilidad v1 ↔ v2
 *   - Casos de error (contraseña incorrecta)
 */

import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, hashPassword, deriveKey } from '../../lib/crypto'

describe('crypto', () => {
  describe('encrypt/decrypt roundtrip', () => {
    it('cifra y descifra texto corto', async () => {
      const plaintext = 'Hola mundo'
      const password = 'contraseña-segura-123'
      
      const encrypted = await encrypt(plaintext, password)
      const decrypted = await decrypt(encrypted, password)
      
      expect(decrypted).toBe(plaintext)
    })

    it('cifra y descifra texto largo con caracteres especiales', async () => {
      const plaintext = `
        Este es un texto largo con emojis 🎉🔐 y caracteres especiales:
        ñ, ü, ö, á, é, í, ó, ú, 中文, 日本語, العربية
        Y múltiples líneas...
        
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      `.repeat(10)
      const password = 'contraseña-muy-larga-y-segura-!@#$%^&*()'
      
      const encrypted = await encrypt(plaintext, password)
      const decrypted = await decrypt(encrypted, password)
      
      expect(decrypted).toBe(plaintext)
    })

    it('cifra y descifra JSON serializado', async () => {
      const data = {
        content: 'Mi entrada de diario',
        moodTags: ['feliz', 'productivo'],
        habits: { ejercicio: true, meditación: false },
        wordCount: 42,
      }
      const password = 'test-password'
      
      const encrypted = await encrypt(JSON.stringify(data), password)
      const decrypted = JSON.parse(await decrypt(encrypted, password))
      
      expect(decrypted).toEqual(data)
    })

    it('genera payload con versión 2', async () => {
      const encrypted = await encrypt('test', 'password')
      
      expect(encrypted.version).toBe(2)
      expect(encrypted.ciphertext).toBeTruthy()
      expect(encrypted.iv).toBeTruthy()
      expect(encrypted.salt).toBeTruthy()
    })
  })

  describe('error handling', () => {
    it('falla con contraseña incorrecta', async () => {
      const plaintext = 'Datos secretos'
      const password = 'contraseña-correcta'
      const wrongPassword = 'contraseña-incorrecta'
      
      const encrypted = await encrypt(plaintext, password)
      
      await expect(decrypt(encrypted, wrongPassword)).rejects.toThrow('DECRYPTION_FAILED')
    })

    it('falla con ciphertext corrupto', async () => {
      const encrypted = await encrypt('test', 'password')
      encrypted.ciphertext = 'datos-corruptos-base64=='
      
      await expect(decrypt(encrypted, 'password')).rejects.toThrow()
    })
  })

  describe('versión y compatibilidad', () => {
    it('descifra payload v1 (100k iteraciones)', async () => {
      // Simular payload v1 cifrando con deriveKey v1
      const plaintext = 'Datos de versión 1'
      const password = 'test-v1'
      
      // Crear payload v1 manualmente
      const { encryptionKey, salt } = await deriveKey(password, undefined, 1)
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        encryptionKey,
        new TextEncoder().encode(plaintext)
      )
      
      const payloadV1 = {
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
        iv: btoa(String.fromCharCode(...iv)),
        salt: btoa(String.fromCharCode(...salt)),
        version: 1,
      }
      
      // Debería descifrar correctamente con la función decrypt
      const decrypted = await decrypt(payloadV1, password)
      expect(decrypted).toBe(plaintext)
    })

    it('genera IVs únicos por cifrado', async () => {
      const password = 'test'
      const plaintext = 'mismo texto'
      
      const encrypted1 = await encrypt(plaintext, password)
      const encrypted2 = await encrypt(plaintext, password)
      
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
      expect(encrypted1.salt).not.toBe(encrypted2.salt)
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext)
    })
  })

  describe('hashPassword', () => {
    it('genera hash determinístico', async () => {
      const password = 'mi-contraseña'
      
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      expect(hash1).toBe(hash2)
    })

    it('genera hashes diferentes para contraseñas diferentes', async () => {
      const hash1 = await hashPassword('contraseña-1')
      const hash2 = await hashPassword('contraseña-2')
      
      expect(hash1).not.toBe(hash2)
    })
  })
})
