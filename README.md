# Espejo 🪞

Diario personal privado con cifrado E2E, seguimiento de hábitos y analítica de escritura.

## ✨ Características

- 📝 Editor de diario con autoguardado
- 🔐 Cifrado E2E AES-256-GCM para sincronización
- 📊 Analítica de escritura (palabras, rachas, patrones)
- 😊 Seguimiento de ánimo y hábitos
- 📱 PWA instalable (funciona offline)
- 🌙 Modo oscuro/claro

## 🚀 Setup

```bash
pnpm install
pnpm dev
```

## 🔄 Sync (opcional)

Si quieres sincronizar entre dispositivos:

1. Crea proyecto en [Supabase](https://supabase.com)
2. Ejecuta `supabase/schema-v2-secure.sql` (⚠️ usa v2, no v1)
3. Copia las credenciales a `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

## 🛡️ Modelo de Seguridad (Threat Model)

### ¿Qué significa "E2E" en Espejo?

**Cifrado en tránsito y en reposo en el servidor** ✅
- El contenido de las entradas se cifra con AES-256-GCM antes de enviarse
- El servidor (Supabase) solo ve blobs cifrados
- Solo tú puedes descifrar con tu contraseña

**Cifrado en reposo local** ❌
- IndexedDB guarda entradas en texto plano
- Si alguien accede a tu dispositivo, puede ver el diario
- Esto es intencional: permite funcionar offline sin pedir contraseña constantemente

### Garantías

| Amenaza | Protección |
|---------|------------|
| Servidor comprometido | ✅ Solo ve ciphertext |
| Man-in-the-middle | ✅ HTTPS + datos pre-cifrados |
| Exfiltración de DB remota | ✅ Sin clave, datos inútiles |
| Acceso físico a tu dispositivo | ⚠️ Datos locales visibles |
| Pérdida de contraseña | ❌ No hay recuperación |

### Metadatos expuestos (trade-off de privacidad)

El servidor **sí conoce**:
- `entry_date`: cuándo escribes
- `updated_at`: frecuencia de ediciones
- `user_hash`: identificador derivado del email

Esto revela patrones de uso (rachas, horarios) aunque no el contenido.

### Criptografía

| Componente | Algoritmo | Notas |
|------------|-----------|-------|
| Cifrado | AES-256-GCM | Confidencialidad + integridad |
| KDF | PBKDF2-SHA256 | 310,000 iteraciones (OWASP 2023) |
| IV | Random 12 bytes | Único por cifrado |
| Salt | Random 16 bytes | Único por derivación |

### Limitaciones conocidas

1. **PBKDF2 vs Argon2**: Usamos PBKDF2 porque WebCrypto no soporta Argon2 nativamente. 310k iteraciones es razonable pero no ideal para contraseñas débiles.

2. **Hash del email**: El `user_hash` se deriva con SHA-256, lo que permite enumerar usuarios si se conocen emails. Mitigado con rate limiting en el schema v2.

3. **Sin forward secrecy**: Si tu contraseña se compromete, todos los datos históricos son descifrables.

### Recomendaciones de uso

- Usa una contraseña fuerte (20+ caracteres o passphrase)
- Si tu dispositivo es compartido, considera usar el bloqueo del sistema operativo
- Haz backups cifrados periódicos con `exportEncryptedSecure()`

---

## 🧪 Stack técnico

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Estilos**: Tailwind CSS, shadcn/ui
- **Base de datos local**: Dexie (IndexedDB)
- **Sync remoto**: Supabase (PostgreSQL + RPC)
- **Cifrado**: WebCrypto API nativa
- **Gráficos**: Recharts

## 📁 Estructura

```
lib/
  crypto.ts     # AES-256-GCM, PBKDF2
  sync.ts       # Sincronización E2E con Supabase
  export.ts     # Backup cifrado/plano
  db.ts         # Schema Dexie (IndexedDB)
  entries.ts    # CRUD de entradas

components/espejo/
  entry-editor.tsx    # Editor con autoguardado
  sync-modal.tsx      # UI de sincronización
  ...

supabase/
  schema-v2-secure.sql  # ⚠️ Schema con autenticación en todas las RPC
  schema.sql            # (deprecated) Schema v1 vulnerable
```

## 🔒 Migraciones de seguridad

### v1 → v2 (Enero 2026)

**Cambios críticos**:
1. Todas las RPC de sync ahora requieren `p_verification_token`
2. PBKDF2 aumentado de 100k a 310k iteraciones
3. Rate limiting añadido tras 5 intentos fallidos
4. Export ahora usa AES-GCM real (no Base64)

**Para migrar**:
1. Despliega `schema-v2-secure.sql` en Supabase
2. Los usuarios existentes deben reconectar (el token se regenera)
3. Datos cifrados con v1 se descifran automáticamente

## 📜 Licencia

MIT
