import { requireClient } from "./client";

export async function ensureProfile(role = "retail", existingUser = null) {
  const client = requireClient();
  let user = existingUser;

  if (!user) {
    const { data, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    user = data.user;
  }

  if (!user) return null;

  const normalizedRole = ["admin", "sales", "marketing"].includes(role)
    ? role
    : "retail";

  const { error } = await client.rpc("ensure_profile", {
    p_full_name: null,
    p_role: normalizedRole,
    p_language: "en",
  });

  if (!error) {
    return fetchCurrentProfile(user);
  }

  if (
    error.code !== "PGRST202" &&
    !error.message?.includes("Could not find the function")
  ) {
    throw error;
  }

  const profilePayload = {
    id: user.id,
    email: user.email ?? "",
    full_name:
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Staff user",
    role: normalizedRole,
    preferred_language: "en",
    last_seen_at: new Date().toISOString(),
  };

  const existingProfile = await client
    .from("profiles")
    .select("id, email, full_name, role, is_blocked, preferred_language, last_seen_at")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile.error) {
    throw existingProfile.error;
  }

  if (existingProfile.data) {
    const { data, error: updateError } = await client
      .from("profiles")
      .update({
        email: profilePayload.email,
        full_name: existingProfile.data.full_name ?? profilePayload.full_name,
        preferred_language: existingProfile.data.preferred_language ?? "en",
        last_seen_at: profilePayload.last_seen_at,
      })
      .eq("id", user.id)
      .select("id, email, full_name, role, is_blocked, preferred_language, last_seen_at")
      .single();
    if (updateError) throw updateError;
    return data;
  }

  const { data, error: insertError } = await client
    .from("profiles")
    .insert(profilePayload)
    .select("id, email, full_name, role, is_blocked, preferred_language, last_seen_at")
    .single();
  if (insertError) throw insertError;
  return data;
}

export async function fetchCurrentProfile(existingUser = null) {
  const client = requireClient();
  let user = existingUser;

  if (!user) {
    const { data, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    user = data.user;
  }

  if (!user) return null;

  const { data, error } = await client
    .from("profiles")
    .select("id, email, full_name, role, is_blocked, preferred_language, last_seen_at, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCurrentProfile(patch) {
  const client = requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  const { data, error } = await client
    .from("profiles")
    .update(patch)
    .eq("id", user?.id)
    .select("id, email, full_name, role, is_blocked, preferred_language, last_seen_at, avatar_url")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchUsers() {
  const withRetry = (await import("./client.js")).withRetry;
  return withRetry(async () => {
    const client = requireClient();

    const [profilesRes, ordersRes] = await Promise.all([
      client.from("profiles").select("*").is("deleted_at", null).limit(1000),
      client.from("orders").select("user_id, total_amount").limit(500),
    ]);
    if (profilesRes.error) throw profilesRes.error;

    let providerByUser = {};
    try {
      const { data: authData, error: rpcError } = await client.rpc("get_auth_users", {});
      if (rpcError) {
        console.warn("get_auth_users RPC error:", rpcError);
      } else if (authData) {
        providerByUser = authData.reduce((acc, u) => {
          const appProvider = u?.app_metadata?.provider;
          const identityProvider = u?.identities?.[0]?.provider;
          acc[u.id] = appProvider || identityProvider || "email";
          return acc;
        }, {});
      }
    } catch (e) {
      console.warn("get_auth_users RPC failed:", e);
    }

    const ordersByUser = (ordersRes.data ?? []).reduce((acc, order) => {
      const userId = order.user_id;
      if (!acc[userId]) acc[userId] = { count: 0, total: 0 };
      acc[userId].count += 1;
      acc[userId].total += Number(order.total_amount ?? 0);
      return acc;
    }, {});

    return (profilesRes.data ?? []).map((user) => ({
      ...user,
      orders: ordersByUser[user.id]?.count ?? 0,
      totalSpend: ordersByUser[user.id]?.total ?? 0,
      status: user.is_blocked ? "Blocked" : "Active",
      provider: providerByUser[user.id] ?? "email",
    }));
  });
}

export async function updateUser(id, patch) {
  const client = requireClient();

  // Validate role changes if role is in patch
  if (patch.role !== undefined) {
    const { data: currentUser } = await client
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single();

    if (currentUser) {
      const currentRole = currentUser.role;
      const newRole = patch.role;
      const staffRoles = ['admin', 'sales', 'marketing'];
      const userRoles = ['retail', 'wholesale'];

      const wasStaff = staffRoles.includes(currentRole);
      const isNowStaff = staffRoles.includes(newRole);
      const wasUser = userRoles.includes(currentRole);
      const isNowUser = userRoles.includes(newRole);

      // Prevent staff ↔ user role changes
      if (wasStaff && isNowUser) {
        throw new Error("Cannot change staff role to user role (retail/wholesale)");
      }
      if (wasUser && isNowStaff) {
        throw new Error("Cannot change user role to staff role (admin/sales/marketing)");
      }
    }
  }

  const { data, error } = await client
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUser(id) {
  const client = requireClient();

  // Check admin status first
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    throw new Error("Not authenticated. Please sign in again.");
  }

  const { data: currentProfile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error("Failed to verify admin status");
  }

  if (currentProfile.role !== "admin") {
    throw new Error("Insufficient permissions - admin role required");
  }

  // Soft delete: set deleted_at timestamp (moves to trash)
  const { error: profileDeleteError } = await client
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (profileDeleteError) throw profileDeleteError;
}

export async function permanentlyDeleteUser(id) {
  const client = requireClient();

  // Check admin status first
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    throw new Error("Not authenticated. Please sign in again.");
  }

  const { data: currentProfile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error("Failed to verify admin status");
  }

  if (currentProfile.role !== "admin") {
    throw new Error("Insufficient permissions - admin role required");
  }

  // Call edge function to permanently delete from auth and all data
  const { error } = await client.functions.invoke('permanent-delete-user', {
    body: { user_id: id },
  });

  if (error) {
    const msg = error.message?.toLowerCase() || '';
    // Handle specific edge function errors
    if (msg.includes('non-2xx') || msg.includes('non 2xx') || msg.includes('status code') || msg.includes('not found') || msg.includes('404')) {
      throw new Error("Permanent delete service is not available. Please contact administrator.");
    }
    if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('403')) {
      throw new Error("Insufficient permissions to permanently delete user.");
    }
    // Generic fallback - don't expose internal error details
    throw new Error("Failed to permanently delete user. Please try again.");
  }
}

export async function restoreUser(id) {
  const client = requireClient();

  // Check admin status first
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    throw new Error("Not authenticated. Please sign in again.");
  }

  const { data: currentProfile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error("Failed to verify admin status");
  }

  if (currentProfile.role !== "admin") {
    throw new Error("Insufficient permissions - admin role required");
  }

  // Restore: set deleted_at to null
  const { error: restoreError } = await client
    .from("profiles")
    .update({ deleted_at: null })
    .eq("id", id);
  if (restoreError) throw restoreError;
}

export async function fetchDeletedUsers() {
  const withRetry = (await import("./client.js")).withRetry;
  return withRetry(async () => {
    const client = requireClient();
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
}

export async function createUser(email, password, fullName, role) {
  const client = requireClient();

  if (!email || !password || !role) {
    throw new Error("Email, password, and role are required");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }

  // Email must start with a letter before @
  const emailPrefix = email.split('@')[0];
  if (!/^[a-zA-Z]/.test(emailPrefix)) {
    throw new Error("Email must start with a letter");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  if (!fullName || !fullName.trim()) {
    throw new Error("Full name is required");
  }

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    throw new Error("Not authenticated. Please sign in again.");
  }

  const { data: currentProfile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error("Failed to verify admin status");
  }

  if (currentProfile.role !== "admin") {
    throw new Error("Insufficient permissions - admin role required");
  }

  // Validate role: only staff roles allowed for admin-created users
  const staffRoles = ['admin', 'sales', 'marketing'];
  if (!staffRoles.includes(role)) {
    throw new Error("Invalid role. Admin can only create staff accounts (admin, sales, marketing)");
  }

  // Try edge function first, fall back to direct creation
  try {
    const { data, error } = await client.functions.invoke('create-user', {
      body: {
        email: email.trim(),
        password: password,
        full_name: fullName.trim(),
        role: role,
        user_id: user.id,
      },
    });

    // Handle new response format: { success: true/false, error: "...", message: "...", user: {...} }
    if (error) {
      throw new Error(error.message || "Failed to create user");
    }
    
    if (data?.success === false) {
      // Handle specific error messages from edge function
      if (data.error?.includes('already registered') || data.error?.includes('duplicate') || data.error?.includes('already exists') || data.error?.includes('email already exists')) {
        throw new Error("Email already exists. Please use a different email.");
      }
      if (data.error?.includes('weak password') || data.error?.includes('password is too weak')) {
        throw new Error("Password is too weak. Please use a stronger password.");
      }
      if (data.error?.includes('invalid email') || data.error?.includes('email format')) {
        throw new Error("Invalid email format. Please enter a valid email address.");
      }
      throw new Error(data.error || "Failed to create user");
    }
    
    if (data?.success === true) {
      return data;
    }
  } catch (err) {
    // Handle known user-friendly errors
    if (err.message?.includes("Email already exists")) throw err;
    if (err.message?.includes("Full name is required")) throw err;
    if (err.message?.includes("Invalid email")) throw err;
    if (err.message?.includes("Password must be at least")) throw err;
    if (err.message?.includes("Password is too weak")) throw err;
    if (err.message?.includes("Edge Function")) throw err;
    // Handle generic "non-2xx status code" from edge function
    if (err.message?.includes("non-2xx") || err.message?.includes("non 2xx") || err.message?.includes("status code")) {
      throw new Error("Failed to create user. Please try again.");
    }
    
    // For any other errors (including internal edge function errors), show generic message
    // Don't expose internal error details to the user
    console.error('Create user error (hidden from user):', err);
    throw new Error("Failed to create user. Please try again.");
  }

  // Fallback: create user directly via admin API (requires service role)
  // This won't work from client-side without service role key, so show helpful error
  throw new Error("User creation service is temporarily unavailable. Please try again later.");
}

export async function resetUserPassword(userId, newPassword) {
  const client = requireClient();

  // Check if current user is admin
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    throw new Error("Not authenticated. Please sign in again.");
  }

  // Get current user's profile to verify admin role
  const { data: currentProfile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error("Failed to verify admin status");
  }

  if (currentProfile.role !== "admin") {
    throw new Error("Insufficient permissions - admin role required");
  }

  // Validate password length
  if (newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  // Call Edge Function to reset password
  try {
    const { data, error } = await client.functions.invoke('reset-user-password', {
      body: {
        user_id: userId,
        new_password: newPassword,
      },
    });

    if (error) {
      if (error.message?.includes("Failed to send") || error.status === 404) {
        throw new Error("Password reset service is temporarily unavailable. Please try again later.");
      }
      throw new Error("Failed to reset password. Please try again.");
    }

    return data;
  } catch (err) {
    if (err.message?.includes("Edge Function")) {
      throw err;
    }
    console.error('Reset password error (hidden from user):', err);
    throw new Error("Failed to reset password. Please try again.");
  }
}
