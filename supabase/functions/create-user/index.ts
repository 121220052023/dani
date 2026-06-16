import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log environment variables for debugging
    console.log('SUPABASE_URL:', Deno.env.get('SUPABASE_URL'))
    console.log('SUPABASE_ANON_KEY:', Deno.env.get('SUPABASE_ANON_KEY') ? 'exists' : 'missing')
    console.log('ANON_KEY:', Deno.env.get('ANON_KEY') ? 'exists' : 'missing')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'exists' : 'missing')
    console.log('SERVICE_ROLE_KEY:', Deno.env.get('SERVICE_ROLE_KEY') ? 'exists' : 'missing')

    // Create Supabase client with anon key for token verification
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('ANON_KEY') ?? ''
    )

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, full_name, role, user_id } = await req.json()

    // Validate required fields
    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and role are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if current user is admin
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header:', authHeader ? 'exists' : 'missing')

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - no authorization header. Please sign in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()
    console.log('Token:', token ? token.substring(0, 20) + '...' : 'empty')
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - empty token. Please sign in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the requesting user's token using admin client
    // This handles both ES256 and RS256 JWT algorithms
    let user;
    try {
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)

      if (userError) {
        console.error('Token verification error with admin client:', userError)
        console.error('Token was:', token.substring(0, 20) + '...')
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token. Please sign in again.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      user = userData.user
    } catch (error) {
      console.error('Unexpected error during token verification:', error)
      return new Response(
        JSON.stringify({ error: 'Token verification failed. Please sign in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token - no user found. Please sign in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if the requesting user has admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions - admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the new user with admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      user_metadata: { full_name: full_name?.trim() ?? '' },
      email_confirm: true
    })

    if (authError) {
      console.error('User creation error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user - no user returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create profile for the new user
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email.trim(),
        full_name: full_name?.trim() ?? '',
        role: role,
        preferred_language: 'en',
        is_blocked: false
      })

    if (profileInsertError) {
      console.error('Profile creation error:', profileInsertError)
      
      // Try to delete the auth user if profile creation failed
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      } catch (deleteError) {
        console.error('Failed to rollback user creation:', deleteError)
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile: ' + profileInsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        message: 'User created successfully', 
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role: role
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
