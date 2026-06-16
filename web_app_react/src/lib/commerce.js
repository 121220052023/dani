import { hasSupabaseEnv, supabase } from "./supabase";

const ROLE_LABELS = {
  admin: "Admin",
  sales: "Sales",
  marketing: "Marketing",
};

// Simple request cache to prevent duplicate concurrent requests
const requestCache = new Map();
const CACHE_DURATION = 5000; // 5 seconds

function requireClient() {
  if (!hasSupabaseEnv || !supabase) {
    throw new Error("Supabase environment variables are missing.");
  }
  return supabase;
}

function monthKey(dateValue) {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function monthLabel(dateValue) {
  return new Date(dateValue).toLocaleString("en-US", { month: "short" });
}

function activityStatus(timestamp) {
  if (!timestamp) return "Offline";
  const minutes = (Date.now() - new Date(timestamp).getTime()) / 60000;
  return minutes <= 10 ? "Active" : "Offline";
}

function activityLabel(timestamp) {
  if (!timestamp) return "No recent activity";

  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(timestamp).getTime()) / 60000),
  );

  if (minutes < 1) return "Seen just now";
  if (minutes < 60) return `Seen ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0
    ? `Seen ${hours}h ago`
    : `Seen ${hours}h ${remainingMinutes}m ago`;
}

let lastPresenceTouchAt = 0;

// Utility: Deduplicate concurrent requests
async function dedupedRequest(key, requestFn, duration = CACHE_DURATION) {
  const now = Date.now();
  const cached = requestCache.get(key);

  if (cached && now - cached.timestamp < duration) {
    return cached.promise;
  }

  const promise = requestFn().finally(() => {
    setTimeout(() => requestCache.delete(key), duration);
  });

  requestCache.set(key, { promise, timestamp: now });
  return promise;
}

// Utility: Retry failed requests with exponential backoff
async function withRetry(fn, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Only retry on 5xx errors or network errors
      if (
        error.status >= 500 ||
        error.message?.includes("timeout") ||
        error.code === "504"
      ) {
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

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
    .select("id, email, full_name, role, is_blocked, preferred_language, last_seen_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function touchStaffPresence(force = false) {
  const now = Date.now();
  if (!force && now - lastPresenceTouchAt < 60000) {
    return;
  }

  const client = requireClient();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError) throw authError;
  if (!user) return;

  const { error } = await client
    .from("profiles")
    .update({ last_seen_at: new Date(now).toISOString() })
    .eq("id", user.id);

  if (error) throw error;
  lastPresenceTouchAt = now;
}

// OPTIMIZED: Fetch dashboard data with retry logic and smaller chunks
export async function fetchDashboardData() {
  return withRetry(async () => {
    const client = requireClient();

    // Split into smaller, more focused queries
    const [
      ordersRes,
      productsRes,
      profilesRes,
      currentUserRes,
    ] = await Promise.all([
      client
        .from("orders")
        .select("id, total_amount, status, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(500), // Limit to recent orders
      client
        .from("products")
        .select(
          "id, name, stock, is_best_seller, is_featured, is_hot_deal, category, price, created_at",
        )
        .limit(1000),
      client
        .from("profiles")
        .select("id, email, full_name, role, created_at, last_seen_at")
        .limit(1000),
      client.auth.getUser(),
    ]);

    // Fetch order items separately with limit
    const { data: orderItems, error: itemsError } = await client
      .from("order_items")
      .select("quantity, order_id, product_id, products(name, category)")
      .limit(1000);

    if (itemsError) throw itemsError;

    // Fetch notifications with limit
    const { error: notifError } = await client
      .from("notifications")
      .select("id, title, body, type, created_at")
      .order("created_at", { ascending: false })
      .limit(8);

    if (notifError) throw notifError;

    // Fetch messages with limit
    const { data: messages, error: msgError } = await client
      .from("chat_messages")
      .select(
        "id, sender_type, message, created_at, sender:sender_id(full_name, email)",
      )
      .order("created_at", { ascending: false })
      .limit(12);

    if (msgError) throw msgError;

    // Validate main responses
    for (const result of [ordersRes, productsRes, profilesRes]) {
      if (result.error) throw result.error;
    }

    const orders = ordersRes.data ?? [];
    const products = productsRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const currentUserId = currentUserRes.data?.user?.id ?? null;

    const today = new Date();
    const months = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(
        today.getFullYear(),
        today.getMonth() - (5 - index),
        1,
      );
      return {
        key: monthKey(date),
        name: monthLabel(date),
      };
    });

    const revenueSeries = months.map((month) => {
      const monthlyOrders = orders.filter(
        (order) => monthKey(order.created_at) === month.key,
      );
      return {
        name: month.name,
        revenue: monthlyOrders.reduce(
          (sum, order) => sum + Number(order.total_amount ?? 0),
          0,
        ),
        orders: monthlyOrders.length,
      };
    });

    const bestSellerTotals = (orderItems ?? []).reduce((accumulator, item) => {
      const name = item.products?.name ?? "Unknown product";
      accumulator[name] = (accumulator[name] ?? 0) + Number(item.quantity ?? 0);
      return accumulator;
    }, {});

    const bestSellers = Object.entries(bestSellerTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([name, value]) => ({ name, value }));

    const orderStatuses = orders.reduce((accumulator, order) => {
      accumulator[order.status] = (accumulator[order.status] ?? 0) + 1;
      return accumulator;
    }, {});

    const orderBars = [
      { name: "Preparing", value: orderStatuses.Preparing ?? 0 },
      { name: "Shipped", value: orderStatuses.Shipped ?? 0 },
      { name: "On the way", value: orderStatuses["On the way"] ?? 0 },
      { name: "Delivered", value: orderStatuses.Delivered ?? 0 },
    ];

    const activityFeed = [
      ...orders.slice(0, 2).map((order) => ({
        id: `order-${order.id}`,
        actor:
          profiles.find((p) => p.id === order.user_id)?.full_name ?? "Customer",
        action: `placed order ${order.id}`,
        created_at: order.created_at,
      })),
      ...(messages ?? []).slice(0, 2).map((message) => ({
        id: `message-${message.id}`,
        actor: message.sender?.full_name ?? message.sender_type,
        action: `sent message in chat`,
        created_at: message.created_at,
      })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const employeeTracking = profiles
      .filter((profile) =>
        ["admin", "sales", "marketing"].includes(profile.role),
      )
      .map((profile) => ({
        id: profile.id,
        name: profile.full_name ?? profile.email,
        email: profile.email,
        role: ROLE_LABELS[profile.role] ?? profile.role,
        status:
          profile.id === currentUserId
            ? "Active"
            : activityStatus(profile.last_seen_at ?? profile.created_at),
        screenTime:
          profile.id === currentUserId
            ? "Live now"
            : activityLabel(profile.last_seen_at ?? profile.created_at),
      }));

    return {
      summaryCards: [
        {
          label: "Revenue",
          value: orders.reduce(
            (sum, order) => sum + Number(order.total_amount ?? 0),
            0,
          ),
          meta: "+20.1% from last month",
          tone: "success",
        },
        {
          label: "Orders",
          value: orders.length,
          meta: "+180.1% from last month",
          tone: "primary",
        },
        {
          label: "Users",
          value: profiles.length,
          meta: "+19% from last month",
          tone: "warning",
        },
        {
          label: "Products",
          value: products.length,
          meta: "+201 since last hour",
          tone: "danger",
        },
      ],
      revenueSeries,
      bestSellers,
      orderBars,
      activityFeed,
      employeeTracking,
    };
  });
}

// OPTIMIZED: Products with caching
export async function fetchProducts() {
  return dedupedRequest("products", async () => {
    const client = requireClient();
    const { data, error } = await client
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
}

export async function saveProduct(product) {
  const client = requireClient();

  const tagsValue = (product.tags ?? '')
    ? (typeof product.tags === 'string' && product.tags.trim())
      ? product.tags.split(',').map(t => t.trim()).filter(Boolean)
      : Array.isArray(product.tags)
        ? product.tags
        : []
    : [];

  const payload = {
    ...product,
    tags: tagsValue,
    slug: product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  };

  if (product.id) {
    const { error } = await client
      .from('products')
      .update(payload)
      .eq('id', product.id);
    if (error) throw error;
  } else {
    const { error } = await client.from('products').insert(payload);
    if (error) throw error;
  }
}

export async function deleteProduct(id) {
  const client = requireClient();
  const { error } = await client.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchProductComments() {
  return withRetry(async () => {
    const client = requireClient();
    const { data, error } = await client
      .from("product_comments")
      .select("*, profiles(full_name, email), products(name, image_url)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });
}

export async function fetchProductRatings() {
  return withRetry(async () => {
    const client = requireClient();
    const { data, error } = await client
      .from("product_ratings")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
}

export async function deleteProductComment(id) {
  const client = requireClient();
  const { error } = await client.from("product_comments").delete().eq("id", id);
  if (error) throw error;
}

// OPTIMIZED: Orders with retry
export async function fetchOrders() {
  return withRetry(async () => {
    const client = requireClient();
    const { data, error } = await client
      .from("orders")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });
}

export async function updateOrder(id, patch) {
  const client = requireClient();
  const { data, error } = await client
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// OPTIMIZED: Users with caching and retry
export async function fetchUsers() {
  return withRetry(async () => {
    const client = requireClient();
    const [profilesRes, ordersRes] = await Promise.all([
      client.from("profiles").select("*").limit(1000),
      client.from("orders").select("user_id, total_amount").limit(500),
    ]);
    if (profilesRes.error) throw profilesRes.error;

    const ordersByUser = (ordersRes.data ?? []).reduce((acc, order) => {
      const userId = order.user_id;
      if (!acc[userId]) {
        acc[userId] = { count: 0, total: 0 };
      }
      acc[userId].count += 1;
      acc[userId].total += Number(order.total_amount ?? 0);
      return acc;
    }, {});

    return (profilesRes.data ?? []).map((user) => ({
      ...user,
      orders: ordersByUser[user.id]?.count ?? 0,
      totalSpend: ordersByUser[user.id]?.total ?? 0,
      status: user.is_blocked ? "Blocked" : "Active",
    }));
  });
}

export async function updateUser(id, patch) {
  const client = requireClient();
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
  const { error } = await client.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchWholesaleCodes() {
  return withRetry(async () => {
    const client = requireClient();
    const { data, error } = await client
      .from("wholesale_codes")
      .select(
        "id, code, is_used, redeemed_at, created_at, creator:created_by(full_name, email), redeemer:redeemed_by(full_name, email)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });
}

export async function generateWholesaleCode() {
  const client = requireClient();
  const { data, error } = await client.rpc("generate_wholesale_code");
  if (error) throw error;
  return data;
}

export async function fetchChatThreads() {
  return withRetry(async () => {
    const client = requireClient();
    const { data, error } = await client
      .from("chat_threads")
      .select("*, profiles:user_id(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });
}

export async function fetchMessages(threadId) {
  return withRetry(async () => {
    const client = requireClient();
    const { data, error } = await client
      .from("chat_messages")
      .select("*, sender:sender_id(full_name, email)")
      .eq("thread_id", threadId)
      .order("created_at")
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });
}

export async function sendSalesMessage(threadId, message) {
  const client = requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  const { error } = await client.from("chat_messages").insert({
    thread_id: threadId,
    sender_id: user?.id ?? null,
    sender_type: "sales",
    message,
  });
  if (error) throw error;

  await client
    .from("chat_threads")
    .update({
      assigned_sales_id: user?.id ?? null,
      last_sales_reply_at: new Date().toISOString(),
    })
    .eq("id", threadId);
}

// OPTIMIZED: Notifications with retry
export async function fetchNotifications() {
  return withRetry(async () => {
    const client = requireClient();
    const { data, error } = await client
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data ?? [];
  });
}

export async function markNotificationRead(id) {
  const client = requireClient();
  const { error } = await client
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function clearAllNotifications() {
  const client = requireClient();
  const { data, error: fetchError } = await client
    .from("notifications")
    .select("id")
    .limit(100);
  if (fetchError) throw fetchError;

  const ids = (data ?? []).map((n) => n.id);
  if (ids.length === 0) return;

  const { error } = await client.from("notifications").delete().in("id", ids);
  if (error) throw error;
}

export async function fetchAnalyticsData() {
  const [dashboard, orders, products] = await Promise.all([
    fetchDashboardData(),
    fetchOrders(),
    fetchProducts(),
  ]);

  const ordersByDay = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      day: date.toLocaleString("en-US", { weekday: "short" }),
      orders: orders.filter((order) => order.created_at.slice(0, 10) === key)
        .length,
    };
  });

  const categoryMix = products.reduce((accumulator, product) => {
    accumulator[product.category] = (accumulator[product.category] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    ...dashboard,
    ordersByDay,
    categoryMix: Object.entries(categoryMix).map(([name, value]) => ({
      name,
      value,
    })),
  };
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
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createUser(email, password, fullName, role) {
  const client = requireClient();

  console.log("[createUser] Starting user creation process");

  // Validate input
  if (!email || !password || !role) {
    throw new Error("Email, password, and role are required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }

  // Validate password length
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  // Check if current user is admin
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    console.error("[createUser] Failed to get current user:", userError);
    throw new Error("Not authenticated. Please sign in again.");
  }

  // Get current user's profile to verify admin role
  const { data: currentProfile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[createUser] Failed to get current user profile:", profileError);
    throw new Error("Failed to verify admin status");
  }

  if (currentProfile.role !== "admin") {
    throw new Error("Insufficient permissions - admin role required");
  }

  console.log("[createUser] Creating user via Edge Function");

  // Call the Edge Function to create the user
  // This uses the service role key and won't automatically sign in the new user
  const { data, error } = await client.functions.invoke('create-user', {
    body: {
      email: email.trim(),
      password: password,
      full_name: fullName?.trim() ?? "",
      role: role,
    },
  });

  if (error) {
    console.error("[createUser] Edge Function error:", error);
    throw new Error(error.message || "Failed to create user");
  }

  console.log("[createUser] User created successfully:", data);
  return data;
}

export function subscribeToTables(channelName, tables, onChange) {
  if (!supabase) {
    return () => {};
  }

  const channel = supabase.channel(channelName);
  tables.forEach((table) => {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      onChange,
    );
  });
  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
