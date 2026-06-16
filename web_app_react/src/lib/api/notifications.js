import { requireClient, withRetry } from "./client";

export async function fetchNotifications() {
  return withRetry(async () => {
    const client = requireClient();
    const { data, error } = await client
      .from("notifications")
      .select("*")
      .in("type", ["chat", "new_order"]) // Only show chat messages and new orders for admin
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data ?? [];
  });
}

export async function markNotificationRead(id) {
  const client = requireClient();
  const { data, error } = await client
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .select();
  if (error) throw error;
  return data;
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
