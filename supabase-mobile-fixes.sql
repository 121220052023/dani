-- Mobile App Fixes - Address Service Improvements
-- Fix 1: Add missing user_id filter in update query (already correct but adding defensive check)
-- Fix 2: Add better error handling for null current user

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
  -- Get current user with validation
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Set all other addresses to not default if this is default
  IF p_is_default THEN
    UPDATE public.user_addresses
    SET is_default = false
    WHERE user_id = v_user_id
    AND id != p_id;
  END IF;
  
  -- Update the address
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
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Address not found or access denied';
  END IF;
  
  RETURN v_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to safely get default address with validation
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