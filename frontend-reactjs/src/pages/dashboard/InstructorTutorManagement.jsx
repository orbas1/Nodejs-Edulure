import { useCallback, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/20/solid';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import TutorProfileCard from '../../components/tutor/TutorProfileCard.jsx';
import useMountedRef from '../../hooks/useMountedRef.js';

const severityStyles = {
  success: {
    wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircleIcon
  },
  warning: {
    wrapper: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: ExclamationTriangleIcon
  },
  info: {
    wrapper: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: InformationCircleIcon
  },
  neutral: {
    wrapper: 'border-slate-200 bg-slate-50 text-slate-600',
    icon: InformationCircleIcon
  }
};

export default function InstructorTutorManagement() {
  const { role, dashboard, refresh, instructorOrchestration } = useOutletContext();
  const [pendingAction, setPendingAction] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const mounted = useMountedRef();

  if (role !== 'instructor') {
    return (
      <DashboardStateMessage
        title="Tutor management is restricted"
        description="Only instructor Learnspaces can manage tutor pods and hiring pipelines."
      />
    );
  }

  const tutorData = dashboard?.tutors ?? null;
  if (!tutorData) {
    return (
      <DashboardStateMessage
        title="Tutor data not available"
        description="We couldn't retrieve your mentor roster. Refresh the Learnspace to try again."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const roster = Array.isArray(tutorData.roster) ? tutorData.roster : [];
  const notifications = Array.isArray(tutorData.notifications) ? tutorData.notifications : [];
  const availability = Array.isArray(tutorData.availability)
    ? tutorData.availability
    : Array.isArray(dashboard?.schedules?.tutor)
      ? dashboard.schedules.tutor
      : [];

  const handleInviteMentor = useCallback(async () => {
    if (!instructorOrchestration?.inviteMentor) {
      return;
    }
    setPendingAction('invite');
    setFeedback(null);
    try {
      const payload = {
        email: roster[0]?.email ?? 'mentor@edulure.com',
        name: roster[0]?.name ?? 'New Mentor'
      };
      const result = await instructorOrchestration.inviteMentor(payload);
      if (mounted.current) {
        setFeedback({
          tone: 'success',
          message: 'Mentor invite sent.',
          detail: result?.summary ?? 'We emailed the mentor with next steps.'
        });
      }
      await refresh?.();
    } catch (error) {
      if (mounted.current) {
        setFeedback({
          tone: 'error',
          message: error.message ?? 'Unable to send mentor invite.'
        });
      }
    } finally {
      if (mounted.current) {
        setPendingAction(null);
      }
    }
  }, [instructorOrchestration, mounted, refresh, roster]);

  const handleRouting = useCallback(
    async (targetTutor = null) => {
      if (!instructorOrchestration?.routeTutorRequest) {
        return;
      }
      setPendingAction(`routing:${targetTutor?.id ?? 'all'}`);
      setFeedback(null);
      try {
        const payload = {
          pendingCount: notifications.filter((item) => item.severity === 'warning').length,
          rulesetId: dashboard?.tutors?.activeRuleset,
          tutorId: targetTutor?.id ?? undefined
        };
        const result = await instructorOrchestration.routeTutorRequest(payload);
        if (mounted.current) {
          setFeedback({
            tone: 'success',
            message: targetTutor
              ? `${targetTutor.name ?? 'Tutor'} routing recalibrated.`
              : 'Tutor routing recalibrated.',
            detail: result?.summary ?? 'Routing updates will propagate to mentor pods.'
          });
        }
        await refresh?.();
      } catch (error) {
        if (mounted.current) {
          setFeedback({
            tone: 'error',
            message: error.message ?? 'Unable to open routing rules.'
          });
        }
      } finally {
        if (mounted.current) {
          setPendingAction(null);
        }
      }
    },
    [dashboard, instructorOrchestration, mounted, notifications, refresh]
  );

  const handleBookMentor = useCallback(
    async (tutor) => {
      if (!tutor) return;
      if (!instructorOrchestration?.bookMentorSession) {
        setFeedback({
          tone: 'info',
          message: 'Use the scheduling workspace to coordinate this mentor session.'
        });
        return;
      }
      setPendingAction(`book:${tutor.id}`);
      try {
        const response = await instructorOrchestration.bookMentorSession({ tutorId: tutor.id });
        setFeedback({
          tone: 'success',
          message: response?.message ?? 'Mentor session booked successfully.'
        });
        await refresh?.();
      } catch (error) {
        setFeedback({
          tone: 'error',
          message: error.message ?? 'Unable to book this mentor session right now.'
        });
      } finally {
        if (mounted.current) {
          setPendingAction(null);
        }
      }
    },
    [instructorOrchestration, mounted, refresh]
  );

  if (roster.length === 0 && availability.length === 0) {
    return (
      <DashboardStateMessage
        title="No tutor pods configured"
        description="Invite mentors or connect external hiring partners to bring tutoring pods online."
        actionLabel="Invite mentor"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tutor management &amp; hiring</h1>
          <p className="mt-2 text-sm text-slate-600">
            Coordinate mentor pods, hiring pipelines, and availability so learners can book enterprise-grade support.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="dashboard-primary-pill px-5 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleInviteMentor}
            disabled={pendingAction === 'invite'}
            aria-busy={pendingAction === 'invite'}
          >
            Invite mentor
          </button>
          <button type="button" className="dashboard-pill px-4 py-2">
            Generate role brief
          </button>
          <button type="button" className="dashboard-pill px-4 py-2">
            View hiring partners
          </button>
        </div>
      </div>

      {notifications.length > 0 && (
        <section className="dashboard-section">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Operational alerts</h2>
              <p className="text-sm text-slate-600">
                Keep pods healthy and SLAs on track with realtime booking and availability alerts.
              </p>
            </div>
            <button type="button" className="dashboard-pill">
              Export alert log
            </button>
          </div>
          <div className="mt-5 space-y-4">
            {notifications.map((notification) => {
              const tone = severityStyles[notification.severity] ?? severityStyles.neutral;
              const Icon = tone.icon;
              return (
                <div
                  key={notification.id}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${tone.wrapper}`}
                >
                  <div className="flex flex-1 items-start gap-3">
                    <Icon className="mt-1 h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{notification.title}</p>
                      {notification.detail && <p className="mt-1 text-sm opacity-80">{notification.detail}</p>}
                    </div>
                  </div>
                  {notification.ctaLabel && notification.ctaPath && (
                    <Link
                      to={notification.ctaPath}
                      className="inline-flex items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-semibold"
                    >
                      {notification.ctaLabel}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {roster.length > 0 && (
        <section className="dashboard-section">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Active tutor pods</h2>
              <p className="text-sm text-slate-600">
                Track performance, availability, and focus areas for every mentor supporting your learners.
              </p>
            </div>
            <button
              type="button"
              className="dashboard-pill disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => handleRouting()}
              disabled={pendingAction?.startsWith('routing')}
              aria-busy={pendingAction?.startsWith('routing')}
            >
              Open routing rules
            </button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roster.map((tutor) => (
              <TutorProfileCard
                key={tutor.id}
                tutor={tutor}
                onBook={handleBookMentor}
                onRoute={(value) => handleRouting(value)}
                actionsDisabled={pendingAction === `book:${tutor.id}` || pendingAction === `routing:${tutor.id}`}
              />
            ))}
          </div>
        </section>
      )}

      {availability.length > 0 && (
        <section className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">Capacity &amp; coverage</h2>
          <p className="mt-2 text-sm text-slate-600">
            Review per-mentor capacity, upcoming sessions, and notes to keep every pod healthy.
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Mentor</th>
                  <th className="py-2 pr-4">Load</th>
                  <th className="py-2 pr-4">Next availability</th>
                  <th className="py-2 pr-4">Next session</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {availability.map((entry) => (
                  <tr key={entry.id} className="hover:bg-primary/5">
                    <td className="py-3 pr-4 font-medium text-slate-900">{entry.mentor}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      <div className="font-semibold text-slate-900">{entry.learners}</div>
                      <div className="text-xs text-slate-500">{entry.slots}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{entry.nextAvailability ?? 'Sync calendar'}</td>
                    <td className="py-3 pr-4 text-slate-600">{entry.nextSession ?? 'No session scheduled'}</td>
                    <td className="py-3 text-slate-600">
                      <div className="flex flex-wrap gap-2">
                        {(entry.noteItems ?? entry.notes?.split?.(' • ') ?? []).map((note) => (
                          <span key={note} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {note}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
