import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import CountdownTimer from '../../components/live/CountdownTimer.jsx';
import LiveChatPanel from '../../components/live/LiveChatPanel.jsx';
import { createCommunityLiveDonation } from '../../api/communityApi.js';
import { checkInToLiveSession, joinLiveSession } from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

function getSessionIdentifier(session) {
  if (!session || typeof session !== 'object') {
    return null;
  }

  const candidates = [
    session.id,
    session.sessionId,
    session.eventId,
    session.slug,
    session.key,
    session.uuid,
    session.externalId,
    session.code,
    session.title
  ];

  for (const value of candidates) {
    if (value != null && value !== '') {
      return String(value);
    }
  }

  return null;
}

function sessionHasReplay(session) {
  if (!session || typeof session !== 'object') {
    return false;
  }

  return Boolean(
    session.replayUrl ||
      session.recordingUrl ||
      session.recording?.url ||
      session.replay?.url ||
      session.replay?.streamUrl ||
      session.replay?.hlsUrl ||
      session.video?.replayUrl ||
      session.stage?.replayUrl
  );
}

function formatSessionLabel(session) {
  if (!session || typeof session !== 'object') {
    return 'Live classroom';
  }

  const base = session.title ?? 'Live classroom';
  const status = typeof session.status === 'string' ? session.status.toLowerCase() : '';
  if (sessionHasReplay(session) || status.includes('complete') || status.includes('replay')) {
    return `${base} — Replay`;
  }
  if (status.includes('live')) {
    return `${base} — Live`;
  }
  if (status.includes('upcoming')) {
    return `${base} — Upcoming`;
  }
  return base;
}

function ReadinessBadge({ status }) {
  const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide';
  if (status === 'ready') {
    return <span className={`${base} bg-emerald-100 text-emerald-700`}>Ready</span>;
  }
  if (status === 'attention') {
    return <span className={`${base} bg-amber-100 text-amber-700`}>Review</span>;
  }
  return <span className={`${base} bg-rose-100 text-rose-700`}>Action</span>;
}

function SessionCard({ session, onAction, pending, onDonate, onFocus, isSelected }) {
  const occupancy = session.occupancy ?? {};
  const occupancyLabel = occupancy.capacity
    ? `${occupancy.reserved ?? 0}/${occupancy.capacity} seats`
    : `${occupancy.reserved ?? 0} registered`;
  const occupancyRate = typeof occupancy.rate === 'number' ? occupancy.rate : null;
  const action = session.callToAction ?? null;
  const security = session.security ?? {};
  const whiteboard = session.whiteboard ?? null;
  const facilitators = Array.isArray(session.facilitators) ? session.facilitators : [];
  const replayAvailable = sessionHasReplay(session);
  const statusLabel = typeof session.status === 'string' ? session.status.toLowerCase() : '';
  const isCompletedSession = statusLabel.includes('complete') || statusLabel.includes('past') || statusLabel.includes('archive');
  const allowFocus = Boolean(onFocus && (!isCompletedSession || replayAvailable));

  const focusLabel = replayAvailable
    ? isSelected
      ? 'Watching replay'
      : 'View replay'
    : isSelected
      ? 'Focused'
      : 'Focus session';

  return (
    <article
      className={`dashboard-card space-y-5 p-5 ${
        isSelected ? 'ring-2 ring-primary/30' : ''
      }`}
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="dashboard-kicker">{session.stage}</p>
          <h3 className="text-lg font-semibold text-slate-900">{session.title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {session.startLabel}
            {session.timezone ? ` • ${session.timezone}` : ''}
            {session.community ? ` • ${session.community}` : ''}
          </p>
          {session.summary && <p className="mt-3 text-sm text-slate-500">{session.summary}</p>}
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <UsersIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            {occupancyLabel}
            {occupancyRate !== null && (
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  occupancyRate >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {occupancyRate}% fill
              </span>
            )}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {action && (
              <button
                type="button"
                disabled={action.enabled === false || pending}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  action.action === 'join' || action.action === 'check-in'
                    ? 'bg-primary text-white shadow-sm hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500'
                    : 'border border-slate-200 text-slate-700 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400'
                }`}
                onClick={() => onAction?.(session, action.action)}
              >
                {pending ? 'Processing…' : action.label}
              </button>
            )}
            {session.communityId && (
              <button
                type="button"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onClick={() => onDonate?.(session)}
                disabled={pending}
              >
                Send donation
              </button>
            )}
            {allowFocus ? (
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  isSelected
                    ? 'border-primary bg-primary text-white shadow-sm'
                    : 'border-slate-200 text-slate-700 hover:border-primary hover:text-primary'
                }`}
                onClick={() => onFocus(session)}
                disabled={isSelected}
              >
                {focusLabel}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <ClockIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Session status</p>
            <p className="text-sm text-slate-700 capitalize">{session.status.replace('-', ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <ShieldCheckIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Security controls</p>
            <p className="text-sm text-slate-700">
              {security.waitingRoom ? 'Waiting room enforced' : 'Direct entry'} ·{' '}
              {security.passcodeRequired ? 'Passcode required' : 'No passcode'}
            </p>
          </div>
        </div>
      </div>

      {whiteboard && (whiteboard.template || whiteboard.url) && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live board</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{whiteboard.template}</span>
            {whiteboard.lastUpdatedLabel && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                Updated {whiteboard.lastUpdatedLabel}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                whiteboard.ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {whiteboard.ready ? 'Ready' : 'In prep'}
            </span>
          </div>
          {facilitators.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">Facilitators: {facilitators.join(', ')}</p>
          )}
        </div>
      )}

      {session.breakoutRooms?.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Breakout rooms</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {session.breakoutRooms.map((room) => (
              <span
                key={`${session.id}-${room.name}`}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm"
              >
                {room.name}
                {room.capacity ? ` • ${room.capacity} seats` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function DonationDialog({ open, session, onClose, onSubmit, submitting, status }) {
  const [amount, setAmount] = useState('20.00');
  const [donorName, setDonorName] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (open) {
      setAmount('20.00');
      setDonorName('');
      setAffiliateCode('');
      setMessage('');
      setFormError(null);
    }
  }, [open, session]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const numericAmount = Number.parseFloat(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError('Enter a valid donation amount greater than zero.');
      return;
    }
    setFormError(null);
    const payload = {
      amountCents: Math.round(numericAmount * 100),
      currency: (session?.currency ?? 'USD').toUpperCase(),
      provider: 'stripe',
      donorName: donorName.trim() ? donorName.trim() : undefined,
      affiliateCode: affiliateCode.trim() ? affiliateCode.trim().toUpperCase() : undefined,
      message: message.trim() ? message.trim() : undefined,
      eventId: session?.eventId ?? session?.id ?? null
    };
    await onSubmit?.(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Support the host</p>
            <h2 className="text-lg font-semibold text-slate-900">
              {session?.title ?? 'Live session'}
            </h2>
            {session?.community && (
              <p className="text-sm text-slate-500">{session.community}</p>
            )}
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-400 hover:text-slate-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Donation amount
            </label>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {(session?.currency ?? 'USD').toUpperCase()}
              </span>
              <input
                type="number"
                min="1"
                step="0.50"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="20.00"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Display name (optional)
              </label>
              <input
                type="text"
                value={donorName}
                maxLength={120}
                onChange={(event) => setDonorName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="How should we credit you?"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Affiliate code
              </label>
              <input
                type="text"
                value={affiliateCode}
                maxLength={60}
                onChange={(event) => setAffiliateCode(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Message to the host
            </label>
            <textarea
              value={message}
              maxLength={500}
              onChange={(event) => setMessage(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Cheer them on with a note!"
            />
          </div>

          {formError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>
          )}

          {status && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                status.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              <p>{status.message}</p>
              {status.payment?.paymentId && (
                <p className="mt-1 text-xs text-slate-600">Payment reference: {status.payment.paymentId}</p>
              )}
              {status.intent?.status && (
                <p className="mt-1 text-xs text-slate-500">Intent status: {status.intent.status}</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              disabled={submitting}
            >
              {submitting ? 'Preparing checkout…' : 'Start checkout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LearnerLiveClasses() {
  const { dashboard, refresh } = useOutletContext();
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [statusMessage, setStatusMessage] = useState(null);
  const [pendingSessionId, setPendingSessionId] = useState(null);
  const [donationSession, setDonationSession] = useState(null);
  const [donationSubmitting, setDonationSubmitting] = useState(false);
  const [donationStatus, setDonationStatus] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine === false : false
  );
  const [sessionTags, setSessionTags] = useState([]);
  const [recentReactions, setRecentReactions] = useState([]);
  const [helpfulSuggestionIds, setHelpfulSuggestionIds] = useState([]);

  const { data, loading, error } = useMemo(() => {
    const section = dashboard?.liveClassrooms;
    if (section && typeof section === 'object' && ('data' in section || 'loading' in section || 'error' in section)) {
      return {
        data: section.data ?? null,
        loading: Boolean(section.loading ?? (section.status === 'loading')),
        error: section.error ?? null
      };
    }
    return { data: section ?? null, loading: false, error: null };
  }, [dashboard?.liveClassrooms]);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return undefined;
  }, []);

  const handleSessionAction = useCallback(
    async (sessionItem, action) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage live sessions.' });
        return;
      }

      setPendingSessionId(sessionItem.id);
      setStatusMessage({ type: 'pending', message: `Connecting to ${sessionItem.title}…` });
      try {
        const api = action === 'check-in' ? checkInToLiveSession : joinLiveSession;
        const response = await api({ token, sessionId: sessionItem.id });
        setStatusMessage({ type: 'success', message: response?.message ?? 'Live session action completed.' });
      } catch (sessionError) {
        setStatusMessage({
          type: 'error',
          message:
            sessionError instanceof Error ? sessionError.message : 'We were unable to complete that session action.'
        });
      } finally {
        setPendingSessionId(null);
      }
    },
    [token]
  );

  const handleDonationOpen = useCallback((sessionItem) => {
    if (!sessionItem?.communityId) {
      setStatusMessage({ type: 'error', message: 'This session is not configured to receive donations yet.' });
      return;
    }
    setDonationSession(sessionItem);
    setDonationStatus(null);
  }, []);

  const handleDonationSubmit = useCallback(
    async (payload) => {
      if (!donationSession?.communityId) {
        setDonationStatus({ type: 'error', message: 'Community information is missing for this donation.' });
        return;
      }
      if (!token) {
        setDonationStatus({ type: 'error', message: 'Sign in again to start a donation checkout.' });
        return;
      }
      setDonationSubmitting(true);
      try {
        const response = await createCommunityLiveDonation({
          communityId: donationSession.communityId,
          token,
          payload
        });
        setDonationStatus({
          type: 'success',
          message: response?.message ?? 'Donation checkout initiated.',
          payment: response?.data?.payment ?? null,
          intent: response?.data?.intent ?? null
        });
      } catch (error) {
        setDonationStatus({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'We were unable to prepare the donation checkout.'
        });
      } finally {
        setDonationSubmitting(false);
      }
    },
    [donationSession?.communityId, token]
  );

  const handleDonationClose = useCallback(() => {
    setDonationSession(null);
    setDonationStatus(null);
    setDonationSubmitting(false);
  }, []);

  if (loading) {
    return (
      <DashboardStateMessage
        title="Loading live classrooms"
        description="We are synchronising your upcoming sessions and readiness checks."
      />
    );
  }

  if (error) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Live classrooms unavailable"
        description={error.message ?? 'We were unable to load your learner live classroom workspace.'}
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  if (!data) {
    return (
      <DashboardStateMessage
        title="Live classrooms unavailable"
        description="We couldn't find an active live classroom schedule for your learner Learnspace. Refresh to pull the latest data."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const metrics = Array.isArray(data.metrics) ? data.metrics : [];
  const active = Array.isArray(data.active) ? data.active : [];
  const upcoming = Array.isArray(data.upcoming) ? data.upcoming : [];
  const completed = Array.isArray(data.completed) ? data.completed : [];
  const groups = Array.isArray(data.groups) ? data.groups : [];
  const whiteboardSnapshots = Array.isArray(data.whiteboard?.snapshots) ? data.whiteboard.snapshots : [];
  const readiness = Array.isArray(data.whiteboard?.readiness) ? data.whiteboard.readiness : [];

  const availableSessions = useMemo(() => {
    const combined = [];
    const seen = new Set();

    const pushSession = (sessionItem, include = true) => {
      if (!sessionItem || include === false) {
        return;
      }
      const identifier = getSessionIdentifier(sessionItem) ?? sessionItem.title ?? null;
      const key = identifier ?? `session-${combined.length}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      combined.push(sessionItem);
    };

    active.forEach((sessionItem) => pushSession(sessionItem));
    upcoming.forEach((sessionItem) => pushSession(sessionItem));
    completed.forEach((sessionItem) => pushSession(sessionItem, sessionHasReplay(sessionItem)));

    return combined;
  }, [active, upcoming, completed]);

  useEffect(() => {
    if (availableSessions.length === 0) {
      setActiveSessionId(null);
      return;
    }
    const fallback = availableSessions[0];
    const fallbackId = getSessionIdentifier(fallback);
    const hasCurrent = activeSessionId
      ? availableSessions.some((sessionItem) => getSessionIdentifier(sessionItem) === activeSessionId)
      : false;
    if (!hasCurrent && fallbackId) {
      setActiveSessionId(fallbackId);
    }
  }, [availableSessions, activeSessionId]);

  const selectedSession = useMemo(() => {
    if (availableSessions.length === 0) {
      return null;
    }
    if (!activeSessionId) {
      return availableSessions[0];
    }
    return (
      availableSessions.find((sessionItem) => getSessionIdentifier(sessionItem) === activeSessionId) ??
      availableSessions[0]
    );
  }, [availableSessions, activeSessionId]);

  useEffect(() => {
    if (!selectedSession) {
      setChatMessages([]);
      setChatInput('');
      setHelpfulSuggestionIds([]);
      return;
    }
    const historySource = Array.isArray(selectedSession.chat?.messages)
      ? selectedSession.chat.messages
      : Array.isArray(selectedSession.chatHistory)
        ? selectedSession.chatHistory
        : [];
    const normalised = historySource
      .map((entry, index) => ({
        id: entry?.id ?? `message-${index}`,
        author: entry?.author ?? entry?.sender ?? (entry?.role === 'system' ? 'System' : 'Facilitator'),
        role: entry?.role ?? entry?.authorRole ?? (entry?.author ? 'participant' : 'system'),
        body: entry?.body ?? entry?.text ?? entry?.message ?? '',
        createdAt: entry?.createdAt ?? entry?.timestamp ?? entry?.sentAt ?? new Date().toISOString(),
        attachments: Array.isArray(entry?.attachments) ? entry.attachments : []
      }))
      .filter((entry) => entry.body);
    setChatMessages(normalised);
    setChatInput('');
    setHelpfulSuggestionIds([]);
    const defaultTags = Array.isArray(selectedSession.analyticsTags)
      ? selectedSession.analyticsTags
      : Array.isArray(selectedSession.tags)
        ? selectedSession.tags
        : [];
    setSessionTags(
      defaultTags
        .map((tag) => {
          const value = typeof tag === 'string' ? tag : tag.value ?? tag.id ?? tag.label;
          return value != null ? String(value) : null;
        })
        .filter(Boolean)
    );
  }, [selectedSession]);

  const videoSource = useMemo(() => {
    if (!selectedSession) {
      return null;
    }
    const baseStream =
      selectedSession.streamUrl ??
      selectedSession.video?.streamUrl ??
      selectedSession.videoUrl ??
      selectedSession.stage?.streamUrl ??
      selectedSession.replay?.streamUrl ??
      selectedSession.replay?.hlsUrl ??
      selectedSession.replayUrl ??
      selectedSession.video?.replayUrl ??
      selectedSession.recording?.url ??
      selectedSession.recordingUrl ??
      null;
    if (!baseStream) {
      return null;
    }
    if (selectedQuality === 'auto') {
      return baseStream;
    }
    const separator = baseStream.includes('?') ? '&' : '?';
    return `${baseStream}${separator}quality=${selectedQuality}`;
  }, [selectedSession, selectedQuality]);

  const stagePoster = useMemo(() => {
    if (!selectedSession) {
      return undefined;
    }
    return (
      selectedSession.posterUrl ??
      selectedSession.coverImage ??
      selectedSession.thumbnail ??
      selectedSession.replay?.thumbnail ??
      selectedSession.recording?.thumbnail ??
      undefined
    );
  }, [selectedSession]);

  const attendance = useMemo(() => {
    if (!selectedSession) {
      return [];
    }
    const attendees = Array.isArray(selectedSession.attendees)
      ? selectedSession.attendees
      : Array.isArray(selectedSession.participants)
        ? selectedSession.participants
        : [];
    return attendees.map((attendee, index) => ({
      id: attendee?.id ?? `attendee-${index}`,
      name: attendee?.name ?? attendee?.fullName ?? attendee?.displayName ?? attendee ?? 'Learner',
      role: attendee?.role ?? attendee?.type ?? 'Participant',
      status: attendee?.status ?? (attendee?.joinedAt ? 'Checked in' : 'Registered')
    }));
  }, [selectedSession]);

  const chatParticipants = useMemo(() => {
    if (!selectedSession) {
      return [];
    }
    const facilitators = Array.isArray(selectedSession.facilitators) ? selectedSession.facilitators : [];
    const participantNames = attendance.map((entry) => entry.name).filter(Boolean);
    return Array.from(new Set([...facilitators, ...participantNames])).slice(0, 12);
  }, [attendance, selectedSession]);

  const stageSuggestions = useMemo(() => {
    if (!selectedSession) {
      return [];
    }
    const articles = Array.isArray(selectedSession.knowledgeBase)
      ? selectedSession.knowledgeBase
      : Array.isArray(selectedSession.replay?.knowledgeBase)
        ? selectedSession.replay.knowledgeBase
        : Array.isArray(selectedSession.supportArticles)
        ? selectedSession.supportArticles
        : [];
    return articles
      .filter((article) => article && article.title)
      .map((article, index) => ({
        id: article.id ?? article.slug ?? `article-${index}`,
        title: article.title,
        excerpt: article.excerpt ?? article.summary ?? '',
        url: article.url ?? '#',
        minutes: Number.isFinite(Number(article.minutes ?? article.readTime))
          ? Number(article.minutes ?? article.readTime)
          : 3
      }));
  }, [selectedSession]);

  const availableTags = useMemo(() => {
    if (!selectedSession) {
      return [];
    }
    const tags = Array.isArray(selectedSession.analyticsTags)
      ? selectedSession.analyticsTags
      : Array.isArray(selectedSession.tags)
        ? selectedSession.tags
        : ['live-support', 'workshop', 'campaign'];
    return tags.map((tag, index) => {
      if (typeof tag === 'string') {
        return {
          id: tag,
          value: String(tag),
          label: tag.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
        };
      }
      const rawValue = tag.value ?? tag.id ?? `tag-${index}`;
      const value = String(rawValue);
      const label = (tag.label ?? tag.name ?? value).replace(/[-_]/g, ' ');
      return { id: value, value, label: label.replace(/\b\w/g, (char) => char.toUpperCase()) };
    });
  }, [selectedSession]);

  const reactionsToShow = useMemo(() => recentReactions.slice(0, 6), [recentReactions]);
  const reactionOptions = useMemo(() => ['👏', '🔥', '💡', '❤️', '🎉'], []);
  const qualityOptions = useMemo(() => ['auto', '1080p', '720p', '480p'], []);

  const handleSendChat = useCallback(() => {
    const trimmed = chatInput.trim();
    if (!trimmed) {
      return;
    }
    setSendingMessage(true);
    const timestamp = Date.now();
    const newMessage = {
      id: `local-${timestamp}`,
      author: 'You',
      role: 'learner',
      body: trimmed,
      createdAt: new Date(timestamp).toISOString(),
      attachments: []
    };
    setChatMessages((current) => [...current, newMessage]);
    setChatInput('');
    setTimeout(() => {
      setSendingMessage(false);
    }, 250);
  }, [chatInput]);

  const handleSuggestionSelect = useCallback((article) => {
    if (!article) {
      return;
    }
    const snippet = `${article.title}${article.url ? ` — ${article.url}` : ''}`;
    setChatInput((current) => {
      if (!current) {
        return snippet;
      }
      return `${current}\n${snippet}`;
    });
  }, []);

  const handleToggleSuggestionHelpful = useCallback((articleId) => {
    setHelpfulSuggestionIds((current) => {
      if (current.includes(articleId)) {
        return current.filter((id) => id !== articleId);
      }
      return [...current, articleId];
    });
  }, []);

  const handleReaction = useCallback(
    (reaction) => {
      const entry = { id: `reaction-${Date.now()}`, symbol: reaction, timestamp: Date.now() };
      setRecentReactions((current) => [entry, ...current].slice(0, 12));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('edulure:live-reaction', {
            detail: {
              reaction,
              sessionId: selectedSession?.id ?? null,
              sessionTitle: selectedSession?.title ?? null
            }
          })
        );
      }
    },
    [selectedSession]
  );

  const handleTagToggle = useCallback(
    (tagValue) => {
      setSessionTags((current) => {
        const exists = current.includes(tagValue);
        const next = exists ? current.filter((value) => value !== tagValue) : [...current, tagValue];
        if (typeof window !== 'undefined') {
          if (!Array.isArray(window.dataLayer)) {
            window.dataLayer = [];
          }
          window.dataLayer.push({
            event: 'live-session-tagged',
            action: exists ? 'removed' : 'added',
            tag: tagValue,
            sessionId: selectedSession?.id ?? null,
            sessionTitle: selectedSession?.title ?? null
          });
        }
        return next;
      });
    },
    [selectedSession]
  );

  const countdownTarget = selectedSession?.startAt ?? selectedSession?.startsAt ?? selectedSession?.startDate ?? null;
  const sessionStatus = (selectedSession?.status ?? '').toLowerCase();
  const isLiveSession = sessionStatus.includes('live');
  const isReplaySession = sessionHasReplay(selectedSession) || sessionStatus.includes('complete') || sessionStatus.includes('replay');
  const isUpcomingSession = !isLiveSession && !isReplaySession;
  const chatReadOnly = Boolean(
    selectedSession &&
      (selectedSession.chat?.allowReplies === false ||
        selectedSession.chat?.locked === true ||
        selectedSession.chat?.status === 'archived' ||
        (isReplaySession && selectedSession.chat?.allowReplies !== true))
  );
  const chatDisabled = !selectedSession || chatReadOnly;
  const chatPlaceholder = chatReadOnly
    ? 'Chat replies are closed for this session replay.'
    : 'Share a thought with the room…';
  const chatComposerNotice = chatReadOnly ? (
    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
      Chat replies are disabled for this replay. Review the timeline above for context.
    </p>
  ) : null;

  const handleFocusSession = useCallback((sessionItem) => {
    const identifier = getSessionIdentifier(sessionItem);
    if (!identifier) {
      return;
    }
    setActiveSessionId(identifier);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return (
    <>
      <div className="space-y-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="dashboard-title">Live classrooms</h1>
            <p className="dashboard-subtitle">
              Join cohort experiences, monitor security controls, and keep collaborative whiteboards prepped for every live moment.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {availableSessions.length > 0 ? (
              <label className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                <span>Focus session</span>
                <select
                  value={
                    activeSessionId ??
                    (availableSessions[0] ? getSessionIdentifier(availableSessions[0]) ?? '' : '')
                  }
                  onChange={(event) => setActiveSessionId(event.target.value)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {availableSessions.map((sessionItem) => (
                    <option
                      key={getSessionIdentifier(sessionItem) ?? sessionItem.id ?? `session-${sessionItem.title ?? 'live'}`}
                      value={getSessionIdentifier(sessionItem) ?? ''}
                    >
                      {formatSessionLabel(sessionItem)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button type="button" className="dashboard-pill" onClick={() => refresh?.()}>
              Refresh schedule
            </button>
          </div>
        </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5 rounded-4xl border border-slate-200 bg-white/90 p-5 shadow-xl">
          {selectedSession ? (
            <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="dashboard-kicker">{selectedSession.stage ?? selectedSession.type ?? 'Live classroom'}</p>
                  <h2 className="text-2xl font-semibold text-slate-900">{selectedSession.title ?? 'Live session'}</h2>
                  {selectedSession.summary ? (
                    <p className="text-sm text-slate-600">{selectedSession.summary}</p>
                  ) : null}
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {selectedSession.startLabel ?? selectedSession.startsAt ?? selectedSession.startAt ?? 'Schedule to be announced'}
                    {selectedSession.timezone ? ` • ${selectedSession.timezone}` : ''}
                    {selectedSession.community ? ` • ${selectedSession.community}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  {isReplaySession ? (
                    <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />
                      Replay ready
                    </div>
                  ) : countdownTarget && isUpcomingSession ? (
                    <CountdownTimer targetTime={countdownTarget} label="Countdown to go live" />
                  ) : (
                    <div className="flex items-center gap-2 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                      Live now
                    </div>
                  )}
                  {isOffline ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      Offline mode
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl">
                {videoSource ? (
                  <video
                    key={`${videoSource}-${captionsEnabled}`}
                    className="aspect-video w-full"
                    controls
                    playsInline
                    poster={stagePoster}
                  >
                    <source src={videoSource} type="application/x-mpegURL" />
                    <source src={videoSource} type="video/mp4" />
                    {captionsEnabled && (selectedSession.captionsUrl || selectedSession.subtitleUrl) ? (
                      <track
                        key="captions"
                        kind="captions"
                        src={selectedSession.captionsUrl ?? selectedSession.subtitleUrl}
                        srcLang="en"
                        label="English"
                        default
                      />
                    ) : null}
                    Your browser does not support live video playback.
                  </video>
                ) : (
                  <div className="aspect-video flex items-center justify-center bg-slate-900 p-6 text-center text-sm text-slate-200">
                    Stream link coming soon. We will notify you once the facilitator connects.
                  </div>
                )}
                {isOffline ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/85 p-6 text-center">
                    <p className="text-lg font-semibold">You are offline</p>
                    <p className="text-sm text-slate-200">
                      Reconnect to resume the live stream. Chat and notes remain available in the meantime.
                    </p>
                  </div>
                ) : null}
                <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white">
                  <span className="rounded-full bg-white/20 px-3 py-1">
                    {selectedQuality === 'auto' ? 'Auto quality' : `${selectedQuality} stream`}
                  </span>
                  <span className="rounded-full bg-white/20 px-3 py-1">
                    {selectedSession.stage ?? 'Stage view'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/70 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <label className="inline-flex items-center gap-2 text-slate-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                        checked={captionsEnabled}
                        onChange={(event) => setCaptionsEnabled(event.target.checked)}
                      />
                      Captions enabled
                    </label>
                    <div className="inline-flex items-center gap-2">
                      <span>Quality</span>
                      <select
                        value={selectedQuality}
                        onChange={(event) => setSelectedQuality(event.target.value)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {qualityOptions.map((quality) => (
                          <option key={quality} value={quality}>
                            {quality === 'auto' ? 'Auto' : quality}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {reactionOptions.map((reaction) => (
                      <button
                        key={reaction}
                        type="button"
                        onClick={() => handleReaction(reaction)}
                        className="rounded-full bg-primary/10 px-3 py-1 text-base font-semibold text-primary transition hover:bg-primary hover:text-white"
                      >
                        {reaction}
                      </button>
                    ))}
                  </div>
                </div>
                {reactionsToShow.length > 0 ? (
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {reactionsToShow.map((reaction) => (
                      <span
                        key={reaction.id}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-600"
                      >
                        <span className="text-base">{reaction.symbol}</span>
                        Reacted moments ago
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attendance</p>
                {attendance.length > 0 ? (
                  <ul className="mt-3 grid gap-2 md:grid-cols-2">
                    {attendance.map((attendee) => (
                      <li
                        key={attendee.id}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{attendee.name}</p>
                          <p className="text-xs uppercase tracking-wide text-slate-400">{attendee.role}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            attendee.status.toLowerCase().includes('check')
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {attendee.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">Attendance will populate once learners join the session.</p>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Session analytics tags</p>
                {availableTags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableTags.map((tag) => {
                      const activeTag = sessionTags.includes(tag.value);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagToggle(tag.value)}
                          className={`rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            activeTag
                              ? 'bg-primary text-white shadow-sm'
                              : 'border border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                          }`}
                        >
                          {tag.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Tags will appear once the facilitation team assigns analytics segments for this session.
                  </p>
                )}
              </div>
            </>
          ) : (
            <DashboardStateMessage
              title="No active live classroom selected"
              description="Schedule or pick an upcoming session to unlock the stage view, chat, and analytics tags."
            />
          )}
        </div>
        <LiveChatPanel
          title={selectedSession ? `${selectedSession.title ?? 'Live session'} chat` : 'Live chat'}
          description="Keep the room energised and share resources as you facilitate."
          messages={chatMessages}
          composerValue={chatInput}
          onComposerChange={setChatInput}
          onSend={handleSendChat}
          sending={sendingMessage}
          disabled={chatDisabled}
          suggestions={stageSuggestions}
          onSuggestionSelect={handleSuggestionSelect}
          helpfulSuggestionIds={helpfulSuggestionIds}
          onToggleSuggestionHelpful={handleToggleSuggestionHelpful}
          participants={chatParticipants}
          placeholder={chatPlaceholder}
          composerFooter={chatComposerNotice}
        />
      </section>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Live session health</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="dashboard-kicker">{metric.label}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{metric.value}</p>
              {metric.change && (
                <p
                  className={`mt-2 text-sm font-medium ${
                    metric.trend === 'down' ? 'text-rose-500' : 'text-emerald-600'
                  }`}
                >
                  {metric.change}
                </p>
              )}
            </div>
          ))}
          {metrics.length === 0 && (
            <p className="col-span-full text-sm text-slate-500">
              No active live classrooms yet. Once scheduled, live session health metrics will appear here.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Active sessions</h2>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <SparklesIcon className="h-4 w-4" aria-hidden="true" />
            {active.length} running
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((sessionItem) => (
            <SessionCard
              key={sessionItem.id}
              session={sessionItem}
              onAction={handleSessionAction}
              pending={pendingSessionId === sessionItem.id}
              onDonate={handleDonationOpen}
              onFocus={handleFocusSession}
              isSelected={getSessionIdentifier(sessionItem) === activeSessionId}
            />
          ))}
          {active.length === 0 && (
            <DashboardStateMessage
              title="No active sessions"
              description="You do not have any active live classrooms right now. Join upcoming sessions below."
            />
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming sessions</h2>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
            {upcoming.length} scheduled
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {upcoming.map((sessionItem) => (
            <SessionCard
              key={sessionItem.id}
              session={sessionItem}
              onAction={handleSessionAction}
              pending={pendingSessionId === sessionItem.id}
              onDonate={handleDonationOpen}
              onFocus={handleFocusSession}
              isSelected={getSessionIdentifier(sessionItem) === activeSessionId}
            />
          ))}
          {upcoming.length === 0 && (
            <DashboardStateMessage
              title="No upcoming sessions"
              description="All caught up! New live experiences will appear here when they are scheduled."
            />
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Completed sessions</h2>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
            {completed.length} archived
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {completed.map((sessionItem) => (
            <SessionCard
              key={sessionItem.id}
              session={sessionItem}
              onAction={handleSessionAction}
              pending={false}
              onDonate={handleDonationOpen}
              onFocus={handleFocusSession}
              isSelected={getSessionIdentifier(sessionItem) === activeSessionId}
            />
          ))}
          {completed.length === 0 && (
            <DashboardStateMessage
              title="No completed sessions"
              description="Once sessions wrap up, they will appear here with readiness insights and recaps."
            />
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="dashboard-card space-y-4 p-5">
          <header className="flex items-center gap-3">
            <ShieldCheckIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Security readiness</h2>
              <p className="text-sm text-slate-600">Keep waiting rooms, passcodes, and moderator checklists aligned.</p>
            </div>
          </header>
          <ul className="space-y-2 text-sm text-slate-600">
            {readiness.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                <div className="flex items-center gap-2">
                  <ReadinessBadge status={item.status} />
                  <span>{item.label}</span>
                </div>
                <span className="text-xs text-slate-500">{item.owner}</span>
              </li>
            ))}
            {readiness.length === 0 && <li className="text-xs text-slate-500">No readiness alerts at this time.</li>}
          </ul>
        </article>

        <article className="dashboard-card space-y-4 p-5">
          <header className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Groups & cohorts</h2>
              <p className="text-sm text-slate-600">Track which cohorts are aligned to upcoming live classrooms.</p>
            </div>
          </header>
          <ul className="space-y-2 text-sm text-slate-600">
            {groups.map((group) => (
              <li key={group.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                <span>{group.name}</span>
                <span className="text-xs text-slate-500">{group.members} learners</span>
              </li>
            ))}
            {groups.length === 0 && <li className="text-xs text-slate-500">No cohorts assigned to live classrooms yet.</li>}
          </ul>
        </article>
      </section>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Whiteboard snapshots</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {whiteboardSnapshots.map((snapshot) => (
            <div key={snapshot.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="dashboard-kicker">{snapshot.template}</p>
              <p className="mt-2 text-sm text-slate-600">{snapshot.summary}</p>
              <p className="mt-3 text-xs text-slate-500">Updated {snapshot.updatedAt}</p>
            </div>
          ))}
          {whiteboardSnapshots.length === 0 && (
            <DashboardStateMessage
              title="No whiteboard snapshots"
              description="Collaborative boards will appear here when facilitators share templates or updates."
            />
          )}
        </div>
      </section>

      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-3xl border px-5 py-4 text-sm ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : statusMessage.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-primary/20 bg-primary/5 text-primary'
          }`}
        >
          {statusMessage.message}
        </div>
      ) : null}
      </div>
      <DonationDialog
        open={Boolean(donationSession)}
        session={donationSession}
        onClose={handleDonationClose}
        onSubmit={handleDonationSubmit}
        submitting={donationSubmitting}
        status={donationStatus}
      />
    </>
  );
}
