import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";

import DashboardActionFeedback from "../../../components/dashboard/DashboardActionFeedback.jsx";
import DashboardStateMessage from "../../../components/dashboard/DashboardStateMessage.jsx";
import { scheduleCommunityEvent } from "../../../api/communityApi.js";
import { useAuth } from "../../../context/AuthContext.jsx";

function toLocalDateTimeInput(value) {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

const defaultEventForm = {
  communityId: "",
  title: "",
  description: "",
  startAt: toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)),
  endAt: toLocalDateTimeInput(new Date(Date.now() + 2 * 60 * 60 * 1000)),
  facilitator: "",
  seats: "",
  meetingUrl: "",
  isOnline: true
};

export default function CommunityProgramming({ dashboard, onRefresh }) {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const initialEvents = useMemo(
    () => (Array.isArray(dashboard?.programming?.upcomingEvents) ? dashboard.programming.upcomingEvents : []),
    [dashboard?.programming?.upcomingEvents]
  );
  const tutorPods = useMemo(
    () => (Array.isArray(dashboard?.programming?.tutorPods) ? dashboard.programming.tutorPods : []),
    [dashboard?.programming?.tutorPods]
  );
  const broadcasts = useMemo(
    () => (Array.isArray(dashboard?.programming?.broadcasts) ? dashboard.programming.broadcasts : []),
    [dashboard?.programming?.broadcasts]
  );
  const [events, setEvents] = useState(initialEvents);
  const [eventForm, setEventForm] = useState(defaultEventForm);
  const [feedback, setFeedback] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    setEvents(initialEvents.map((event) => formatEvent(event)));
  }, [formatEvent, initialEvents]);

  const communityOptions = useMemo(() => {
    const options = new Map();
    if (Array.isArray(dashboard?.programming?.communities)) {
      dashboard.programming.communities.forEach((community) => {
        if (community?.id) {
          options.set(String(community.id), {
            value: String(community.id),
            label: community.name ?? community.title ?? `Community ${community.id}`
          });
        }
      });
    }
    events.forEach((event) => {
      if (!event?.communityId) return;
      const key = String(event.communityId);
      if (!options.has(key)) {
        options.set(key, {
          value: key,
          label: event.communityName ?? event.community ?? `Community ${key}`
        });
      }
    });
    tutorPods.forEach((pod) => {
      if (!pod?.communityId) return;
      const key = String(pod.communityId);
      if (!options.has(key)) {
        options.set(key, {
          value: key,
          label: pod.community ?? `Community ${key}`
        });
      }
    });
    return Array.from(options.values());
  }, [dashboard?.programming?.communities, events, tutorPods]);

  const defaultCommunityId = useMemo(() => {
    if (dashboard?.programming?.targetCommunityId) {
      return String(dashboard.programming.targetCommunityId);
    }
    if (communityOptions.length > 0) {
      return communityOptions[0].value;
    }
    if (events[0]?.communityId) {
      return String(events[0].communityId);
    }
    return "";
  }, [communityOptions, dashboard?.programming?.targetCommunityId, events]);

  useEffect(() => {
    setEventForm((previous) => ({
      ...previous,
      communityId: previous.communityId || defaultCommunityId
    }));
  }, [defaultCommunityId]);

  const formatEvent = useCallback((event) => ({
    ...event,
    date: event.date ?? (event.startAt ? new Date(event.startAt).toLocaleString() : undefined),
    status: event.status ?? "scheduled",
    facilitator: event.facilitator ?? event.owner ?? "Community team",
    seats: event.seats ?? (event.attendanceLimit ? `${event.attendanceLimit} seats` : "Open seating"),
    communityId: event.communityId ?? eventForm.communityId
  }), [eventForm.communityId]);

  const handleEventFieldChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    setEventForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value
    }));
  }, []);

  const handleScheduleEvent = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token) {
        setFeedback({ tone: "error", message: "You must be signed in to schedule events." });
        return;
      }
      if (!eventForm.communityId) {
        setFeedback({ tone: "error", message: "Select a community before scheduling." });
        return;
      }
      if (!eventForm.title) {
        setFeedback({ tone: "error", message: "Event title is required." });
        return;
      }
      if (!eventForm.startAt || !eventForm.endAt) {
        setFeedback({ tone: "error", message: "Start and end times are required." });
        return;
      }
      const startDate = new Date(eventForm.startAt);
      const endDate = new Date(eventForm.endAt);
      if (endDate <= startDate) {
        setFeedback({ tone: "error", message: "End time must be after the start time." });
        return;
      }
      setIsScheduling(true);
      setFeedback(null);
      const optimistic = formatEvent({
        id: `temp-${Date.now()}`,
        communityId: eventForm.communityId,
        title: eventForm.title,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        facilitator: eventForm.facilitator || "Pending facilitator",
        seats: eventForm.seats || "Pending capacity",
        status: "scheduled"
      });
      setEvents((previous) => [optimistic, ...previous]);
      try {
        const response = await scheduleCommunityEvent({
          communityId: eventForm.communityId,
          token,
          payload: {
            title: eventForm.title,
            summary: eventForm.description,
            description: eventForm.description,
            startAt: startDate.toISOString(),
            endAt: endDate.toISOString(),
            isOnline: eventForm.isOnline,
            meetingUrl: eventForm.meetingUrl || undefined,
            facilitator: eventForm.facilitator || undefined,
            attendanceLimit: eventForm.seats ? Number.parseInt(eventForm.seats, 10) : undefined
          }
        });
        if (response.data) {
          setEvents((previous) =>
            previous.map((item) => (item.id === optimistic.id ? formatEvent(response.data) : item))
          );
          setFeedback({ tone: "success", message: "Event scheduled successfully." });
        }
        setEventForm({
          ...defaultEventForm,
          communityId: eventForm.communityId
        });
      } catch (error) {
        setEvents((previous) => previous.filter((item) => item.id !== optimistic.id));
        setFeedback({ tone: "error", message: error?.message ?? "Failed to schedule event." });
      } finally {
        setIsScheduling(false);
      }
    },
    [eventForm, formatEvent, token]
  );

  if (!dashboard) {
    return (
      <DashboardStateMessage
        title="Programming telemetry unavailable"
        description="We were unable to load events or broadcasts for your communities. Refresh to retry the sync."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-8">
      <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Programming and rituals</h1>
          <p className="dashboard-subtitle">
            Coordinate the rituals, live sessions, and broadcasts that keep your communities energised and aligned.
          </p>
        </div>
        <button type="button" className="dashboard-primary-pill" onClick={onRefresh}>
          Refresh agenda
        </button>
      </header>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Schedule ritual</p>
          <h2 className="text-lg font-semibold text-slate-900">Plan a live session</h2>
        </div>
        <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4" onSubmit={handleScheduleEvent}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Community
              <select
                name="communityId"
                value={eventForm.communityId}
                onChange={handleEventFieldChange}
                className="dashboard-input"
              >
                <option value="">Select community</option>
                {communityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Facilitator
              <input
                name="facilitator"
                value={eventForm.facilitator}
                onChange={handleEventFieldChange}
                className="dashboard-input"
                placeholder="Community team"
              />
            </label>
          </div>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Title
            <input
              required
              name="title"
              value={eventForm.title}
              onChange={handleEventFieldChange}
              className="dashboard-input"
              placeholder="Weekly accountability circle"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Description
            <textarea
              name="description"
              value={eventForm.description}
              onChange={handleEventFieldChange}
              className="dashboard-input min-h-[100px]"
              placeholder="Outline the ritual, learning outcomes, and expected preparation for attendees."
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Start time
              <input
                type="datetime-local"
                name="startAt"
                value={eventForm.startAt}
                onChange={handleEventFieldChange}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              End time
              <input
                type="datetime-local"
                name="endAt"
                value={eventForm.endAt}
                onChange={handleEventFieldChange}
                className="dashboard-input"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Seats available
              <input
                type="number"
                min="1"
                name="seats"
                value={eventForm.seats}
                onChange={handleEventFieldChange}
                className="dashboard-input"
                placeholder="50"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Meeting URL
              <input
                name="meetingUrl"
                value={eventForm.meetingUrl}
                onChange={handleEventFieldChange}
                className="dashboard-input"
                placeholder="https://meet.example.com/ritual"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <input
              type="checkbox"
              name="isOnline"
              checked={eventForm.isOnline}
              onChange={handleEventFieldChange}
            />
            Online session
          </label>
          <div className="flex justify-end">
            <button type="submit" className="dashboard-primary-pill px-5 py-2" disabled={isScheduling}>
              {isScheduling ? "Scheduling…" : "Schedule event"}
            </button>
          </div>
        </form>
      </section>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Live rituals</p>
          <h2 className="text-lg font-semibold text-slate-900">Upcoming sessions</h2>
        </div>
        <ul className="space-y-4">
          {events.map((event) => (
            <li key={event.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-900">{event.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{event.date}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="dashboard-pill px-3 py-1">{event.facilitator}</span>
                  <span className="dashboard-pill px-3 py-1">{event.seats}</span>
                  <span className="dashboard-pill px-3 py-1 capitalize">{event.status}</span>
                </div>
              </div>
              {event.description ? (
                <p className="mt-3 text-sm text-slate-600">{event.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
        {events.length === 0 ? (
          <DashboardStateMessage
            title="No rituals scheduled"
            description="Plan a live classroom or cohort ritual to populate the programming roadmap."
          />
        ) : null}
      </section>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Tutor pods</p>
          <h2 className="text-lg font-semibold text-slate-900">Mentorship commitments</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tutorPods.map((pod) => (
            <div key={pod.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{pod.mentor}</p>
              <p className="mt-1 text-xs text-slate-500">{pod.focus}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="dashboard-pill px-3 py-1">{pod.status}</span>
                <span className="dashboard-pill px-3 py-1">{pod.scheduled}</span>
              </div>
            </div>
          ))}
          {tutorPods.length === 0 ? (
            <DashboardStateMessage
              title="No mentor sessions"
              description="Coordinate mentor pods and publish availability to populate this view."
            />
          ) : null}
        </div>
      </section>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Broadcasts</p>
          <h2 className="text-lg font-semibold text-slate-900">Community communications</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {broadcasts.map((broadcast) => (
            <div key={broadcast.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{broadcast.title}</p>
              <p className="mt-1 text-xs text-slate-500">{broadcast.status}</p>
              <p className="mt-2 text-sm text-slate-600">{broadcast.summary}</p>
            </div>
          ))}
          {broadcasts.length === 0 ? (
            <DashboardStateMessage
              title="No broadcasts scheduled"
              description="Schedule your next announcement drop to keep the community informed."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

CommunityProgramming.propTypes = {
  dashboard: PropTypes.object,
  onRefresh: PropTypes.func
};

CommunityProgramming.defaultProps = {
  dashboard: null,
  onRefresh: undefined
};
