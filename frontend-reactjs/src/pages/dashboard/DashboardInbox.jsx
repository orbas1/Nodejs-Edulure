import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchThreads, fetchThreadMessages, sendThreadMessage, markThreadRead } from '../../api/inboxApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function formatName(user) {
  if (!user) return 'Unknown member';
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return fullName || user.email || 'Community member';
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function serialiseMessages(messages) {
  return [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export default function DashboardInbox() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const currentUserId = session?.user?.id;
  const { socket, connected } = useRealtime();

  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState(null);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(null);
  const [composer, setComposer] = useState('');
  const [sendInFlight, setSendInFlight] = useState(false);

  const messagesEndRef = useRef(null);

  const loadThreads = useCallback(async () => {
    if (!token) {
      setThreads([]);
      setSelectedThreadId(null);
      return;
    }
    setThreadsLoading(true);
    setThreadsError(null);
    try {
      const response = await fetchThreads({ token });
      const items = response.data ?? [];
      setThreads(items);
      setSelectedThreadId((prev) => {
        if (prev && items.some((entry) => entry.thread.id === prev)) {
          return prev;
        }
        return items[0]?.thread?.id ?? null;
      });
    } catch (error) {
      setThreadsError(error.message ?? 'Unable to load inbox threads');
    } finally {
      setThreadsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!token || !selectedThreadId) {
      setMessages([]);
      setMessagesError(null);
      return;
    }

    let cancelled = false;
    setMessagesLoading(true);
    setMessagesError(null);

    fetchThreadMessages(selectedThreadId, { token })
      .then((response) => {
        if (cancelled) return;
        const fetched = serialiseMessages(response.data ?? []);
        setMessages(fetched);
        setThreads((prev) =>
          prev.map((entry) =>
            entry.thread.id === selectedThreadId ? { ...entry, unreadCount: 0, latestMessage: fetched.at(-1) ?? entry.latestMessage } : entry
          )
        );
        markThreadRead(selectedThreadId, {}, { token }).catch(() => {});
      })
      .catch((error) => {
        if (cancelled) return;
        setMessagesError(error.message ?? 'Unable to load messages');
      })
      .finally(() => {
        if (!cancelled) {
          setMessagesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, selectedThreadId]);

  useEffect(() => {
    if (!socket || !selectedThreadId) return undefined;
    socket.emit('inbox.join', { threadId: selectedThreadId });
    return () => {
      socket.emit('inbox.leave', { threadId: selectedThreadId });
    };
  }, [socket, selectedThreadId]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleThreadUpsert = (payload) => {
      setThreads((prev) => {
        const exists = prev.some((entry) => entry.thread.id === payload.thread.id);
        if (exists) {
          return prev.map((entry) =>
            entry.thread.id === payload.thread.id
              ? {
                  ...entry,
                  thread: payload.thread,
                  participants: payload.participants ?? entry.participants,
                  latestMessage: payload.initialMessage ?? entry.latestMessage
                }
              : entry
          );
        }
        return [{ thread: payload.thread, participants: payload.participants ?? [], latestMessage: payload.initialMessage ?? null, unreadCount: 0 }, ...prev];
      });
    };

    const handleThreadActivity = (payload) => {
      setThreads((prev) =>
        prev.map((entry) =>
          entry.thread.id === payload.threadId
            ? {
                ...entry,
                latestMessage: payload.message ?? entry.latestMessage,
                unreadCount: payload.threadId === selectedThreadId ? 0 : (entry.unreadCount ?? 0) + 1
              }
            : entry
        )
      );
    };

    const handleMessageCreated = (payload) => {
      if (payload.threadId === selectedThreadId) {
        setMessages((prev) => serialiseMessages([...prev, payload.message]));
        markThreadRead(payload.threadId, { messageId: payload.message.id }, { token }).catch(() => {});
      }
      handleThreadActivity(payload);
    };

    const handleThreadRead = (payload) => {
      if (payload.threadId === selectedThreadId && payload.participant?.userId !== currentUserId) {
        setMessages((prev) => [...prev]);
      }
    };

    socket.on('inbox.thread.upserted', handleThreadUpsert);
    socket.on('inbox.thread.activity', handleThreadActivity);
    socket.on('dm.message.created', handleMessageCreated);
    socket.on('dm.thread.read', handleThreadRead);

    return () => {
      socket.off('inbox.thread.upserted', handleThreadUpsert);
      socket.off('inbox.thread.activity', handleThreadActivity);
      socket.off('dm.message.created', handleMessageCreated);
      socket.off('dm.thread.read', handleThreadRead);
    };
  }, [socket, selectedThreadId, token, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeThread = useMemo(() => threads.find((entry) => entry.thread.id === selectedThreadId) ?? null, [threads, selectedThreadId]);

  const conversationTitle = useMemo(() => {
    if (!activeThread) return 'Select a conversation';
    const names = activeThread.participants
      ?.filter((participant) => participant.userId !== currentUserId)
      .map((participant) => formatName(participant.user)) ?? [];
    if (names.length === 0) {
      return activeThread.thread.subject ?? 'Direct message';
    }
    return names.join(', ');
  }, [activeThread, currentUserId]);

  const handleSendMessage = async () => {
    const trimmed = composer.trim();
    if (!trimmed || !token || !selectedThreadId) return;
    setSendInFlight(true);
    try {
      const response = await sendThreadMessage(selectedThreadId, { body: trimmed }, { token });
      const message = response.data;
      if (message) {
        setMessages((prev) => serialiseMessages([...prev, message]));
        setThreads((prev) =>
          prev.map((entry) =>
            entry.thread.id === selectedThreadId ? { ...entry, latestMessage: message, unreadCount: 0 } : entry
          )
        );
      }
      setComposer('');
    } catch (error) {
      setMessagesError(error.message ?? 'Unable to send message');
    } finally {
      setSendInFlight(false);
    }
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inbox</h1>
          <p className="text-sm text-slate-600">
            Coordinate with peers, instructors, and teams. Real-time updates arrive via Edulure Realtime.
          </p>
        </div>
        <span
          className={classNames(
            'inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide',
            connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
          )}
        >
          <span className="inline-block h-2 w-2 rounded-full bg-current" />
          {connected ? 'Live' : 'Reconnecting…'}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Conversations</h2>
            <button
              type="button"
              onClick={loadThreads}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Refresh
            </button>
          </div>
          {threadsLoading && <p className="text-xs text-slate-400">Loading threads…</p>}
          {threadsError && (
            <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600" role="alert">
              {threadsError}
            </p>
          )}
          <div className="mt-3 space-y-2">
            {threads.map((entry) => {
              const isActive = entry.thread.id === selectedThreadId;
              const unread = entry.unreadCount ?? 0;
              const preview = entry.latestMessage?.body ?? 'No messages yet';
              return (
                <button
                  key={entry.thread.id}
                  type="button"
                  onClick={() => setSelectedThreadId(entry.thread.id)}
                  className={classNames(
                    'w-full rounded-2xl border px-4 py-3 text-left transition',
                    isActive ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 hover:border-primary/60'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800">{formatName(entry.participants?.find((p) => p.userId !== currentUserId)?.user)}</p>
                    {unread > 0 && (
                      <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                        {unread}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{preview}</p>
                  {entry.latestMessage?.createdAt && (
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                      {formatTimestamp(entry.latestMessage.createdAt)}
                    </p>
                  )}
                </button>
              );
            })}
            {!threadsLoading && !threads.length && !threadsError && (
              <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                Start a conversation by inviting teammates into a thread from the communities view.
              </p>
            )}
          </div>
        </aside>

        <section className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-base font-semibold text-slate-900">{conversationTitle}</h2>
            {activeThread?.latestMessage?.createdAt && (
              <p className="text-xs text-slate-500">Last activity {formatTimestamp(activeThread.latestMessage.createdAt)}</p>
            )}
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messagesLoading && <p className="text-xs text-slate-400">Loading conversation…</p>}
            {messagesError && (
              <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600" role="alert">
                {messagesError}
              </p>
            )}
            {messages.map((message) => {
              const isMine = message.senderId === currentUserId;
              const senderName = formatName(message.sender);
              return (
                <div key={message.id} className={classNames('flex', isMine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={classNames(
                      'max-w-md rounded-3xl px-4 py-3 text-sm shadow',
                      isMine ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    <p className={classNames('text-xs font-semibold uppercase tracking-wide', isMine ? 'text-white/70' : 'text-slate-500')}>
                      {senderName}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">{message.body}</p>
                    <p className={classNames('mt-2 text-[10px] uppercase tracking-wide', isMine ? 'text-white/60' : 'text-slate-400')}>
                      {formatTimestamp(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
            {!messagesLoading && messages.length === 0 && !messagesError && (
              <p className="text-xs text-slate-400">No messages yet. Say hello to kick things off.</p>
            )}
          </div>
          <div className="border-t border-slate-200 p-4">
            <div className="space-y-2">
              <textarea
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Write a message"
                rows={3}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!composer.trim() || sendInFlight || !selectedThreadId}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendInFlight ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

