import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

serve(async () => {
  try {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: staleThreads, error } = await supabase
      .from('chat_threads')
      .select('id, user_id, last_sales_reply_at')
      .or(`last_sales_reply_at.is.null,last_sales_reply_at.lt.${cutoff}`);

    if (error) throw error;

    if (!staleThreads?.length) {
      return json({ message: 'No threads require AI follow-up.' });
    }

    for (const thread of staleThreads) {
      // Fetch conversation history for context
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('sender_type, message, created_at')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true })
        .limit(10); // Get last 10 messages for context

      // Generate contextual response based on conversation
      let aiResponse = 'Thank you for your message. Our team will get back to you shortly.';
      
      if (messages && messages.length > 0) {
        const lastUserMessage = messages.filter(m => m.sender_type === 'user').pop();
        
        if (lastUserMessage) {
          const userMessage = lastUserMessage.message.toLowerCase();
          
          // Simple keyword-based response generation
          if (userMessage.includes('price') || userMessage.includes('cost') || userMessage.includes('how much')) {
            aiResponse = 'I understand you're asking about pricing. Our team will provide you with detailed pricing information shortly.';
          } else if (userMessage.includes('help') || userMessage.includes('support') || userMessage.includes('issue')) {
            aiResponse = 'I see you need assistance. Our support team is reviewing your request and will help you resolve this issue.';
          } else if (userMessage.includes('order') || userMessage.includes('delivery') || userMessage.includes('shipping')) {
            aiResponse = 'Regarding your order inquiry, our team will check the status and get back to you with an update soon.';
          } else if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
            aiResponse = 'Hello! Thank you for reaching out. Our team will be with you shortly to assist you.';
          } else if (userMessage.includes('thank')) {
            aiResponse = 'You're welcome! Is there anything else we can help you with?';
          }
        }
      }
      
      await supabase.from('chat_messages').insert({
        thread_id: thread.id,
        sender_type: 'ai',
        message: aiResponse,
      });

      await supabase.from('notifications').insert({
        user_id: thread.user_id,
        title: 'Support update',
        body: aiResponse,
        type: 'support',
      });
    }

    return json({ message: 'AI fallback messages sent.', count: staleThreads.length });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
});

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
