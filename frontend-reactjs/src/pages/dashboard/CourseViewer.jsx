import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';

import { fetchCoursePlayer, fetchCourseLiveChat, postCourseLiveChat } from '../../api/courseApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function CourseViewer() {
  const { courseId } = useParams();
  const { dashboard } = useOutletContext();
  const course = useMemo(() => dashboard?.courses?.active.find((item) => item.id === courseId), [dashboard, courseId]);
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const { socket } = useRealtime();
  const [playerSession, setPlayerSession] = useState(null);
  const [playerError, setPlayerError] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatError, setChatError] = useState(null);
  const [chatSending, setChatSending] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [presence, setPresence] = useState({ totalViewers: 0, viewers: [] });
  const messagesEndRef = useRef(null);

  const appendChatMessage = useCallback((message) => {
    if (!message) return;
    setChatMessages((prev) => {
      const exists = prev.some((entry) => entry.id === message.id);
      const next = exists
        ? prev.map((entry) => (entry.id === message.id ? message : entry))
        : [...prev, message];
      return next.sort((a, b) => new Date(a.sentAt ?? a.createdAt) - new Date(b.sentAt ?? b.createdAt));
    });
  }, []);

  const formatChatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (!token || !courseId) {
      setPlayerSession(null);
      setPresence({ totalViewers: 0, viewers: [] });
      return;
    }

    let cancelled = false;
    setPlayerError(null);

    fetchCoursePlayer(courseId, { token })
      .then((response) => {
        if (cancelled) return;
        const payload = response.data ?? null;
        setPlayerSession(payload);
        setPresence(payload?.live?.presence ?? { totalViewers: 0, viewers: [] });
      })
      .catch((error) => {
        if (!cancelled) {
          setPlayerError(error.message ?? 'Unable to load player session');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, courseId]);

  useEffect(() => {
    if (!token || !courseId) {
      setChatMessages([]);
      return;
    }

    let cancelled = false;
    setChatError(null);

    fetchCourseLiveChat(courseId, { token, limit: 50 })
      .then((response) => {
        if (cancelled) return;
        const items = response.data ?? [];
        setChatMessages(items.sort((a, b) => new Date(a.sentAt ?? a.createdAt) - new Date(b.sentAt ?? b.createdAt)));
      })
      .catch((error) => {
        if (!cancelled) {
          setChatError(error.message ?? 'Unable to load live chat');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, courseId]);

  useEffect(() => {
    if (!socket || !courseId) return undefined;

    const handleMessage = (payload) => {
      if (payload.courseId !== courseId) return;
      appendChatMessage(payload.message);
    };

    const handlePresence = (payload) => {
      if (payload.courseId !== courseId) return;
      setPresence(payload.presence ?? { totalViewers: 0, viewers: [] });
    };

    socket.on('course.message', handleMessage);
    socket.on('course.presence', handlePresence);
    socket.emit('course.join', { courseId });

    return () => {
      socket.emit('course.leave', { courseId });
      socket.off('course.message', handleMessage);
      socket.off('course.presence', handlePresence);
    };
  }, [socket, courseId, appendChatMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !token || !courseId) return;
    setChatSending(true);
    setChatError(null);
    try {
      const response = await postCourseLiveChat(courseId, { body: trimmed }, { token });
      const message = response.data ?? null;
      if (message) {
        appendChatMessage(message);
      }
      setChatInput('');
    } catch (error) {
      setChatError(error.message ?? 'Unable to send message');
    } finally {
      setChatSending(false);
    }
  };

  const handleChatKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendChat();
    }
  };

  const presencePreview = useMemo(() => presence.viewers?.slice?.(0, 3) ?? [], [presence]);
  const extraViewers = Math.max(0, (presence.totalViewers ?? 0) - presencePreview.length);

  if (!course) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Course not found or not part of your current programs.</p>
        <Link to="/dashboard/learner/courses" className="text-sm font-semibold text-primary hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Course viewer</p>
          <h1 className="text-2xl font-semibold text-slate-900">{course.title}</h1>
          <p className="text-sm text-slate-600">Facilitated by {course.instructor}</p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="dashboard-primary-pill">
            Launch workspace
          </button>
          <Link to="/dashboard/learner/courses" className="dashboard-pill">
            Back to courses
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Live classroom</h2>
          {playerError ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {playerError}
            </p>
          ) : playerSession?.playback?.url ? (
            <video
              controls
              className="mt-4 w-full rounded-2xl bg-slate-900"
              src={playerSession.playback.url}
            />
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              Live stream will appear when the instructor starts broadcasting.
            </div>
          )}
          {playerSession?.playback && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {presence.totalViewers ?? 0} live {(presence.totalViewers ?? 0) === 1 ? 'viewer' : 'viewers'}
              </span>
              {playerSession.playback.liveEdgeLatencySeconds && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {playerSession.playback.liveEdgeLatencySeconds}s latency
                </span>
              )}
              {playerSession.chat?.channel && (
                <span className="rounded-full bg-slate-100 px-3 py-1">Channel {playerSession.chat.channel}</span>
              )}
            </div>
          )}
          {presencePreview.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              {presencePreview.map((viewer) => (
                <span key={viewer.id ?? viewer.name} className="rounded-full bg-slate-100 px-3 py-1">
                  {viewer.name}
                </span>
              ))}
              {extraViewers > 0 && <span className="text-slate-400">+{extraViewers} more</span>}
            </div>
          )}
        </div>

        <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-800">Live chat</h2>
            <p className="text-xs text-slate-500">Coordinate with peers during the session.</p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {chatError && (
              <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600" role="alert">
                {chatError}
              </p>
            )}
            {chatMessages.map((message) => {
              const isMine = message.user?.id === session?.user?.id;
              return (
                <div key={message.id} className={classNames('flex', isMine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={classNames(
                      'max-w-sm rounded-3xl px-4 py-3 text-sm shadow',
                      isMine ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    <p className={classNames('text-xs font-semibold uppercase tracking-wide', isMine ? 'text-white/70' : 'text-slate-500')}>
                      {message.user?.name ?? 'Learner'}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">{message.body}</p>
                    <p className={classNames('mt-2 text-[10px] uppercase tracking-wide', isMine ? 'text-white/60' : 'text-slate-400')}>
                      {formatChatTimestamp(message.sentAt ?? message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
            {chatMessages.length === 0 && !chatError && (
              <p className="text-xs text-slate-400">Be the first to share a resource or question.</p>
            )}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSendChat();
            }}
            className="border-t border-slate-200 p-4"
          >
            <div className="space-y-2">
              <textarea
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Share a note with the cohort"
                rows={3}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatSending}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {chatSending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Lesson queue</h2>
          <p className="mt-2 text-sm text-slate-600">Dive into the structured journey. Progress auto-saves when you leave.</p>
          <ul className="mt-5 space-y-4">
            {[
              'Lesson 1 · Systems baseline assessment',
              'Lesson 2 · Ritual inventory mapping',
              'Lesson 3 · Sprint retrospectives live lab',
              'Lesson 4 · Automation roundtable'
            ].map((lesson, index) => (
              <li key={lesson} className="dashboard-card-muted p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center dashboard-pill text-sm font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{lesson}</p>
                    {index === 2 ? <p className="text-xs text-primary">Next lesson · {course.nextLesson}</p> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <div className="dashboard-section">
            <h2 className="text-lg font-semibold text-slate-900">Progress</h2>
            <p className="mt-2 text-sm text-slate-600">{course.progress}% complete</p>
            <div className="mt-4 h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark" style={{ width: `${course.progress}%` }} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Next action: {course.nextLesson}</p>
          </div>
          <div className="dashboard-section">
            <h2 className="text-lg font-semibold text-slate-900">Resources</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="dashboard-card-muted px-3 py-2">Program handbook</li>
              <li className="dashboard-card-muted px-3 py-2">Sprint templates</li>
              <li className="dashboard-card-muted px-3 py-2">Mentor office hours</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
