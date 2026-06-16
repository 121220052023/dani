-- RPC function to fetch auth users with provider info (for admin dashboard)
-- Only accessible by admin users
CREATE OR REPLACE FUNCTION public.get_auth_users()
RETURNS TABLE(id uuid, email text, app_metadata jsonb, identities jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions - admin role required';
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    au.email::text,
    au.raw_app_meta_data as app_metadata,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('provider', ui.provider, 'id', ui.id))
       FROM auth.identities ui WHERE ui.user_id = au.id),
      '[]'::jsonb
    ) as identities
  FROM auth.users au
  ORDER BY au.created_at DESC
  LIMIT 1000;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_users() TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
