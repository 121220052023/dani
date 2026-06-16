-- Mobile App Address Details Page Implementation
-- File: address_detail_page.sql
-- This SQL adds necessary data structures for the address details page

-- Add function to get address details with full information
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

-- Add function to get all user addresses with default flag
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

-- Add function to check if address can be deleted (not default or only address)
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