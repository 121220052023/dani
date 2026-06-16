import { requireClient, withRetry } from "./client";

export async function fetchChatThreads() {
  return withRetry(async () => {
    const client = requireClient();
    const { data, error } = await client
      .from("chat_threads")
      .select(`
        *,
        profiles:user_id(full_name, email, last_seen_at, avatar_url),
        chat_messages(
          created_at,
          sender_type
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    const threadsWithLatest = (data ?? []).map(thread => {
      const messages = thread.chat_messages || [];
      const latestMessage = messages.length > 0
        ? messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        : null;

      return {
        ...thread,
        latest_message_at: latestMessage?.created_at || thread.created_at,
        latest_sender_type: latestMessage?.sender_type || null,
      };
    });

    threadsWithLatest.sort((a, b) => {
      const aIsUserMessage = a.latest_sender_type === 'user';
      const bIsUserMessage = b.latest_sender_type === 'user';

      if (aIsUserMessage && !bIsUserMessage) return -1;
      if (!aIsUserMessage && bIsUserMessage) return 1;

      return new Date(b.latest_message_at) - new Date(a.latest_message_at);
    });

    return threadsWithLatest;
  });
}

export async function fetchMessages(threadId) {
  return withRetry(async () => {
    const client = requireClient();
    const { data, error } = await client
      .from("chat_messages")
      .select("*, sender:sender_id(full_name, email, avatar_url)")
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
      ai_mode_active: false,
      awaiting_admin_response: false,
    })
    .eq("id", threadId);
}

export async function deleteChatMessages(threadId) {
  const client = requireClient();

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    throw new Error("Not authenticated. Please sign in again.");
  }

  try {
    const { data, error } = await client.functions.invoke('delete-chat-messages', {
      body: {
        thread_id: threadId,
      },
    });

    if (error) {
      throw new Error(error.message || "Failed to delete chat messages");
    }

    return data;
  } catch (err) {
    if (err.message?.includes("Edge Function")) {
      throw new Error("Edge Function 'delete-chat-messages' not found. Please deploy the Edge Function first.");
    }
    throw err;
  }
}

export async function fetchChatSummaries() {
  return withRetry(async () => {
    const client = requireClient();
    const { data, error } = await client
      .from("chat_summaries")
      .select("*, user:user_id(full_name, email, avatar_url), resolver:resolved_by(full_name, email, avatar_url)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
}

export async function updateChatSummary(id, updates) {
  const client = requireClient();
  const { data, error } = await client
    .from("chat_summaries")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
