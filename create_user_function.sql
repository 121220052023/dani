-- Create a function to allow admins to create new users
-- This function uses SECURITY DEFINER to run with elevated privileges
-- It checks that the calling user is an admin before creating the new user

-- First, ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a function to create a user in auth.users and profiles
-- Note: This function requires the service_role_key to work properly
CREATE OR REPLACE FUNCTION create_user(
  p_email TEXT,
  p_password TEXT,
  p_created_by UUID,
  p_full_name TEXT DEFAULT '',
  p_role TEXT DEFAULT 'retail'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_new_user_id UUID;
  v_encrypted_password TEXT;
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

  -- Validate password length
  IF LENGTH(p_password) < 6 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Password must be at least 6 characters'
    );
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'sales', 'marketing', 'wholesale', 'retail') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role'
    );
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User with this email already exists'
    );
  END IF;

  -- Generate a new UUID for the user
  v_new_user_id := gen_random_uuid();

  -- Encrypt the password using bcrypt (this is a simplified version)
  -- In production, you should use the auth.users table's built-in password handling
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  -- Insert the new user into auth.users
  -- Note: This requires the function to run with elevated privileges
  BEGIN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      last_sign_in_at,
      raw_app_meta_data,
      is_super_admin,
      role,
      aud
    ) VALUES (
      v_new_user_id,
      (SELECT instance_id FROM auth.users LIMIT 1),
      p_email,
      v_encrypted_password,
      NOW(),
      jsonb_build_object('full_name', p_full_name),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      false,
      'authenticated',
      'authenticated'
    );

    RAISE NOTICE 'Successfully inserted user into auth.users: %', v_new_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Failed to insert into auth.users: %', SQLERRM;
      RETURN json_build_object(
        'success', false,
        'error', 'Failed to create user in auth.users: ' || SQLERRM
      );
  END;

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
      v_new_user_id,
      p_email,
      p_full_name,
      p_role,
      'en',
      false
    );

    RAISE NOTICE 'Successfully inserted user into profiles: %', v_new_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Failed to insert into profiles: %', SQLERRM;
      -- Rollback the auth.users insertion since we couldn't create the profile
      DELETE FROM auth.users WHERE id = v_new_user_id;
      RETURN json_build_object(
        'success', false,
        'error', 'Failed to create user profile: ' || SQLERRM
      );
  END;

  -- Return success
  RAISE NOTICE 'User creation completed successfully: %', v_new_user_id;
  RETURN json_build_object(
    'success', true,
    'message', 'User created successfully',
    'user', json_build_object(
      'id', v_new_user_id,
      'email', p_email,
      'role', p_role
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Unexpected error in create_user: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Unexpected error: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user TO authenticated;

-- Grant necessary permissions on auth.users
-- Note: This requires the service role to execute
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT, INSERT ON auth.users TO authenticated;
