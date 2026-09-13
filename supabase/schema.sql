-- ==========================================
-- TextFlow Supabase PostgreSQL Database Schema
-- ==========================================

-- 1. PROFILES TABLE
-- Linked directly to auth.users for user details
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies (Users can only access/edit their own profile)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- 2. AUTOMATIC PROFILE CREATION TRIGGER
-- Automatically creates a public.profiles record when a user signs up via auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. SPEECH HISTORY TABLE
-- Stores synthesized speech records per authenticated user
CREATE TABLE IF NOT EXISTS public.speech_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  language TEXT NOT NULL,
  voice TEXT NOT NULL,
  audio_url TEXT NULL,
  audio_storage_path TEXT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  speed REAL DEFAULT 1.0,
  pitch REAL DEFAULT 0.0,
  volume REAL DEFAULT 100.0,
  style TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe migration: ensure audio_storage_path column exists if table was already created
ALTER TABLE public.speech_history
ADD COLUMN IF NOT EXISTS audio_storage_path TEXT;

-- Enable Row Level Security on Speech History
ALTER TABLE public.speech_history ENABLE ROW LEVEL SECURITY;

-- Speech History RLS Policies (Strict ownership: auth.uid() = user_id)
DROP POLICY IF EXISTS "Users can view own speech history" ON public.speech_history;
CREATE POLICY "Users can view own speech history"
  ON public.speech_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own speech history" ON public.speech_history;
CREATE POLICY "Users can insert own speech history"
  ON public.speech_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own speech history" ON public.speech_history;
CREATE POLICY "Users can update own speech history"
  ON public.speech_history FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own speech history" ON public.speech_history;
CREATE POLICY "Users can delete own speech history"
  ON public.speech_history FOR DELETE
  USING (auth.uid() = user_id);


-- 4. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_speech_history_user_id ON public.speech_history(user_id);
CREATE INDEX IF NOT EXISTS idx_speech_history_user_fav ON public.speech_history(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_speech_history_created_at ON public.speech_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_speech_history_storage_path ON public.speech_history(audio_storage_path);


-- ===================================================
-- 5. SUPABASE STORAGE SETUP (textflow-audio Private Bucket)
-- ===================================================

-- Create private bucket 'textflow-audio' (never public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'textflow-audio',
  'textflow-audio',
  false,
  26214400, -- 25 MB max
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-wav'];

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage RLS Policies for textflow-audio
-- Enforces strict user folder ownership: audio/{auth.uid()}/...

-- SELECT: Authenticated users can only read objects inside their own folder
DROP POLICY IF EXISTS "Authenticated users can select own audio objects" ON storage.objects;
CREATE POLICY "Authenticated users can select own audio objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'textflow-audio'
    AND (
      name LIKE 'audio/' || auth.uid()::text || '/%'
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- INSERT: Authenticated users can only upload into their own user folder
DROP POLICY IF EXISTS "Authenticated users can upload own audio objects" ON storage.objects;
CREATE POLICY "Authenticated users can upload own audio objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'textflow-audio'
    AND (
      name LIKE 'audio/' || auth.uid()::text || '/%'
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- UPDATE: Authenticated users can only update objects in their own folder
DROP POLICY IF EXISTS "Authenticated users can update own audio objects" ON storage.objects;
CREATE POLICY "Authenticated users can update own audio objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'textflow-audio'
    AND (
      name LIKE 'audio/' || auth.uid()::text || '/%'
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- DELETE: Authenticated users can only delete objects in their own folder
DROP POLICY IF EXISTS "Authenticated users can delete own audio objects" ON storage.objects;
CREATE POLICY "Authenticated users can delete own audio objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'textflow-audio'
    AND (
      name LIKE 'audio/' || auth.uid()::text || '/%'
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );


-- ===================================================
-- 6. USAGE RECORDS & ATOMIC APPLICATION LIMIT ENFORCEMENT
-- ===================================================

CREATE TABLE IF NOT EXISTS public.usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  tts_generations INTEGER NOT NULL DEFAULT 0,
  tts_characters BIGINT NOT NULL DEFAULT 0,
  ai_enhancements INTEGER NOT NULL DEFAULT 0,
  audio_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_usage_date UNIQUE (user_id, usage_date)
);

-- Row Level Security for usage_records
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

-- SELECT: Authenticated users can only read their own usage records
DROP POLICY IF EXISTS "Users can view own usage records" ON public.usage_records;
CREATE POLICY "Users can view own usage records"
  ON public.usage_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Explicitly DO NOT grant client INSERT/UPDATE/DELETE.
-- Limits and usage counters are strictly managed server-side via atomic RPCs and service client.

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_usage_records_user_id ON public.usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_usage_date ON public.usage_records(usage_date);
CREATE INDEX IF NOT EXISTS idx_usage_records_user_date ON public.usage_records(user_id, usage_date);

-- Atomic PostgreSQL RPC: Increment TTS Usage
CREATE OR REPLACE FUNCTION public.increment_tts_usage(
  p_user_id UUID,
  p_usage_date DATE,
  p_characters INT,
  p_limit INT,
  p_audio_bytes BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_tts INT := 0;
  v_new_tts INT := 0;
  v_rec RECORD;
BEGIN
  -- Insert default row if not exists with ON CONFLICT DO NOTHING
  INSERT INTO public.usage_records (user_id, usage_date, tts_generations, tts_characters, ai_enhancements, audio_bytes, created_at, updated_at)
  VALUES (p_user_id, p_usage_date, 0, 0, 0, 0, NOW(), NOW())
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  -- Row lock for update to ensure atomic limit comparison
  SELECT tts_generations, tts_characters, ai_enhancements, audio_bytes
  INTO v_rec
  FROM public.usage_records
  WHERE user_id = p_user_id AND usage_date = p_usage_date
  FOR UPDATE;

  v_current_tts := COALESCE(v_rec.tts_generations, 0);

  IF v_current_tts >= p_limit THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'current_tts', v_current_tts,
      'remaining', 0,
      'limit', p_limit
    );
  END IF;

  v_new_tts := v_current_tts + 1;

  UPDATE public.usage_records
  SET
    tts_generations = v_new_tts,
    tts_characters = tts_characters + GREATEST(0, p_characters),
    audio_bytes = GREATEST(0, audio_bytes + COALESCE(p_audio_bytes, 0)),
    updated_at = NOW()
  WHERE user_id = p_user_id AND usage_date = p_usage_date;

  RETURN jsonb_build_object(
    'allowed', TRUE,
    'current_tts', v_new_tts,
    'remaining', GREATEST(0, p_limit - v_new_tts),
    'limit', p_limit
  );
END;
$$;

-- Atomic PostgreSQL RPC: Rollback TTS Usage (if provider fails before synthesis)
CREATE OR REPLACE FUNCTION public.rollback_tts_usage(
  p_user_id UUID,
  p_usage_date DATE,
  p_characters INT,
  p_audio_bytes BIGINT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.usage_records
  SET
    tts_generations = GREATEST(0, tts_generations - 1),
    tts_characters = GREATEST(0, tts_characters - GREATEST(0, p_characters)),
    audio_bytes = GREATEST(0, audio_bytes - COALESCE(p_audio_bytes, 0)),
    updated_at = NOW()
  WHERE user_id = p_user_id AND usage_date = p_usage_date;
END;
$$;

-- Atomic PostgreSQL RPC: Increment AI Enhancement Usage
CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_user_id UUID,
  p_usage_date DATE,
  p_limit INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_ai INT := 0;
  v_new_ai INT := 0;
  v_rec RECORD;
BEGIN
  INSERT INTO public.usage_records (user_id, usage_date, tts_generations, tts_characters, ai_enhancements, audio_bytes, created_at, updated_at)
  VALUES (p_user_id, p_usage_date, 0, 0, 0, 0, NOW(), NOW())
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT ai_enhancements
  INTO v_rec
  FROM public.usage_records
  WHERE user_id = p_user_id AND usage_date = p_usage_date
  FOR UPDATE;

  v_current_ai := COALESCE(v_rec.ai_enhancements, 0);

  IF v_current_ai >= p_limit THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'current_ai', v_current_ai,
      'remaining', 0,
      'limit', p_limit
    );
  END IF;

  v_new_ai := v_current_ai + 1;

  UPDATE public.usage_records
  SET
    ai_enhancements = v_new_ai,
    updated_at = NOW()
  WHERE user_id = p_user_id AND usage_date = p_usage_date;

  RETURN jsonb_build_object(
    'allowed', TRUE,
    'current_ai', v_new_ai,
    'remaining', GREATEST(0, p_limit - v_new_ai),
    'limit', p_limit
  );
END;
$$;

-- Atomic PostgreSQL RPC: Rollback AI Enhancement Usage
CREATE OR REPLACE FUNCTION public.rollback_ai_usage(
  p_user_id UUID,
  p_usage_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.usage_records
  SET
    ai_enhancements = GREATEST(0, ai_enhancements - 1),
    updated_at = NOW()
  WHERE user_id = p_user_id AND usage_date = p_usage_date;
END;
$$;

-- Atomic PostgreSQL RPC: Adjust Audio Storage Bytes (add or subtract)
CREATE OR REPLACE FUNCTION public.adjust_audio_bytes(
  p_user_id UUID,
  p_usage_date DATE,
  p_delta_bytes BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.usage_records (user_id, usage_date, tts_generations, tts_characters, ai_enhancements, audio_bytes, created_at, updated_at)
  VALUES (p_user_id, p_usage_date, 0, 0, 0, GREATEST(0, p_delta_bytes), NOW(), NOW())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    audio_bytes = GREATEST(0, public.usage_records.audio_bytes + p_delta_bytes),
    updated_at = NOW();
END;
$$;


