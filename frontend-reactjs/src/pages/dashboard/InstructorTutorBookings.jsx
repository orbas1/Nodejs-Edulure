import { useCallback, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import useMountedRef from '../../hooks/useMountedRef.js';
import {
  downloadCalendarEvents,
  ensureFilename,
  formatDateTime,
  resolveRelativeTime
} from '../../utils/calendar.js';

export default function InstructorTutorBookings() {
  const { dashboard, refresh, instructorOrchestration } = useOutletContext();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const mounted = useMountedRef();
  const bookings = dashboard?.bookings;

  if (!bookings) {
    return (
      <DashboardStateMessage
        title="No tutor booking data"
        description="There are no inbound mentor requests or confirmed sessions yet. Refresh to fetch the latest pipeline."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const pipeline = bookings.pipeline ?? [];
  const confirmed = bookings.confirmed ?? [];
  const roster = Array.isArray(dashboard?.tutors?.roster) ? dashboard.tutors.roster : [];
  const availability = Array.isArray(dashboard?.tutors?.availability)
    ? dashboard.tutors.availability
    : [];
  const notifications = Array.isArray(dashboard?.tutors?.notifications)
    ? dashboard.tutors.notifications
    : [];
  const [segmentFilter, setSegmentFilter] = useState('all');

  const capacityRisks = availability.filter(
    (entry) => Number(entry.learnersCount ?? 0) > Number(entry.slotsCount ?? 0)
  );
  const upcomingWithin48 = notifications.filter((notification) =>
    notification.id?.includes('-due')
  );
  const liveClassrooms = useMemo(() => {
    const upcomingClasses = dashboard?.liveClassrooms?.upcoming;
    return Array.isArray(upcomingClasses) ? upcomingClasses.slice(0, 3) : [];
  }, [dashboard]);

  const segments = useMemo(() => {
    const values = new Set();
    pipeline.forEach((item) => {
      if (item.segment) {
        values.add(item.segment);
      }
    });
    return Array.from(values);
  }, [pipeline]);

  const filteredPipeline = useMemo(() => {
    if (segmentFilter === 'all') {
      return pipeline;
    }
    return pipeline.filter((item) => item.segment === segmentFilter);
  }, [pipeline, segmentFilter]);

  const filteredConfirmed = useMemo(() => {
    if (segmentFilter === 'all') {
      return confirmed;
    }
    return confirmed.filter((item) => item.segment === segmentFilter);
  }, [confirmed, segmentFilter]);

  const quoteCsvValue = useCallback((value) => {
    if (value === null || value === undefined) {
      return '""';
    }
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
  }, []);

  const handleExportPipeline = useCallback(() => {
    if (!pipeline.length) {
      setFeedback({
        tone: 'info',
        message: 'No pending requests to export.',
        detail: 'New mentor requests will populate after learners submit booking forms.'
      });
      return;
    }

    const header = ['Learner', 'Status', 'Topic', 'Requested', 'Preferred slot', 'Segment'];
    const rows = pipeline.map((item) => [
      quoteCsvValue(item.learner ?? 'Unknown learner'),
      quoteCsvValue(item.status ?? 'pending'),
      quoteCsvValue(item.topic ?? '—'),
      quoteCsvValue(item.requested ?? '—'),
      quoteCsvValue(item.preferred ?? item.preferredSlot ?? '—'),
      quoteCsvValue(item.segment ?? 'general')
    ]);

    const lines = [header.map(quoteCsvValue).join(','), ...rows.map((row) => row.join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = ensureFilename('tutor-booking-pipeline', 'csv');
    link.click();
    URL.revokeObjectURL(url);

    setFeedback({
      tone: 'success',
      message: 'Pipeline export ready.',
      detail: 'Upload the CSV to your CRM or share it with the learner success team.'
    });
  }, [pipeline, quoteCsvValue]);

  const handleExportConfirmed = useCallback(() => {
    const events = confirmed
      .map((booking) => {
        const startDate = (() => {
          if (booking.startAt) return new Date(booking.startAt);
          if (booking.scheduledAt) return new Date(booking.scheduledAt);
          if (booking.date && booking.time) return new Date(`${booking.date} ${booking.time}`);
          if (booking.date) return new Date(booking.date);
          return null;
        })();
        if (!startDate || Number.isNaN(startDate.getTime())) {
          return null;
        }
        const durationMinutes = Number.isFinite(Number(booking.durationMinutes))
          ? Number(booking.durationMinutes)
          : 60;
        const endDate = booking.endAt
          ? new Date(booking.endAt)
          : new Date(startDate.getTime() + durationMinutes * 60 * 1000);
        if (!endDate || Number.isNaN(endDate.getTime())) {
          return null;
        }
        return {
          id: booking.id,
          title: `${booking.topic ?? 'Mentorship session'} • ${booking.learner ?? 'Learner'}`,
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          description: booking.notes ?? booking.segment ?? 'Edulure mentor booking',
          location: booking.location ?? 'Virtual classroom',
          url: booking.joinUrl ?? booking.meetingUrl ?? booking.recordingUrl ?? null,
          categories: ['Edulure Tutoring', booking.segment].filter(Boolean)
        };
      })
      .filter(Boolean);

    const success = downloadCalendarEvents(events, {
      filename: ensureFilename('tutor-confirmed-sessions', 'ics'),
      prodId: '-//Edulure//InstructorTutorBookings//EN'
    });

    setFeedback(
      success
        ? {
            tone: 'success',
            message: 'Calendar export generated.',
            detail: 'Share the .ics file with mentors to sync confirmed sessions automatically.'
          }
        : {
            tone: 'error',
            message: 'Unable to create calendar file.',
            detail: 'Check that confirmed bookings include valid start times and try again.'
          }
    );
  }, [confirmed]);

  const triggerRouting = useCallback(
    async (overrides = {}) => {
      if (!instructorOrchestration?.routeTutorRequest) {
        return;
      }
      setPending(true);
      setFeedback(null);
      try {
        const payload = {
          pendingCount: pipeline.length,
          rulesetId: dashboard?.tutors?.activeRuleset,
          ...overrides
        };
        const result = await instructorOrchestration.routeTutorRequest(payload);
        if (mounted.current) {
          setFeedback({
            tone: 'success',
            message: 'Tutor routing recalibrated.',
            detail: result?.summary ?? 'New matching rules will apply to incoming requests.'
          });
        }
        await refresh?.();
      } catch (error) {
        if (mounted.current) {
          setFeedback({
            tone: 'error',
            message: error.message ?? 'Unable to update tutor routing.'
          });
        }
      } finally {
        if (mounted.current) {
          setPending(false);
        }
      }
    },
    [dashboard, instructorOrchestration, mounted, pipeline.length, refresh]
  );

  return (
    <div className="space-y-8">
      <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tutor bookings</h1>
          <p className="mt-2 text-sm text-slate-600">Manage inbound requests and confirm upcoming mentorship sessions.</p>
        </div>
        <button
          type="button"
          className="dashboard-primary-pill disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => triggerRouting()}
          disabled={pending}
          aria-busy={pending}
        >
          Open routing rules
        </button>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline controls</p>
          <p className="text-sm text-slate-600">
            Filter by learner segment, monitor risk alerts, and export the active routing queue for operations.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="tutor-segment-filter">
            Segment
          </label>
          <select
            id="tutor-segment-filter"
            value={segmentFilter}
            onChange={(event) => setSegmentFilter(event.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-primary focus:outline-none"
          >
            <option value="all">All segments</option>
            {segments.map((segment) => (
              <option key={segment} value={segment}>
                {segment}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportPipeline}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Export pipeline CSV
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Pending requests</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{filteredPipeline.length}</p>
          <p className="mt-1 text-xs text-slate-500">In the routing queue</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Confirmed sessions</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{filteredConfirmed.length}</p>
          <p className="mt-1 text-xs text-slate-500">On the calendar</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active mentors</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{roster.length}</p>
          <p className="mt-1 text-xs text-slate-500">Supporting learners</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Alerts</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{capacityRisks.length + upcomingWithin48.length}</p>
          <p className="mt-1 text-xs text-slate-500">Capacity risks &amp; upcoming SLAs</p>
        </article>
      </section>

      {notifications.length > 0 && (
        <section className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">Alerts &amp; notifications</h2>
          <div className="mt-4 space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                  {notification.detail && <p className="text-xs text-slate-600">{notification.detail}</p>}
                  {notification.deadline && (
                    <p className="text-xs text-slate-500">
                      {formatDateTime(notification.deadline, {})}
                      {` (${resolveRelativeTime(notification.deadline)})`}
                    </p>
                  )}
                </div>
                {notification.ctaLabel && notification.ctaPath && (
                  <Link to={notification.ctaPath} className="dashboard-pill px-4 py-2">
                    {notification.ctaLabel}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Pending requests</h2>
        <ul className="mt-4 space-y-4">
          {filteredPipeline.map((item) => (
            <li key={item.id} className="dashboard-card-muted p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.status}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.learner}</p>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <p>Requested {item.requested}</p>
                  <button
                    type="button"
                    className="mt-2 dashboard-pill px-3 py-1 hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() =>
                      triggerRouting({
                        pendingCount: pipeline.length,
                        rulesetId: item.id,
                        learner: item.learner
                      })
                    }
                    disabled={pending}
                    aria-busy={pending}
                  >
                    Assign mentor
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{item.topic}</p>
              {item.preferred && (
                <p className="mt-2 text-xs text-slate-500">Preferred slot: {item.preferred}</p>
              )}
            </li>
          ))}
          {filteredPipeline.length === 0 && (
            <li className="dashboard-card-muted p-6 text-center text-sm text-slate-500">
              No requests match the selected segment. Adjust the filters or refresh the routing queue.
            </li>
          )}
        </ul>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Confirmed sessions</h2>
          <button
            type="button"
            onClick={handleExportConfirmed}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Export calendar (.ics)
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {filteredConfirmed.map((item) => (
            <div key={item.id} className="dashboard-card-muted p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.date ?? formatDateTime(item.startAt, {})}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{item.topic}</p>
              <p className="text-xs text-slate-600">With {item.learner}</p>
              {item.segment && <p className="mt-1 text-xs text-slate-500">Segment: {item.segment}</p>}
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
                <button type="button" className="dashboard-pill px-3 py-1 hover:border-primary/50">
                  Send prep
                </button>
                <button type="button" className="dashboard-pill px-3 py-1 hover:border-primary/50">
                  Reschedule
                </button>
              </div>
            </div>
          ))}
          {filteredConfirmed.length === 0 && (
            <div className="dashboard-card-muted p-6 text-center text-sm text-slate-500">
              No confirmed sessions for this segment yet. Confirm upcoming requests to populate this list.
            </div>
          )}
        </div>
      </section>

      {liveClassrooms.length > 0 && (
        <section className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">Live classroom hand-off</h2>
          <p className="text-sm text-slate-600">
            Upcoming live classes that share mentors with the tutoring programme. Ensure prep assets and moderators align.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {liveClassrooms.map((session) => (
              <div key={session.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">{session.stage ?? 'Live classroom'}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{session.title}</p>
                <p className="text-xs text-slate-600">{formatDateTime(session.startAt, {})}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {session.community ? `Community: ${session.community}` : 'Cross-team broadcast'}
                </p>
                {session.support?.moderator && (
                  <p className="mt-1 text-xs text-slate-500">Moderator: {session.support.moderator}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
