import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchChatThreads,
  fetchMessages,
  sendSalesMessage,
  deleteChatMessages,
  subscribeToTables,
} from "../lib/api";
import { activityLabel, activityStatus, formatTimestamp, formatMessageTime, formatFullDateTime } from "../lib/api/client";
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

  if (thread.ai_mode_active) {
    return {
      label: t('aiModeActive', language) || "AI Mode Active",
      tone: "warning",
      helper: t('aiHandlingConversation', language) || "AI is handling this conversation. Send a message to take over.",
    };
  }

  if (latestMessage?.sender_type === "user") {
    if (!thread.last_sales_reply_at) {
      return {
        label: t('awaitingReply', language),
        tone: "warning",
        helper: t('realtimeSupport', language),
      };
    }

    const minutes = Math.max(
      0,
      Math.round((now - new Date(latestMessage.created_at).getTime()) / 60000),
    );

    if (minutes >= 10) {
      return {
        label: "AI timeout reached",
        tone: "danger",
        helper: "AI should have responded. Check the ai-timeout-processor function.",
      };
    }

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
      helper: `Fallback triggers in about ${10 - minutes} minute(s).`,
    };
  }

  return {
    label: t('handled', language),
    tone: "success",
    helper: "Latest response came from sales or AI.",
  };
}

function renderOnlineStatus(lastSeenAt) {
  const status = activityStatus(lastSeenAt);
  if (status === 'Active') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
        Online
      </div>
    );
  }
  return activityLabel(lastSeenAt);
}

function MessageBubble({ message }) {
  const isUser = message.sender_type === 'user';
  const isAI = message.sender_type === 'ai';
  const isSales = message.sender_type === 'sales' || message.sender_type === 'admin';

  const bubbleClass = `chat-bubble ${message.sender_type}${isAI ? ' ai-message' : ''}`;
  const senderName = message.sender?.full_name ?? (isAI ? 'AI Assistant' : isUser ? 'Customer' : 'Sales');
  const senderAvatar = message.sender?.avatar_url;
  const senderInitial = (senderName?.[0] || '?').toUpperCase();

  return (
    <article key={message.id} className={bubbleClass}>
      <div className="message-header">
        {senderAvatar ? (
          <img src={senderAvatar} alt={senderName} className="message-avatar" />
        ) : (
          <div className="message-avatar message-avatar-fallback">{senderInitial}</div>
        )}
        <div className="message-header-info">
          <div className="message-sender-row">
            {isAI && (
              <span className="ai-icon" style={{ marginRight: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                  <circle cx="7.5" cy="14.5" r="1.5" fill="currentColor"/>
                  <circle cx="16.5" cy="14.5" r="1.5" fill="currentColor"/>
                </svg>
              </span>
            )}
            <strong>{senderName}</strong>
            {isAI && <span className="ai-badge">AI</span>}
          </div>
          <small>{formatMessageTime(message.created_at)}</small>
        </div>
      </div>
      <p>{message.message}</p>
    </article>
  );
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
  const isAiMode = activeConversation?.ai_mode_active === true;

  const submit = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !activeThread) return;
    try {
      await sendSalesMessage(activeThread, draft.trim());
      setDraft("");
      fetchMessages(activeThread).then(setMessages).catch(console.error);
      const updatedThreads = await fetchChatThreads();
      setThreads(updatedThreads);
    } catch (error) {
      pushToast({ tone: "danger", message: error.message });
    }
  };

  const handleEmptyChat = async () => {
    if (!activeThread) return;
    if (!window.confirm(t('confirmEmptyChat', language))) return;
    try {
      await deleteChatMessages(activeThread);
      pushToast({ tone: "success", message: "Chat emptied successfully" });
      setMessages([]);
      const updatedThreads = await fetchChatThreads();
      setThreads(updatedThreads);
    } catch (error) {
      pushToast({ tone: "danger", message: error.message });
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submit(event);
    }
  };

  const aiMessageCount = messages.filter(m => m.sender_type === 'ai').length;

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
              const threadAiMode = thread.ai_mode_active === true;
              const avatarUrl = thread.profiles?.avatar_url;
              const initial = (thread.profiles?.full_name?.[0] || thread.profiles?.email?.[0] || '?').toUpperCase();

              return (
                <button
                  key={thread.id}
                  type="button"
                  className={`thread-card${isActive ? " active" : ""}${threadAiMode ? " ai-active" : ""}`}
                  onClick={() => setActiveThread(thread.id)}
                >
                  <div className="thread-card-left">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={thread.profiles?.full_name || ''} className="thread-avatar" />
                    ) : (
                      <div className="thread-avatar thread-avatar-fallback">{initial}</div>
                    )}
                    <div className="thread-card-info">
                      <div className="thread-topline">
                        <strong>{thread.profiles?.full_name ?? t('unnamedUser', language)}</strong>
                        {threadAiMode && (
                          <span className="thread-badge ai">AI</span>
                        )}
                        {waiting && !threadAiMode && (
                          <span className="thread-badge">Waiting</span>
                        )}
                      </div>
                      <span>{thread.profiles?.email ?? t('noEmail', language)}</span>
                      <div className="thread-meta">
                        <small>{formatTimestamp(thread.latest_message_at)}</small>
                        <small>
                          {threadAiMode
                            ? "AI Active"
                            : thread.assigned_sales_id
                              ? t('assigned', language)
                              : t('unassigned', language)}
                        </small>
                      </div>
                    </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {activeConversation && (() => {
                  const headerAvatarUrl = activeConversation.profiles?.avatar_url;
                  const headerInitial = (activeConversation.profiles?.full_name?.[0] || activeConversation.profiles?.email?.[0] || '?').toUpperCase();
                  return headerAvatarUrl ? (
                    <img src={headerAvatarUrl} alt={activeConversation.profiles?.full_name || ''} className="avatar-small" style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: isAiMode ? '2px solid #F59E0B' : '2px solid var(--accent)',
                    }} />
                  ) : (
                    <div className="avatar-small" style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: isAiMode ? '#F59E0B' : 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--bg)',
                      fontWeight: 'bold',
                      fontSize: '1.1rem'
                    }}>
                      {isAiMode ? '🤖' : headerInitial}
                    </div>
                  );
                })()}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>
                      {activeConversation?.profiles?.full_name ?? t('selectThread', language)}
                    </strong>
                    {isAiMode && (
                      <span style={{
                        background: '#FEF3C7',
                        color: '#92400E',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}>
                        AI MODE
                      </span>
                    )}
                  </div>
                  <span>{activeConversation?.profiles?.email ?? t('noEmail', language)}</span>
                  {activeConversation?.profiles?.last_seen_at && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {renderOnlineStatus(activeConversation.profiles.last_seen_at)}
                    </div>
                  )}
                </div>
              </div>
              <div className="chat-head-meta">
                {activeConversation && (
                  <small>
                    {t('opened', language)} {formatFullDateTime(activeConversation.created_at)}
                  </small>
                )}
                {isAiMode && aiMessageCount > 0 && (
                  <small style={{ color: '#92400E', marginLeft: '8px' }}>
                    {aiMessageCount} AI message{aiMessageCount !== 1 ? 's' : ''}
                  </small>
                )}
                {activeThread && (
                  <button
                    className="ghost-button small"
                    type="button"
                    onClick={handleEmptyChat}
                    style={{ marginLeft: '12px' }}
                  >
                    {t('emptyChat', language)}
                  </button>
                )}
              </div>
            </div>

            {isAiMode && (
              <div style={{
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '8px',
                padding: '10px 14px',
                margin: '8px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                color: '#92400E',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                </svg>
                <span>
                  <strong>AI is handling this conversation.</strong> Send a message to take over and disable AI mode.
                </span>
              </div>
            )}

            <div className="chat-stream enhanced" ref={streamRef}>
              {messages.length === 0 ? (
                <div className="chat-empty-state">
                  <strong>{t('noMessagesYet', language)}</strong>
                  <p>{t('sendFirstReply', language)}</p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              )}
            </div>

            <form className="chat-composer enhanced" onSubmit={submit}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isAiMode
                  ? "Send a message to take over from AI..."
                  : t('replyPlaceholder', language)}
                disabled={!activeThread}
              />
              <button
                className="primary-button"
                type="submit"
                disabled={isSendDisabled}
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
