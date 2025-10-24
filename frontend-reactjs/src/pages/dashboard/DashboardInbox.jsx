import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchThreads, fetchThreadMessages, sendThreadMessage, markThreadRead } from '../../api/inboxApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import DashboardSwitcherHeader from '../../components/dashboard/DashboardSwitcherHeader.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import useDashboardSurface from '../../hooks/useDashboardSurface.js';

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

export function filterThreadEntries(entries, { term = '', filter = 'all', currentUserId } = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const normalisedTerm = term.trim().toLowerCase();

  return list.filter((entry) => {
    if (!entry?.thread?.id) {
      return false;
    }

    if (filter === 'unread' && (entry.unreadCount ?? 0) === 0) {
      return false;
    }

    if (!normalisedTerm) {
      return true;
    }

    const participantNames = (entry.participants ?? [])
      .filter((participant) => participant.userId !== currentUserId)
      .map((participant) => formatName(participant.user).toLowerCase());

    const subject = (entry.thread?.subject ?? '').toLowerCase();
    const preview = (entry.latestMessage?.body ?? '').toLowerCase();
    const haystack = [subject, preview, ...participantNames].join(' ');
    return haystack.includes(normalisedTerm);
  });
}

export default function DashboardInbox() {
  const { surface, refresh, trackView, trackAction } = useDashboardSurface('inbox', {
    origin: 'dashboard-inbox'
  });
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
  const [threadSearch, setThreadSearch] = useState('');
  const [threadStatusFilter, setThreadStatusFilter] = useState('all');
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const messagesEndRef = useRef(null);

  const filteredThreads = useMemo(
    () => filterThreadEntries(threads, { term: threadSearch, filter: threadStatusFilter, currentUserId }),
    [threads, threadSearch, threadStatusFilter, currentUserId]
  );

  const unreadThreadCount = useMemo(
    () => threads.reduce((total, entry) => total + ((entry.unreadCount ?? 0) > 0 ? 1 : 0), 0),
    [threads]
  );

  const connectionTone = offline
    ? 'bg-rose-100 text-rose-600'
    : connected
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-slate-200 text-slate-500';
  const connectionLabel = offline ? 'Offline' : connected ? 'Live' : 'Reconnecting…';
  const headerCopy = useMemo(
    () => ({
      title: 'Inbox operations hub',
      description: 'Coordinate with peers, instructors, and teams. Real-time updates arrive via Edulure Realtime.'
    }),
    []
  );

  useEffect(() => {
    trackView({ threads: threads.length, unread: unreadThreadCount, offline });
  }, [trackView, threads.length, unreadThreadCount, offline]);

  useEffect(() => {
    if (!filteredThreads.length) {
      if (selectedThreadId !== null) {
        setSelectedThreadId(null);
      }
      return;
    }
    if (!filteredThreads.some((entry) => entry.thread.id === selectedThreadId)) {
      setSelectedThreadId(filteredThreads[0]?.thread?.id ?? null);
    }
  }, [filteredThreads, selectedThreadId]);

  const loadThreads = useCallback(async () => {
    if (!token) {
      setThreads([]);
      setSelectedThreadId(null);
      return;
    }

    if (offline) {
      setThreadsError('You are offline. Conversations will refresh when connectivity returns.');
      setThreadsLoading(false);
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
  }, [offline, token]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!token || !selectedThreadId) {
      setMessages([]);
      setMessagesError(null);
      return;
    }

    if (offline) {
      setMessagesError('You are offline. Messages will load when connectivity returns.');
      setMessagesLoading(false);
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
  }, [offline, selectedThreadId, token]);

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
    if (offline) {
      setMessagesError('Reconnect to send messages.');
      return;
    }
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
      trackAction('send_message', { threadId: selectedThreadId });
    } catch (error) {
      setMessagesError(error.message ?? 'Unable to send message');
      trackAction('send_message_error', {
        threadId: selectedThreadId,
        reason: error instanceof Error ? error.message : 'unknown'
      });
    } finally {
      setSendInFlight(false);
    }
  };

  const handleRefresh = useCallback(() => {
    loadThreads();
    refresh?.();
  }, [loadThreads, refresh]);

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-8">
      <DashboardSwitcherHeader
        title={headerCopy.title}
        description={headerCopy.description}
        surface={surface}
        onRefresh={handleRefresh}
      />

      <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600">
        <span>Realtime status</span>
        <span className={classNames('inline-flex items-center gap-2 rounded-full px-3 py-1', connectionTone)}>
          <span className={`inline-block h-2 w-2 rounded-full ${offline ? 'bg-rose-500' : 'bg-current'}`} />
          {connectionLabel}
        </span>
      </div>

      {threadsError ? (
        <DashboardActionFeedback
          feedback={{ tone: 'error', message: threadsError }}
          onDismiss={() => setThreadsError(null)}
          persistKey="dashboard-inbox-threads"
        />
      ) : null}
      {messagesError ? (
        <DashboardActionFeedback
          feedback={{ tone: 'warning', message: messagesError }}
          onDismiss={() => setMessagesError(null)}
          persistKey="dashboard-inbox-messages"
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Conversations</h2>
            <button
              type="button"
              onClick={loadThreads}
              disabled={offline}
              title={offline ? 'Reconnect to refresh threads' : undefined}
              className="text-xs font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh
            </button>
          </div>
          <div className="space-y-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Search conversations
              <div className="relative">
                <input
                  value={threadSearch}
                  onChange={(event) => setThreadSearch(event.target.value)}
                  placeholder="Search by name, subject, or message"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {threadSearch ? (
                  <button
                    type="button"
                    onClick={() => setThreadSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setThreadStatusFilter('all')}
                className={classNames(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition',
                  threadStatusFilter === 'all'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-primary/40'
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setThreadStatusFilter('unread')}
                className={classNames(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition',
                  threadStatusFilter === 'unread'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-primary/40'
                )}
              >
                Unread ({unreadThreadCount})
              </button>
              {(threadSearch || threadStatusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setThreadSearch('');
                    setThreadStatusFilter('all');
                  }}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>
          {threadsLoading && <p className="text-xs text-slate-400">Loading threads…</p>}
          <div className="mt-3 space-y-2">
            {filteredThreads.map((entry) => {
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
            {!threadsLoading && !filteredThreads.length && !threadsError && (
              <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                {threadSearch || threadStatusFilter !== 'all'
                  ? 'No conversations match your current filters. Adjust the search or reset filters to continue.'
                  : 'Start a conversation by inviting teammates into a thread from the communities view.'}
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={classNames('text-xs', offline ? 'font-semibold text-amber-600' : 'text-slate-400')}>
                  {offline ? 'Offline — reconnect to send messages.' : 'Press Enter to send'}
                </span>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!composer.trim() || sendInFlight || !selectedThreadId || offline}
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

