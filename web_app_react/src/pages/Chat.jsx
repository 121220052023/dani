import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchChatThreads,
  fetchMessages,
  sendSalesMessage,
  subscribeToTables,
} from "../lib/commerce";
import { PageHeader, SectionCard } from "../components/ui/SectionCard";
import useUiStore from "../store/useUiStore";
import { t } from "../lib/i18n";

function statusCopy(thread, latestMessage, now, language = 'en') {
  if (!thread) {
    return {
      label: t('selectThread', language),
      tone: "neutral",
      helper: t('conversations', language),
    };
  }

  if (latestMessage?.sender_type === "user") {
    if (!thread.last_sales_reply_at) {
      return {
        label: t('awaitingReply', language),
        tone: "warning",
        helper: t('realtimeWholesale', language),
      };
    }

    const minutes = Math.max(
      0,
      Math.round((now - new Date(thread.last_sales_reply_at).getTime()) / 60000),
    );

    if (minutes >= 5) {
      return {
        label: "Fallback window reached",
        tone: "danger",
        helper: "Check whether the edge function already replied.",
      };
    }

    return {
      label: t('waitingForSales', language),
      tone: "warning",
      helper: `Fallback triggers in about ${5 - minutes} minute(s).`,
    };
  }

  return {
    label: t('handled', language),
    tone: "success",
    helper: "Latest response came from sales or AI.",
  };
}

export default function ChatPage() {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const streamRef = useRef(null);
  const { pushToast, language } = useUiStore();

  // Disable send when no thread selected
  const isSendDisabled = !activeThread || draft.trim() === "";

  useEffect(() => {
    const loadThreads = async () => {
      const nextThreads = await fetchChatThreads();
      setThreads(nextThreads);
      setActiveThread((current) => current || nextThreads[0]?.id || "");
    };
    loadThreads().catch(console.error);
    return subscribeToTables("chat-threads-live", ["chat_threads"], loadThreads);
  }, []);

  useEffect(() => {
    if (!activeThread) return undefined;
    const loadMessages = () =>
      fetchMessages(activeThread).then(setMessages).catch(console.error);
    loadMessages();
    return subscribeToTables(
      `chat-messages-${activeThread}`,
      ["chat_messages"],
      loadMessages,
    );
  }, [activeThread]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [messages]);

  const filteredThreads = useMemo(() => {
    const query = threadSearch.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((thread) =>
      [thread.profiles?.full_name, thread.profiles?.email]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [threadSearch, threads]);

  const activeConversation = useMemo(
    () => threads.find((item) => item.id === activeThread) ?? null,
    [activeThread, threads],
  );

  const latestMessage = messages.length ? messages[messages.length - 1] : null;
  const status = statusCopy(activeConversation, latestMessage, now, language);

  const submit = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !activeThread) return;
    try {
      await sendSalesMessage(activeThread, draft.trim());
      setDraft("");
    } catch (error) {
      pushToast({ tone: "danger", message: error.message });
    }
  };

  // Handle Ctrl+Enter or Cmd+Enter to send
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submit(event);
    }
  };

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow={t('salesSupport', language)}
        title={t('chat', language)}
        subtitle={status.helper}
      />
      <SectionCard
        title={t('conversations', language)}
        subtitle={status.helper}
      >
        <div className="chat-toolbar">
          <label className="search-bar">
            <input
              value={threadSearch}
              onChange={(event) => setThreadSearch(event.target.value)}
              placeholder={t('searchConversations', language)}
            />
          </label>
        </div>
        <div className="chat-layout enhanced">
          <div className="thread-column enhanced">
            {filteredThreads.map((thread) => {
              const isActive = thread.id === activeThread;
              const waiting =
                messages.length > 0 &&
                activeThread === thread.id &&
                latestMessage?.sender_type === "user";

              return (
                <button
                  key={thread.id}
                  type="button"
                  className={`thread-card${isActive ? " active" : ""}`}
                  onClick={() => setActiveThread(thread.id)}
                >
                  <div className="thread-topline">
                    <strong>{thread.profiles?.full_name ?? t('wholesaleUser', language)}</strong>
                    {waiting && <span className="thread-badge">Waiting</span>}
                  </div>
                  <span>{thread.profiles?.email ?? t('noEmail', language)}</span>
                  <div className="thread-meta">
                    <small>{new Date(thread.created_at).toLocaleString()}</small>
                    <small>
                      {thread.assigned_sales_id ? t('assigned', language) : t('unassigned', language)}
                    </small>
                  </div>
                </button>
              );
            })}
            {filteredThreads.length === 0 && (
              <div className="thread-empty">
                <p className="muted-copy">{t('noMatchingConversations', language)}</p>
              </div>
            )}
          </div>
          <div className="chat-column enhanced">
            <div className="chat-column-head">
              <div>
                <strong>
                  {activeConversation?.profiles?.full_name ?? t('selectThread', language)}
                </strong>
                <span>{activeConversation?.profiles?.email ?? t('noEmail', language)}</span>
              </div>
              <div className="chat-head-meta">
                {activeConversation && (
                  <small>
                    {t('opened', language)} {new Date(activeConversation.created_at).toLocaleString()}
                  </small>
                )}
              </div>
            </div>

            <div className="chat-stream enhanced" ref={streamRef}>
              {messages.length === 0 ? (
                <div className="chat-empty-state">
                  <strong>{t('noMessagesYet', language)}</strong>
                  <p>{t('sendFirstReply', language)}</p>
                </div>
              ) : (
                messages.map((message) => (
                  <article
                    key={message.id}
                    className={`chat-bubble ${message.sender_type}`}
                  >
                    <strong>
                      {message.sender?.full_name ??
                        message.sender?.email ??
                        message.sender_type}
                    </strong>
                    <p>{message.message}</p>
                    <small>{new Date(message.created_at).toLocaleTimeString()}</small>
                  </article>
                ))
              )}
            </div>

            <form className="chat-composer enhanced" onSubmit={submit}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('replyPlaceholder', language)}
                disabled={!activeThread}
              />
              <button 
                className="primary-button" 
                type="submit"
                disabled={!activeThread}
              >
                {t('send', language)}
              </button>
            </form>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
