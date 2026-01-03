import '@testing-library/jest-dom/vitest'
import { webcrypto } from 'node:crypto'

// Polyfill crypto.subtle para jsdom (Node 20+ tiene webcrypto pero jsdom no lo expone)
if (!globalThis.crypto?.subtle) {
  // @ts-expect-error - webcrypto es compatible con Web Crypto API
  globalThis.crypto = webcrypto
}

// Mock localStorage y sessionStorage
const storageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] || null,
  }
}

Object.defineProperty(globalThis, 'localStorage', { value: storageMock() })
Object.defineProperty(globalThis, 'sessionStorage', { value: storageMock() })
