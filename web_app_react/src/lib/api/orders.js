import { requireClient, withRetry } from "./client";

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

