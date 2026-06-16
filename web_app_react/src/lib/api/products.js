import { requireClient, dedupeRequest } from "./client";

export async function fetchProducts() {
  return dedupeRequest("products", async () => {
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
  const withRetry = (await import("./client.js")).withRetry;
  return withRetry(async () => {
    const client = requireClient();
    const { data, error } = await client
      .from("product_comments")
      .select(`
        *,
        profiles:user_id (full_name, email),
        products:product_id (name, image_url)
      `)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    console.log('Fetched comments:', data?.slice(0, 2)); // Debug log
    return data ?? [];
  });
}

export async function deleteProductComment(id) {
  const client = requireClient();
  const { error } = await client.from("product_comments").delete().eq("id", id);
  if (error) throw error;
}


