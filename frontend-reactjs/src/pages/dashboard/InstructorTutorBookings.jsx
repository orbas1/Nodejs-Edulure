import { useCallback, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';

export default function InstructorTutorBookings() {
  const { dashboard, refresh, instructorOrchestration } = useOutletContext();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
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

  const capacityRisks = availability.filter(
    (entry) => Number(entry.learnersCount ?? 0) > Number(entry.slotsCount ?? 0)
  );
  const upcomingWithin48 = notifications.filter((notification) =>
    notification.id?.includes('-due')
  );

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
        setFeedback({
          tone: 'success',
          message: 'Tutor routing recalibrated.',
          detail: result?.summary ?? 'New matching rules will apply to incoming requests.'
        });
        await refresh?.();
      } catch (error) {
        setFeedback({
          tone: 'error',
          message: error.message ?? 'Unable to update tutor routing.'
        });
      } finally {
        setPending(false);
      }
    },
    [dashboard, instructorOrchestration, pipeline.length, refresh]
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Pending requests</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{pipeline.length}</p>
          <p className="mt-1 text-xs text-slate-500">In the routing queue</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Confirmed sessions</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{confirmed.length}</p>
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
          {pipeline.map((item) => (
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
            </li>
          ))}
        </ul>
      </section>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Confirmed sessions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {confirmed.map((item) => (
            <div key={item.id} className="dashboard-card-muted p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.date}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{item.topic}</p>
              <p className="text-xs text-slate-600">With {item.learner}</p>
              <div className="mt-4 flex gap-3 text-xs text-slate-600">
                <button type="button" className="dashboard-pill px-3 py-1 hover:border-primary/50">
                  Send prep
                </button>
                <button type="button" className="dashboard-pill px-3 py-1 hover:border-primary/50">
                  Reschedule
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
