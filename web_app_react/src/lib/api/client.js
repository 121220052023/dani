import { hasSupabaseEnv, supabase } from "../supabase";

export const ROLE_LABELS = {
  admin: "Admin",
  sales: "Sales",
  marketing: "Marketing",
};

// Simple request cache to prevent duplicate concurrent requests
const requestCache = new Map();
const CACHE_DURATION = 5000; // 5 seconds

export function requireClient() {
  if (!hasSupabaseEnv || !supabase) {
    throw new Error("Supabase environment variables are missing.");
  }
  return supabase;
}

// Utility: Deduplicate concurrent requests
export async function dedupeRequest(key, requestFn, duration = CACHE_DURATION) {
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
export async function withRetry(fn, maxRetries = 3) {
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

export function monthKey(dateValue) {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export function monthLabel(dateValue) {
  return new Date(dateValue).toLocaleString("en-US", { month: "short" });
}

export function activityStatus(timestamp) {
  if (!timestamp) return "Offline";
  const minutes = (Date.now() - new Date(timestamp).getTime()) / 60000;
  return minutes <= 10 ? "Active" : "Offline";
}

export function activityLabel(timestamp) {
  if (!timestamp) return "No recent activity";

  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(timestamp).getTime()) / 60000),
  );

  if (minutes < 1) return "last seen just now";
  if (minutes < 60) return `last seen ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours === 0
      ? `last seen ${days}d ago`
      : `last seen ${days}d ${remainingHours}h ago`;
  }
  
  return remainingMinutes === 0
    ? `last seen ${hours}h ago`
    : `last seen ${hours}h ${remainingMinutes}m ago`;
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(timestamp).getTime()) / 60000),
  );

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours === 0
      ? `${days}d ago`
      : `${days}d ${remainingHours}h ago`;
  }
  
  return remainingMinutes === 0
    ? `${hours}h ago`
    : `${hours}h ${remainingMinutes}m ago`;
}

export function formatMessageTime(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatFullDateTime(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString();
}

let lastPresenceTouchAt = 0;

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
