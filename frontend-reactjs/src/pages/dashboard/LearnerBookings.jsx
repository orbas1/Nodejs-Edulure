import { useMemo, useState } from 'react';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { requestTutorBooking, exportTutorBookings } from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';

export default function LearnerBookings() {
  const { isLearner, section: data, refresh, refreshAfterAction } = useLearnerDashboardSection('tutorBookings');
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [status, setStatus] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner Learnspace required"
        description="Switch to the learner dashboard to review tutor bookings and mentorship history."
      />
    );
  }

  if (!data) {
    return (
      <DashboardStateMessage
        title="No learner bookings"
        description="We couldn't locate any upcoming or historical tutor bookings. Refresh to retrieve the latest mentor agenda."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const active = useMemo(() => data.active ?? [], [data.active]);
  const history = useMemo(() => data.history ?? [], [data.history]);

  const handleRequestSession = async () => {
    if (!token) {
      setStatus({ type: 'error', message: 'You need to be signed in to request a mentor session.' });
      return;
    }
    setPendingAction('create');
    setStatus({ type: 'pending', message: 'Requesting a tutor session…' });
    try {
      const result = await refreshAfterAction(() =>
        requestTutorBooking({
          token,
          payload: {
            topic: 'Learner dashboard mentorship request',
            context: 'dashboard',
            scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          }
        })
      );
      const bookingId = result?.booking?.id ?? 'booking';
      setStatus({
        type: 'success',
        message: `Mentor session request submitted (${bookingId}).`
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to request a mentor session.'
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleExportAgenda = async () => {
    if (!token) {
      setStatus({ type: 'error', message: 'Sign in to export your tutor agenda.' });
      return;
    }
    setPendingAction('export');
    setStatus({ type: 'pending', message: 'Preparing your tutor agenda export…' });
    try {
      const result = await refreshAfterAction(() => exportTutorBookings({ token }));
      const exportUrl = result?.exportUrl ?? 'download link';
      setStatus({
        type: 'success',
        message: `Agenda ready for download. Retrieve it from ${exportUrl}.`
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to export your agenda right now.'
      });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Tutor bookings</h1>
          <p className="dashboard-subtitle">Coordinate sessions, briefs, and follow-ups with your mentor team.</p>
        </div>
        <button
          type="button"
          className="dashboard-primary-pill"
          onClick={handleRequestSession}
          disabled={pendingAction === 'create'}
          aria-busy={pendingAction === 'create'}
        >
          {pendingAction === 'create' ? 'Submitting…' : 'Request new session'}
        </button>
      </div>

      {status ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-3xl border px-5 py-4 text-sm ${
            status.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : status.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-primary/20 bg-primary/5 text-primary'
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Upcoming bookings</h2>
            <p className="text-sm text-slate-600">Briefs received, waiting on acceptance, or confirmed sessions.</p>
          </div>
          <button
            type="button"
            className="dashboard-pill"
            onClick={handleExportAgenda}
            disabled={pendingAction === 'export'}
            aria-busy={pendingAction === 'export'}
          >
            {pendingAction === 'export' ? 'Exporting…' : 'Export agenda'}
          </button>
        </div>
        <div className="mt-5 space-y-4">
          {active.map((item) => (
            <div key={item.id} className="dashboard-card-muted p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
                <div>
                  <p className="dashboard-kicker">{item.status}</p>
                  <p className="text-sm font-semibold text-slate-900">{item.topic}</p>
                  <p className="text-xs text-slate-500">Mentor {item.mentor}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{item.date}</p>
                  <button type="button" className="mt-2 dashboard-pill px-3 py-1">
                    Share prep notes
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Completed sessions</h2>
        <table className="mt-4 w-full text-left text-sm text-slate-700">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-3">Mentor</th>
              <th className="pb-3">Topic</th>
              <th className="pb-3">Date</th>
              <th className="pb-3 text-right">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {history.map((item) => (
              <tr key={item.id} className="hover:bg-primary/5">
                <td className="py-3">{item.mentor}</td>
                <td className="py-3 text-slate-600">{item.topic}</td>
                <td className="py-3 text-slate-600">{item.date}</td>
                <td className="py-3 text-right text-emerald-500">{item.rating}★</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
