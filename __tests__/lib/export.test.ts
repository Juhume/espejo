/**
 * Tests para el módulo de export/import
 */

import { describe, it, expect, vi } from 'vitest'
import { 
  exportPlaintext, 
  exportEncryptedSecure, 
  importData,
  getExportFilename 
} from '../../lib/export'

// Mock de Dexie
vi.mock('../../lib/db', () => ({
  db: {
    entries: {
      toArray: vi.fn().mockResolvedValue([
        {
          id: 'entry-1',
          date: '2026-01-01',
          content: 'Mi primera entrada',
          moodTags: ['feliz'],
          habits: {},
          wordCount: 3,
          updatedAt: Date.now(),
          createdAt: Date.now(),
        },
      ]),
      get: vi.fn().mockResolvedValue(null),
      add: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
    settings: {
      get: vi.fn().mockResolvedValue({ id: 'main', theme: 'dark' }),
      put: vi.fn().mockResolvedValue(undefined),
    },
    reviews: {
      toArray: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      add: vi.fn().mockResolvedValue(undefined),
    },
  },
}))

describe('export', () => {
  describe('exportPlaintext', () => {
    it('exporta datos en formato JSON legible', async () => {
      const result = await exportPlaintext()
      const parsed = JSON.parse(result)
      
      expect(parsed.version).toBe('2.0.0')
      expect(parsed.exportedAt).toBeTruthy()
      expect(Array.isArray(parsed.entries)).toBe(true)
    })
  })

  describe('exportEncryptedSecure', () => {
    it('cifra datos con contraseña', async () => {
      const password = 'contraseña-segura-12345678'
      const result = await exportEncryptedSecure(password)
      const parsed = JSON.parse(result)
      
      expect(parsed.format).toBe('encrypted')
      expect(parsed.payload.ciphertext).toBeTruthy()
      expect(parsed.payload.iv).toBeTruthy()
      expect(parsed.payload.salt).toBeTruthy()
    })

    it('rechaza contraseñas cortas', async () => {
      await expect(exportEncryptedSecure('short')).rejects.toThrow('al menos 8 caracteres')
    })
  })

  describe('importData', () => {
    it('detecta formato plaintext', async () => {
      const data = JSON.stringify({
        version: '2.0.0',
        exportedAt: Date.now(),
        entries: [],
        reviews: [],
      })
      
      const result = await importData(data)
      expect(result.format).toBe('plaintext')
    })

    it('detecta formato cifrado y requiere contraseña', async () => {
      const password = 'test-password-123'
      const exported = await exportEncryptedSecure(password)
      
      await expect(importData(exported)).rejects.toThrow('Se requiere contraseña')
    })

    it('importa datos cifrados con contraseña correcta', async () => {
      const password = 'test-password-123'
      const exported = await exportEncryptedSecure(password)
      
      const result = await importData(exported, password)
      expect(result.format).toBe('encrypted')
    })

    it('falla con contraseña incorrecta', async () => {
      const password = 'test-password-123'
      const exported = await exportEncryptedSecure(password)
      
      await expect(importData(exported, 'wrong-password')).rejects.toThrow('Contraseña incorrecta')
    })
  })

  describe('getExportFilename', () => {
    it('genera nombre con fecha para plaintext', () => {
      const filename = getExportFilename(false)
      expect(filename).toMatch(/^espejo-backup-\d{4}-\d{2}-\d{2}\.json$/)
    })

    it('genera nombre con fecha para encrypted', () => {
      const filename = getExportFilename(true)
      expect(filename).toMatch(/^espejo-encrypted-\d{4}-\d{2}-\d{2}\.json$/)
    })
  })
})
