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
  is_favorite BOOLEAN DEFAULT FALSE,
  speed REAL DEFAULT 1.0,
  pitch REAL DEFAULT 0.0,
  volume REAL DEFAULT 100.0,
  style TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
