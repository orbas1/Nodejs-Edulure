import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { createCommunityLiveDonation } from '../../api/communityApi.js';
import { checkInToLiveSession, joinLiveSession } from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import ScheduleGrid from '../../components/scheduling/ScheduleGrid.jsx';
import { enqueueLiveSessionAction, flushLiveSessionQueue } from '../../utils/liveSessionQueue.js';
import {
  formatDashboardDate,
  formatDashboardDateTime,
  formatDashboardRelative,
  formatDashboardWindow,
  getDashboardUrgency
} from '../../utils/dashboardFormatting.js';

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

function SessionCard({ session, onAction, pending, onDonate }) {
  const occupancy = session.occupancy ?? {};
  const occupancyLabel = occupancy.capacity
    ? `${occupancy.reserved ?? 0}/${occupancy.capacity} seats`
    : `${occupancy.reserved ?? 0} registered`;
  const occupancyRate = typeof occupancy.rate === 'number' ? occupancy.rate : null;
  const action = session.callToAction ?? null;
  const security = session.security ?? {};
  const whiteboard = session.whiteboard ?? null;
  const facilitators = Array.isArray(session.facilitators) ? session.facilitators : [];
  const attendance = session.attendance ?? {};
  const attendanceSummary = Number.isFinite(Number(attendance.total)) ? Number(attendance.total) : null;
  const relativeStart = session.startAt ? formatDashboardRelative(session.startAt) : null;

  return (
    <article className="dashboard-card space-y-5 p-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="dashboard-kicker">{session.stage}</p>
          <h3 className="text-lg font-semibold text-slate-900">{session.title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {session.startLabel}
            {session.timezone ? ` • ${session.timezone}` : ''}
            {session.community ? ` • ${session.community}` : ''}
            {relativeStart ? ` • ${relativeStart}` : ''}
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
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <WifiIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attendance</p>
            <p className="text-sm text-slate-700">
              {attendanceSummary !== null ? `${attendanceSummary} checkpoint${attendanceSummary === 1 ? '' : 's'}` : 'No checkpoints yet'}
              {attendance.lastRecordedLabel ? ` • ${attendance.lastRecordedLabel}` : ''}
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

function describeSessionStage(session) {
  if (session.stage) {
    return session.stage;
  }
  const start = session.startAt ?? session.startTime ?? null;
  const urgency = getDashboardUrgency(start);
  if (urgency === 'overdue') {
    return 'Completed';
  }
  if (urgency === 'soon') {
    return 'Upcoming';
  }
  return 'Scheduled';
}

function normaliseLiveSession(session) {
  if (!session) return null;
  const start = session.startAt ?? session.startTime ?? session.beginAt ?? null;
  const end = session.endAt ?? session.endTime ?? session.finishAt ?? null;
  const timezone = session.timezone ?? session.tz ?? session.timeZone ?? null;
  const startLabel =
    session.startLabel ?? formatDashboardWindow(start, end, { timezone, fallback: 'Schedule pending' });
  const attendance = session.attendance ?? {};
  const attendanceLabel = attendance.lastRecordedLabel
    ? attendance.lastRecordedLabel
    : attendance.lastRecordedAt
      ? formatDashboardRelative(attendance.lastRecordedAt)
      : null;
  const whiteboard = session.whiteboard
    ? {
        ...session.whiteboard,
        lastUpdatedLabel:
          session.whiteboard.lastUpdatedLabel ??
          (session.whiteboard.updatedAt
            ? formatDashboardRelative(session.whiteboard.updatedAt)
            : null)
      }
    : null;

  return {
    ...session,
    startAt: start,
    endAt: end,
    timezone,
    startLabel,
    stage: describeSessionStage(session),
    attendance: {
      ...attendance,
      lastRecordedLabel: attendanceLabel
    },
    whiteboard
  };
}

function normaliseSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    ...snapshot,
    updatedAt: snapshot.updatedAt
      ? formatDashboardDateTime(snapshot.updatedAt, { fallback: 'Recently' })
      : snapshot.updatedAt,
    displayDate: snapshot.updatedAt ? formatDashboardDate(snapshot.updatedAt) : null
  };
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
  const activeRef = useRef([]);
  const upcomingRef = useRef([]);

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
    activeRef.current = Array.isArray(data?.active) ? data.active : [];
    upcomingRef.current = Array.isArray(data?.upcoming) ? data.upcoming : [];
  }, [data?.active, data?.upcoming]);

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
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        if (offline) {
          enqueueLiveSessionAction({ sessionId: sessionItem.id, action });
          setStatusMessage({
            type: 'warning',
            message: `We saved your ${action === 'check-in' ? 'check-in' : 'join'} for ${sessionItem.title}. It will retry when you are back online.`
          });
          return;
        }
        const response = await api({ token, sessionId: sessionItem.id });
        setStatusMessage({ type: 'success', message: response?.message ?? 'Live session action completed.' });
      } catch (sessionError) {
        const offlineLikely =
          sessionError instanceof TypeError || (typeof navigator !== 'undefined' && navigator.onLine === false);
        if (offlineLikely) {
          enqueueLiveSessionAction({ sessionId: sessionItem.id, action });
          setStatusMessage({
            type: 'warning',
            message: `Connection issues detected. We'll retry the ${action === 'check-in' ? 'check-in' : 'join'} for ${sessionItem.title} shortly.`
          });
        } else {
          setStatusMessage({
            type: 'error',
            message:
              sessionError instanceof Error ? sessionError.message : 'We were unable to complete that session action.'
          });
        }
      } finally {
        setPendingSessionId(null);
      }
    },
    [token]
  );

  const handleGridSelect = useCallback(
    (event) => {
      const target = [...activeRef.current, ...upcomingRef.current].find((item) => item.id === event.id);
      if (!target) {
        return;
      }
      const action = target.callToAction?.action;
      if (action) {
        handleSessionAction(target, action);
      }
    },
    [handleSessionAction]
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

  useEffect(() => {
    if (!token) {
      return undefined;
    }
    let cancelled = false;

    const executeFlush = async () => {
      const shouldFlush = typeof navigator === 'undefined' || navigator.onLine !== false;
      if (!shouldFlush) {
        return;
      }
      const results = await flushLiveSessionQueue({
        token,
        executor: async ({ sessionId, action, token: entryToken }) => {
          const api = action === 'check-in' ? checkInToLiveSession : joinLiveSession;
          await api({ token: entryToken ?? token, sessionId });
        }
      });
      if (!cancelled && results.some((result) => result.status === 'fulfilled')) {
        setStatusMessage({ type: 'success', message: 'Queued live session actions synced successfully.' });
        refresh?.();
      }
    };

    executeFlush();

    if (typeof window !== 'undefined') {
      const onlineHandler = () => executeFlush();
      window.addEventListener('online', onlineHandler);
      return () => {
        cancelled = true;
        window.removeEventListener('online', onlineHandler);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

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
  const active = (Array.isArray(data.active) ? data.active : []).map(normaliseLiveSession).filter(Boolean);
  const upcoming = (Array.isArray(data.upcoming) ? data.upcoming : [])
    .map(normaliseLiveSession)
    .filter(Boolean);
  const completed = (Array.isArray(data.completed) ? data.completed : [])
    .map(normaliseLiveSession)
    .filter(Boolean);
  const groups = Array.isArray(data.groups) ? data.groups : [];
  const whiteboardSnapshots = (Array.isArray(data.whiteboard?.snapshots) ? data.whiteboard.snapshots : [])
    .map(normaliseSnapshot)
    .filter(Boolean);
  const readiness = Array.isArray(data.whiteboard?.readiness) ? data.whiteboard.readiness : [];
  const scheduleEvents = [...active, ...upcoming].map((sessionItem) => ({
    id: sessionItem.id,
    title: sessionItem.title,
    stage: sessionItem.stage,
    status: sessionItem.status,
    startAt: sessionItem.startAt,
    endAt: sessionItem.endAt,
    timezone: sessionItem.timezone,
    occupancy: sessionItem.occupancy,
    attendance: sessionItem.attendance
  }));

  return (
    <>
      <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Live classrooms</h1>
          <p className="dashboard-subtitle">
            Join cohort experiences, monitor security controls, and keep collaborative whiteboards prepped for every live moment.
          </p>
        </div>
        <button type="button" className="dashboard-pill" onClick={() => refresh?.()}>
          Refresh schedule
        </button>
      </header>

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

      {scheduleEvents.length > 0 && (
        <section className="dashboard-section">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Shared schedule</h2>
              <p className="text-sm text-slate-600">View the same grid instructors use to coordinate classrooms.</p>
            </div>
          </div>
          <div className="mt-5">
            <ScheduleGrid events={scheduleEvents} showAttendance onSelect={handleGridSelect} />
          </div>
        </section>
      )}

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
              <p className="mt-3 text-xs text-slate-500">
                Updated {snapshot.displayDate ?? snapshot.updatedAt ?? 'Recently'}
              </p>
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
                : statusMessage.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
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
