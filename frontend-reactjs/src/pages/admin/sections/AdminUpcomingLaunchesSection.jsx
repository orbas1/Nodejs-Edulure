import PropTypes from 'prop-types';

export default function AdminUpcomingLaunchesSection({ sectionId, launches }) {
  return (
    <section id={sectionId} className="dashboard-section">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Upcoming launches</h3>
        <span className="text-xs uppercase tracking-wide text-slate-500">Next 14 days</span>
      </div>
      <ul className="mt-4 space-y-3 text-sm text-slate-600">
        {launches.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
            No live classrooms or launches scheduled in the next two weeks.
          </li>
        ) : (
          launches.map((launch) => (
            <li
              key={launch.id}
              className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{launch.title}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">{launch.community}</p>
              </div>
              <div className="text-xs text-slate-500">
                <p className="font-semibold text-slate-900">{launch.startAt}</p>
                <p>{launch.startIn}</p>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

AdminUpcomingLaunchesSection.propTypes = {
  sectionId: PropTypes.string,
  launches: PropTypes.arrayOf(PropTypes.object).isRequired
};

AdminUpcomingLaunchesSection.defaultProps = {
  sectionId: undefined
};
