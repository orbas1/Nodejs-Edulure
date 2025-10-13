import PropTypes from 'prop-types';

export default function InstructorRevenueSection({ revenueSlices }) {
  if (revenueSlices.length === 0) return null;

  return (
    <section className="dashboard-section lg:col-span-2">
      <p className="dashboard-kicker">Revenue composition</p>
      <ul className="mt-4 space-y-3">
        {revenueSlices.map((slice) => (
          <li key={slice.name} className="dashboard-card-muted flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-medium text-slate-900">{slice.name}</span>
            <span className="text-slate-500">{slice.value}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

InstructorRevenueSection.propTypes = {
  revenueSlices: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
    })
  )
};

InstructorRevenueSection.defaultProps = {
  revenueSlices: []
};
