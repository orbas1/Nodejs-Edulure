import { useCallback, useEffect, useMemo, useState } from 'react';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import {
  createTutorBookingRequest,
  exportTutorSchedule
} from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LearnerBookings() {
  const { isLearner, section: data, refresh, loading, error } = useLearnerDashboardSection('tutorBookings');
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [activeBookings, setActiveBookings] = useState([]);
  const [historicalBookings, setHistoricalBookings] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    setActiveBookings(Array.isArray(data?.active) ? data.active : []);
    setHistoricalBookings(Array.isArray(data?.history) ? data.history : []);
  }, [data]);

  useEffect(() => {
    if (error) {
      setStatusMessage({ type: 'error', message: error.message ?? 'Unable to load tutor bookings.' });
    }
  }, [error]);

  const disableActions = useMemo(() => pendingAction !== null, [pendingAction]);

  const handleRequestSession = useCallback(async () => {
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to request a new mentor session.' });
      return;
    }

    setPendingAction('request');
    setStatusMessage({ type: 'pending', message: 'Submitting new tutor booking request…' });
    try {
      const response = await createTutorBookingRequest({
        token,
        payload: { topic: 'Mentorship session', preferredDate: new Date().toISOString() }
      });
      const acknowledgement = response?.data ?? {};
      const newBooking = {
        id: acknowledgement.reference ?? `request-${Date.now()}`,
        status: 'Requested',
        topic: acknowledgement.meta?.topic ?? 'Mentorship session',
        mentor: 'Mentor assigned soon',
        date: acknowledgement.meta?.preferredDate
          ? new Date(acknowledgement.meta.preferredDate).toLocaleString()
          : 'Scheduling',
        rating: null
      };
      setActiveBookings((current) => [newBooking, ...current]);
      setStatusMessage({
        type: 'success',
        message: response?.message ?? 'Mentor booking request captured.'
      });
    } catch (requestError) {
      setStatusMessage({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'We were unable to submit your mentor booking request.'
      });
    } finally {
      setPendingAction(null);
    }
  }, [token]);

  const handleExportAgenda = useCallback(async () => {
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to export your upcoming agenda.' });
      return;
    }

    setPendingAction('export');
    setStatusMessage({ type: 'pending', message: 'Preparing tutor agenda export…' });
    try {
      const response = await exportTutorSchedule({ token });
      const acknowledgement = response?.data ?? {};
      const downloadUrl = acknowledgement.meta?.downloadUrl ?? null;
      setStatusMessage({
        type: 'success',
        message:
          downloadUrl
            ? `Agenda export ready. Download from ${downloadUrl}.`
            : response?.message ?? 'Agenda export prepared.'
      });
    } catch (exportError) {
      setStatusMessage({
        type: 'error',
        message:
          exportError instanceof Error
            ? exportError.message
            : 'We were unable to export your mentor agenda.'
      });
    } finally {
      setPendingAction(null);
    }
  }, [token]);

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner Learnspace required"
        description="Switch to the learner dashboard to review tutor bookings and mentorship history."
      />
    );
  }

  if (loading) {
    return (
      <DashboardStateMessage
        title="Loading tutor bookings"
        description="We are pulling the latest mentorship agenda for your learner dashboard."
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

  const active = activeBookings;
  const history = historicalBookings;

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
          disabled={disableActions}
        >
          Request new session
        </button>
      </div>

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
            disabled={disableActions}
          >
            Export agenda
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
  );
}
