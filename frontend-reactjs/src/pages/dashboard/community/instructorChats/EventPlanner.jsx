import PropTypes from 'prop-types';
import { ArrowPathIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

export default function EventPlanner({
  events,
  loading,
  error,
  onRefresh,
  formValue,
  onFormChange,
  onSubmit,
  interactive
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="dashboard-kicker text-slate-500">Programming</p>
          <h3 className="text-lg font-semibold text-slate-900">Live events</h3>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <p className="mt-2 text-xs text-slate-500">
        Schedule sprints, live broadcasts, or voice lounges. Members receive notifications instantly after publishing.
      </p>

      <div className="mt-4 space-y-3">
        {loading && events.length === 0 ? (
          <p className="text-xs text-slate-500">Syncing event calendar…</p>
        ) : error ? (
          <p className="text-xs text-rose-600">Unable to load events. Refresh to retry.</p>
        ) : events.length === 0 ? (
          <p className="text-xs text-slate-500">No live events on the schedule. Plan your next activation.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li
                key={event.id ?? event.title}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-slate-600"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{event.visibility ?? 'members'}</p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <p>{event.startAt ? new Date(event.startAt).toLocaleString() : 'TBD'}</p>
                  {event.meetingUrl ? (
                    <a
                      href={event.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Join link
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule session</p>
        <label className="text-xs font-medium text-slate-500">
          Title
          <input
            type="text"
            required
            value={formValue.title}
            onChange={(event) => onFormChange({ ...formValue, title: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Summary
          <textarea
            rows={3}
            value={formValue.summary}
            onChange={(event) => onFormChange({ ...formValue, summary: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium text-slate-500">
            Start
            <input
              type="datetime-local"
              value={formValue.startAt}
              onChange={(event) => onFormChange({ ...formValue, startAt: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            End
            <input
              type="datetime-local"
              value={formValue.endAt}
              onChange={(event) => onFormChange({ ...formValue, endAt: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium text-slate-500">
            Meeting URL
            <input
              type="url"
              value={formValue.meetingUrl}
              onChange={(event) => onFormChange({ ...formValue, meetingUrl: event.target.value })}
              placeholder="https://live.edulure.com/session"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Visibility
            <select
              value={formValue.visibility}
              onChange={(event) => onFormChange({ ...formValue, visibility: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="members">Members</option>
              <option value="public">Public</option>
              <option value="moderators">Moderators</option>
            </select>
          </label>
        </div>
        <label className="text-xs font-medium text-slate-500">
          Attendance limit
          <input
            type="number"
            min={1}
            value={formValue.attendanceLimit}
            onChange={(event) => onFormChange({ ...formValue, attendanceLimit: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
          <input
            type="checkbox"
            checked={formValue.isOnline}
            onChange={(event) => onFormChange({ ...formValue, isOnline: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          Online session
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/50"
          disabled={!interactive}
        >
          Schedule event
        </button>
      </form>
    </section>
  );
}

EventPlanner.propTypes = {
  events: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.any,
  onRefresh: PropTypes.func.isRequired,
  formValue: PropTypes.shape({
    title: PropTypes.string,
    summary: PropTypes.string,
    startAt: PropTypes.string,
    endAt: PropTypes.string,
    meetingUrl: PropTypes.string,
    visibility: PropTypes.string,
    attendanceLimit: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    isOnline: PropTypes.bool
  }).isRequired,
  onFormChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  interactive: PropTypes.bool.isRequired
};

EventPlanner.defaultProps = {
  error: null
};
