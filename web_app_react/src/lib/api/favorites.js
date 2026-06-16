import { requireClient } from "./client";

/**
 * Returns a map of { [product_id]: favoriteCount } across all users.
 * Used by admin to see how popular each product is.
 */
export async function fetchFavoriteCountsByProduct() {
  const client = requireClient();
  const { data, error } = await client
    .from("favorites")
    .select("product_id");

  if (error) throw error;

  const counts = {};
  for (const row of data || []) {
    counts[row.product_id] = (counts[row.product_id] || 0) + 1;
  }
  return counts;
}


