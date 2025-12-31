-- ==============================================
-- ESQUEMA DE BASE DE DATOS PARA ESPEJO
-- Sincronización E2E Cifrada con Supabase
-- ==============================================
-- 
-- IMPORTANTE: El servidor NUNCA ve datos descifrados.
-- Solo almacena blobs cifrados que solo el usuario puede descifrar.
--
-- Ejecutar este SQL en el SQL Editor de Supabase Dashboard
-- ==============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- TABLA: sync_users
-- Usuarios registrados para sincronización
-- ==============================================
CREATE TABLE IF NOT EXISTS sync_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_hash TEXT UNIQUE NOT NULL,           -- Hash del email (el servidor no conoce el email real)
  verification_token TEXT NOT NULL,          -- Hash del hash de contraseña (para verificar)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  
  -- Índices
  CONSTRAINT user_hash_length CHECK (char_length(user_hash) >= 32)
);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_sync_users_hash ON sync_users(user_hash);

-- ==============================================
-- TABLA: sync_devices
-- Dispositivos asociados a cada usuario
-- ==============================================
CREATE TABLE IF NOT EXISTS sync_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES sync_users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_devices_user ON sync_devices(user_id);

-- ==============================================
-- TABLA: encrypted_entries
-- Entradas de diario CIFRADAS
-- El contenido es un blob opaco para el servidor
-- ==============================================
CREATE TABLE IF NOT EXISTS encrypted_entries (
  id UUID PRIMARY KEY,                       -- ID original de la entrada
  user_id UUID REFERENCES sync_users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,                  -- Fecha de la entrada (no sensible)
  encrypted_data JSONB NOT NULL,             -- { ciphertext, iv, salt, version }
  updated_at BIGINT NOT NULL,                -- Timestamp para resolución de conflictos
  deleted BOOLEAN DEFAULT FALSE,             -- Soft delete para sincronización
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, id)
);

-- Índices para sincronización eficiente
CREATE INDEX IF NOT EXISTS idx_encrypted_entries_user ON encrypted_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_entries_updated ON encrypted_entries(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_encrypted_entries_date ON encrypted_entries(user_id, entry_date);

-- ==============================================
-- TABLA: encrypted_reviews
-- Revisiones semanales/mensuales CIFRADAS
-- ==============================================
CREATE TABLE IF NOT EXISTS encrypted_reviews (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES sync_users(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL,                 -- 'weekly' | 'monthly'
  period_start TEXT NOT NULL,                -- 'YYYY-MM-DD' o 'YYYY-MM'
  encrypted_data JSONB NOT NULL,             -- { ciphertext, iv, salt, version }
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_encrypted_reviews_user ON encrypted_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_reviews_updated ON encrypted_reviews(user_id, updated_at);

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- Cada usuario solo puede ver sus propios datos
-- ==============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE sync_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_reviews ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios solo ven su propio registro
-- (Usamos el user_hash del header para identificar)
CREATE POLICY "Users can view own data" ON sync_users
  FOR ALL USING (user_hash = current_setting('app.user_hash', true));

-- Política: Dispositivos del usuario
CREATE POLICY "Users can manage own devices" ON sync_devices
  FOR ALL USING (
    user_id IN (
      SELECT id FROM sync_users WHERE user_hash = current_setting('app.user_hash', true)
    )
  );

-- Política: Entries del usuario
CREATE POLICY "Users can manage own entries" ON encrypted_entries
  FOR ALL USING (
    user_id IN (
      SELECT id FROM sync_users WHERE user_hash = current_setting('app.user_hash', true)
    )
  );

-- Política: Reviews del usuario
CREATE POLICY "Users can manage own reviews" ON encrypted_reviews
  FOR ALL USING (
    user_id IN (
      SELECT id FROM sync_users WHERE user_hash = current_setting('app.user_hash', true)
    )
  );

-- ==============================================
-- FUNCIONES RPC PARA SINCRONIZACIÓN
-- ==============================================

-- Función: Registrar o autenticar usuario
CREATE OR REPLACE FUNCTION register_or_auth_user(
  p_user_hash TEXT,
  p_verification_token TEXT,
  p_device_id TEXT,
  p_device_name TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_is_new BOOLEAN := FALSE;
  v_existing_token TEXT;
BEGIN
  -- Buscar usuario existente
  SELECT id, verification_token INTO v_user_id, v_existing_token
  FROM sync_users
  WHERE user_hash = p_user_hash;
  
  IF v_user_id IS NULL THEN
    -- Crear nuevo usuario
    INSERT INTO sync_users (user_hash, verification_token)
    VALUES (p_user_hash, p_verification_token)
    RETURNING id INTO v_user_id;
    v_is_new := TRUE;
  ELSE
    -- Verificar token
    IF v_existing_token != p_verification_token THEN
      RETURN json_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
    END IF;
  END IF;
  
  -- Registrar/actualizar dispositivo
  INSERT INTO sync_devices (user_id, device_id, device_name, last_seen_at)
  VALUES (v_user_id, p_device_id, p_device_name, NOW())
  ON CONFLICT (user_id, device_id) 
  DO UPDATE SET last_seen_at = NOW(), device_name = COALESCE(p_device_name, sync_devices.device_name);
  
  -- Actualizar último sync
  UPDATE sync_users SET last_sync_at = NOW() WHERE id = v_user_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'is_new', v_is_new
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Sincronizar entries
CREATE OR REPLACE FUNCTION sync_entries(
  p_user_hash TEXT,
  p_entries JSONB,           -- Array de entries a subir
  p_last_sync_at BIGINT      -- Timestamp del último sync del cliente
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_entry JSONB;
  v_updated_entries JSONB := '[]'::JSONB;
  v_pushed INT := 0;
  v_pulled INT := 0;
BEGIN
  -- Obtener user_id
  SELECT id INTO v_user_id FROM sync_users WHERE user_hash = p_user_hash;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;
  
  -- Procesar entries enviados por el cliente
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    INSERT INTO encrypted_entries (id, user_id, entry_date, encrypted_data, updated_at, deleted)
    VALUES (
      (v_entry->>'id')::UUID,
      v_user_id,
      (v_entry->>'date')::DATE,
      v_entry->'data',
      (v_entry->>'updatedAt')::BIGINT,
      COALESCE((v_entry->>'deleted')::BOOLEAN, false)
    )
    ON CONFLICT (user_id, id) 
    DO UPDATE SET 
      encrypted_data = EXCLUDED.encrypted_data,
      updated_at = EXCLUDED.updated_at,
      deleted = EXCLUDED.deleted
    WHERE encrypted_entries.updated_at < EXCLUDED.updated_at;
    
    IF FOUND THEN
      v_pushed := v_pushed + 1;
    END IF;
  END LOOP;
  
  -- Obtener entries modificados desde último sync
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'date', entry_date,
      'data', encrypted_data,
      'updatedAt', updated_at,
      'deleted', deleted
    )
  ) INTO v_updated_entries
  FROM encrypted_entries
  WHERE user_id = v_user_id AND updated_at > p_last_sync_at;
  
  v_pulled := COALESCE(jsonb_array_length(v_updated_entries), 0);
  
  RETURN json_build_object(
    'success', true,
    'pushed', v_pushed,
    'pulled', v_pulled,
    'entries', COALESCE(v_updated_entries, '[]'::JSONB),
    'serverTime', EXTRACT(EPOCH FROM NOW()) * 1000
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Sincronizar reviews
CREATE OR REPLACE FUNCTION sync_reviews(
  p_user_hash TEXT,
  p_reviews JSONB,
  p_last_sync_at BIGINT
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_review JSONB;
  v_updated_reviews JSONB := '[]'::JSONB;
  v_pushed INT := 0;
  v_pulled INT := 0;
BEGIN
  SELECT id INTO v_user_id FROM sync_users WHERE user_hash = p_user_hash;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;
  
  FOR v_review IN SELECT * FROM jsonb_array_elements(p_reviews)
  LOOP
    INSERT INTO encrypted_reviews (id, user_id, review_type, period_start, encrypted_data, updated_at, deleted)
    VALUES (
      (v_review->>'id')::UUID,
      v_user_id,
      v_review->>'type',
      v_review->>'periodStart',
      v_review->'data',
      (v_review->>'updatedAt')::BIGINT,
      COALESCE((v_review->>'deleted')::BOOLEAN, false)
    )
    ON CONFLICT (user_id, id) 
    DO UPDATE SET 
      encrypted_data = EXCLUDED.encrypted_data,
      updated_at = EXCLUDED.updated_at,
      deleted = EXCLUDED.deleted
    WHERE encrypted_reviews.updated_at < EXCLUDED.updated_at;
    
    IF FOUND THEN
      v_pushed := v_pushed + 1;
    END IF;
  END LOOP;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', review_type,
      'periodStart', period_start,
      'data', encrypted_data,
      'updatedAt', updated_at,
      'deleted', deleted
    )
  ) INTO v_updated_reviews
  FROM encrypted_reviews
  WHERE user_id = v_user_id AND updated_at > p_last_sync_at;
  
  v_pulled := COALESCE(jsonb_array_length(v_updated_reviews), 0);
  
  RETURN json_build_object(
    'success', true,
    'pushed', v_pushed,
    'pulled', v_pulled,
    'reviews', COALESCE(v_updated_reviews, '[]'::JSONB),
    'serverTime', EXTRACT(EPOCH FROM NOW()) * 1000
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Sync rápido de una sola entrada
CREATE OR REPLACE FUNCTION sync_single_entry(
  p_user_hash TEXT,
  p_entry JSONB
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM sync_users WHERE user_hash = p_user_hash;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;
  
  INSERT INTO encrypted_entries (id, user_id, entry_date, encrypted_data, updated_at, deleted)
  VALUES (
    (p_entry->>'id')::UUID,
    v_user_id,
    (p_entry->>'date')::DATE,
    p_entry->'data',
    (p_entry->>'updatedAt')::BIGINT,
    COALESCE((p_entry->>'deleted')::BOOLEAN, false)
  )
  ON CONFLICT (user_id, id) 
  DO UPDATE SET 
    encrypted_data = EXCLUDED.encrypted_data,
    updated_at = EXCLUDED.updated_at,
    deleted = EXCLUDED.deleted
  WHERE encrypted_entries.updated_at < EXCLUDED.updated_at;
  
  RETURN json_build_object('success', true, 'synced', FOUND);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- GRANT PERMISOS PARA ANON (cliente público)
-- ==============================================
GRANT EXECUTE ON FUNCTION register_or_auth_user TO anon;
GRANT EXECUTE ON FUNCTION sync_entries TO anon;
GRANT EXECUTE ON FUNCTION sync_reviews TO anon;
GRANT EXECUTE ON FUNCTION sync_single_entry TO anon;

-- ==============================================
-- COMENTARIOS
-- ==============================================
COMMENT ON TABLE sync_users IS 'Usuarios registrados para sync. user_hash es un hash del email.';
COMMENT ON TABLE encrypted_entries IS 'Entradas de diario cifradas E2E. El servidor no puede descifrar.';
COMMENT ON TABLE encrypted_reviews IS 'Revisiones semanales/mensuales cifradas E2E.';
COMMENT ON FUNCTION register_or_auth_user IS 'Registra nuevo usuario o verifica credenciales existentes.';
COMMENT ON FUNCTION sync_entries IS 'Sincronización bidireccional de entries cifrados.';
COMMENT ON FUNCTION sync_reviews IS 'Sincronización bidireccional de reviews cifrados.';
