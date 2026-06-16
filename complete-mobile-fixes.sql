-- ============================================================================
-- MOBILE APP ADDRESS DETAILS PAGE - COMPLETE DATABASE FIXES
-- Run this single file to apply all necessary changes
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING user_addresses TABLE (Critical - Required for mobile app)
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON public.user_addresses(is_default);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_default ON public.user_addresses(user_id, is_default);

COMMENT ON TABLE public.user_addresses IS 'User address book with support for default addresses and labels (Home, Work, etc.)';
COMMENT ON COLUMN public.profiles.full_name IS 'User full name for personalization';

-- ============================================================================
-- 2. ENHANCED ADDRESS FUNCTIONS (Mobile App Fixes)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_address(
  p_id UUID,
  p_label TEXT,
  p_full_name TEXT,
  p_phone TEXT,
  p_city TEXT,
  p_street TEXT,
  p_building TEXT,
  p_notes TEXT,
  p_is_default BOOLEAN
) RETURNS public.user_addresses AS $$
DECLARE
  v_user_id UUID;
  v_address public.user_addresses;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Prevent update if address doesn't belong to user
  PERFORM 1 FROM public.user_addresses 
  WHERE id = p_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Address not found or access denied';
  END IF;
  
  -- Set all other addresses to not default if this is default
  IF p_is_default THEN
    UPDATE public.user_addresses
    SET is_default = false
    WHERE user_id = v_user_id
    AND id != p_id;
  END IF;
  
  UPDATE public.user_addresses
    SET label = p_label,
        full_name = p_full_name,
        phone = p_phone,
        city = p_city,
        street = p_street,
        building = p_building,
        notes = p_notes,
        is_default = p_is_default
    WHERE id = p_id
    AND user_id = v_user_id
    RETURNING * INTO v_address;
  
  RETURN v_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_default_address_safe() 
RETURNS public.user_addresses AS $$
DECLARE
  v_user_id UUID;
  v_address public.user_addresses;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT * INTO v_address
  FROM public.user_addresses
  WHERE user_id = v_user_id
  AND is_default = true
  LIMIT 1;
  
  RETURN v_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. ADDRESS DETAILS PAGE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_address_details(
  p_address_id UUID
) RETURNS TABLE (
  id UUID,
  label TEXT,
  full_name TEXT,
  phone TEXT,
  city TEXT,
  street TEXT,
  building TEXT,
  notes TEXT,
  is_default BOOLEAN,
  created_at TIMESTAMPTZ,
  user_id UUID,
  can_edit BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    ua.id,
    ua.label,
    ua.full_name,
    ua.phone,
    ua.city,
    ua.street,
    ua.building,
    ua.notes,
    ua.is_default,
    ua.created_at,
    ua.user_id,
    (ua.user_id = v_user_id OR v_user_id IS NOT NULL) AS can_edit
  FROM public.user_addresses ua
  WHERE ua.id = p_address_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_all_user_addresses() 
RETURNS TABLE (
  id UUID,
  label TEXT,
  full_name TEXT,
  phone TEXT,
  city TEXT,
  street TEXT,
  building TEXT,
  notes TEXT,
  is_default BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.id,
    ua.label,
    ua.full_name,
    ua.phone,
    ua.city,
    ua.street,
    ua.building,
    ua.notes,
    ua.is_default,
    ua.created_at
  FROM public.user_addresses ua
  WHERE ua.user_id = auth.uid()
  ORDER BY ua.is_default DESC, ua.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_delete_address(p_address_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_default BOOLEAN;
  v_user_id UUID;
  v_address_count INTEGER;
BEGIN
  SELECT is_default, user_id INTO v_is_default, v_user_id
  FROM public.user_addresses
  WHERE id = p_address_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Cannot delete default address
  IF v_is_default THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has other addresses
  SELECT COUNT(*) INTO v_address_count
  FROM public.user_addresses
  WHERE user_id = v_user_id;
  
  -- If only one address, cannot delete it
  IF v_address_count <= 1 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. ENHANCED MOBILE FUNCTIONS (Additional Improvements)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_profile_safe()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  preferred_language TEXT,
  is_wholesale BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.preferred_language,
    (p.role = 'wholesale') AS is_wholesale
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_user_addresses_updated_at
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. ADD SUPPORTING INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_addresses_full_text ON public.user_addresses 
  USING gin (to_tsvector('english', label || ' ' || city || ' ' || street));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- Migration Notes:
-- ============================================================================
-- 1. Run this file once to set up all mobile app address functionality
-- 2. The user_addresses table is critical - do not drop it
-- 3. All functions are SECURITY DEFINER to work with RLS
-- 4. Indexes ensure good performance for mobile app queries
-- ============================================================================