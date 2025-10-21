import { useMemo } from 'react';
import PropTypes from 'prop-types';

import { buildLaunchTimeline } from '../utils.js';

const GROUP_THEME = {
  today: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  upcoming: 'border-primary/20 bg-primary/10 text-primary-dark',
  overdue: 'border-rose-200 bg-rose-50 text-rose-700',
  unscheduled: 'border-slate-200 bg-slate-50 text-slate-600'
};

function SummaryChip({ label, value }) {
  return (
    <div className="rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold text-slate-600 shadow-sm">
      <span className="text-slate-400">{label} · </span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

SummaryChip.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

function LaunchGroup({ title, items, tone }) {
  if (!items || items.length === 0) {
    return null;
  }

  const theme = GROUP_THEME[tone] ?? GROUP_THEME.upcoming;

  return (
    <section className="space-y-3">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${theme}`}>
        {title}
      </div>
      <ul className="space-y-3 text-sm text-slate-600">
        {items.map((launch) => (
          <li
            key={launch.id}
            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{launch.title}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">{launch.community}</p>
              {launch.owner ? (
                <p className="text-xs text-slate-400">Owner {launch.owner}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-1 text-xs text-slate-500 md:items-end">
              <p className="font-semibold text-slate-900">{launch.startAt}</p>
              <p>{launch.relative}</p>
              {launch.callToAction ? (
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  {launch.callToAction}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

LaunchGroup.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      community: PropTypes.string.isRequired,
      startAt: PropTypes.string.isRequired,
      relative: PropTypes.string.isRequired,
      callToAction: PropTypes.string,
      owner: PropTypes.string
    })
  ),
  tone: PropTypes.oneOf(['today', 'upcoming', 'overdue', 'unscheduled']).isRequired
};

LaunchGroup.defaultProps = {
  items: []
};

export default function AdminUpcomingLaunchesSection({ sectionId, launches }) {
  const { timeline, summary } = useMemo(() => buildLaunchTimeline(launches), [launches]);

  const sortedGroups = useMemo(() => {
    const sortByDate = (items) =>
      [...items].sort((a, b) => {
        if (!a.rawDate && !b.rawDate) return a.title.localeCompare(b.title);
        if (!a.rawDate) return 1;
        if (!b.rawDate) return -1;
        return a.rawDate - b.rawDate;
      });

    return {
      today: sortByDate(timeline.today),
      upcoming: sortByDate(timeline.upcoming),
      overdue: sortByDate(timeline.overdue)
    };
  }, [timeline.today, timeline.upcoming, timeline.overdue]);

  return (
    <section id={sectionId} className="dashboard-section">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Upcoming launches</h3>
          <p className="text-xs uppercase tracking-wide text-slate-500">Rolling 14-day window</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SummaryChip label="Total" value={summary.total} />
          <SummaryChip label="Today" value={summary.dueToday} />
          <SummaryChip label="Upcoming" value={summary.upcoming} />
          <SummaryChip label="Overdue" value={summary.overdue} />
        </div>
      </div>

      {summary.total === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-xs text-slate-500">
          No live classrooms or launches scheduled in the next two weeks. Coordinate with curriculum leads to populate the
          launch calendar.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <LaunchGroup title="Launching today" items={sortedGroups.today} tone="today" />
          <LaunchGroup title="Upcoming" items={sortedGroups.upcoming} tone="upcoming" />
          <LaunchGroup title="Requires reschedule" items={sortedGroups.overdue} tone="overdue" />
        </div>
      )}
    </section>
  );
}

AdminUpcomingLaunchesSection.propTypes = {
  sectionId: PropTypes.string,
  launches: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string,
      community: PropTypes.string,
      startAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      startIn: PropTypes.string,
      startsIn: PropTypes.string
    })
  ).isRequired
};

AdminUpcomingLaunchesSection.defaultProps = {
  sectionId: undefined
};
