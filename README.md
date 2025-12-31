# 🪞 Espejo

Diario personal con cifrado E2E, seguimiento de hábitos y analítica visual.

## Características

- **Cifrado E2E**: AES-256-GCM, nadie puede leer tus datos excepto tú
- **Sync seguro**: Sincroniza entre dispositivos con Supabase (datos siempre cifrados)
- **Offline-first**: Funciona sin conexión, IndexedDB como base local
- **Editor flexible**: Modos libre, guiado y día-malo
- **Analytics**: Patrones de hábitos, emociones y lenguaje
- **PWA**: Instalable en móvil y escritorio

## Instalación

```bash
# Requisitos: Node.js 20+, pnpm

git clone https://github.com/tu-usuario/espejo.git
cd espejo
pnpm install
cp .env.example .env.local
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Sincronización (Opcional)

Para sincronizar entre dispositivos:

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta `supabase/schema.sql` en el SQL Editor
3. Añade las credenciales a `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```
4. Reinicia y configura sync en la app (icono ☁️)

## Stack

- Next.js 16 + TypeScript
- Dexie (IndexedDB)
- Supabase (sync opcional)
- Tailwind + Radix UI
- Recharts

## Licencia

MIT
