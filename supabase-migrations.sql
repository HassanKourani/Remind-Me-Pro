-- RemindMe Pro Supabase Database Setup
-- Run this SQL in the Supabase SQL Editor (https://tmljrpanccyhibybudln.supabase.co)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users/Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#0ea5e9',
  icon TEXT DEFAULT 'tag',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved places table
CREATE TABLE IF NOT EXISTS public.saved_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  icon TEXT DEFAULT 'map-pin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  type TEXT NOT NULL CHECK(type IN ('time', 'location')),

  -- Time-based fields
  trigger_at TIMESTAMPTZ,
  recurrence_rule TEXT,
  next_trigger_at TIMESTAMPTZ,

  -- Location-based fields
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  radius INTEGER DEFAULT 200,
  location_name TEXT,
  trigger_on TEXT CHECK(trigger_on IN ('enter', 'exit', 'both')),
  is_recurring_location BOOLEAN DEFAULT FALSE,

  -- Delivery options
  delivery_method TEXT DEFAULT 'notification' CHECK(delivery_method IN ('notification', 'alarm', 'share')),
  alarm_sound TEXT,
  share_contact_name TEXT,
  share_contact_phone TEXT,
  share_message_template TEXT,

  -- Organization
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),

  -- Status
  is_completed BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  completed_at TIMESTAMPTZ,

  -- Sync
  is_deleted BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminder history table
CREATE TABLE IF NOT EXISTS public.reminder_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id UUID NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trigger_type TEXT CHECK(trigger_type IN ('scheduled', 'location_enter', 'location_exit', 'manual')),
  delivery_status TEXT CHECK(delivery_status IN ('delivered', 'failed', 'dismissed', 'actioned')),
  action_taken TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_type ON public.reminders(type);
CREATE INDEX IF NOT EXISTS idx_reminders_trigger_at ON public.reminders(trigger_at);
CREATE INDEX IF NOT EXISTS idx_reminders_is_active ON public.reminders(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_places_user_id ON public.saved_places(user_id);

-- Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories policies
CREATE POLICY "Users can manage own categories" ON public.categories
  FOR ALL USING (auth.uid() = user_id);

-- Saved places policies
CREATE POLICY "Users can manage own places" ON public.saved_places
  FOR ALL USING (auth.uid() = user_id);

-- Reminders policies
CREATE POLICY "Users can manage own reminders" ON public.reminders
  FOR ALL USING (auth.uid() = user_id);

-- Reminder history policies
CREATE POLICY "Users can view own reminder history" ON public.reminder_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reminders
      WHERE reminders.id = reminder_history.reminder_id
      AND reminders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own reminder history" ON public.reminder_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reminders
      WHERE reminders.id = reminder_history.reminder_id
      AND reminders.user_id = auth.uid()
    )
  );

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user (drop if exists first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_reminders_updated_at ON public.reminders;
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
