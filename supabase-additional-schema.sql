-- Add user_addresses table for mobile app address management
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  street TEXT NOT NULL,
  building TEXT NOT NULL,
  notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance on user_addresses
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON public.user_addresses(is_default);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_default ON public.user_addresses(user_id, is_default);

-- Update existing profiles table comment to include user_addresses
COMMENT ON TABLE public.user_addresses IS 'User address book with support for default addresses and labels (Home, Work, etc.)';

-- Add missing column comments to profiles table
COMMENT ON COLUMN public.profiles.full_name IS 'User full name for personalization';