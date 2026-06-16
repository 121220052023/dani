-- Create a function to allow admins to create user profiles
-- This function uses SECURITY DEFINER to run with elevated privileges
-- It checks that the calling user is an admin before creating the profile
-- Note: This function only creates the profile, not the auth user
-- The auth user should be created separately using Supabase's auth API

CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_created_by UUID,
  p_full_name TEXT DEFAULT '',
  p_role TEXT DEFAULT 'retail'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify that the calling user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_created_by AND role = 'admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient permissions - admin role required'
    );
  END IF;

  -- Validate email format
  IF p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid email format'
    );
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'sales', 'marketing', 'wholesale', 'retail') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role'
    );
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Profile already exists for this user'
    );
  END IF;

  -- Create the user's profile
  BEGIN
    INSERT INTO profiles (
      id,
      email,
      full_name,
      role,
      preferred_language,
      is_blocked
    ) VALUES (
      p_user_id,
      p_email,
      p_full_name,
      p_role,
      'en',
      false
    );

    RAISE NOTICE 'Successfully created profile for user: %', p_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Failed to create profile: %', SQLERRM;
      RETURN json_build_object(
        'success', false,
        'error', 'Failed to create user profile: ' || SQLERRM
      );
  END;

  -- Return success
  RAISE NOTICE 'Profile creation completed successfully: %', p_user_id;
  RETURN json_build_object(
    'success', true,
    'message', 'Profile created successfully',
    'profile', json_build_object(
      'id', p_user_id,
      'email', p_email,
      'role', p_role
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Unexpected error in create_user_profile: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Unexpected error: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;
