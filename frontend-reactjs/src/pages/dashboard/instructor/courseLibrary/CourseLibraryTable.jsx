import PropTypes from 'prop-types';

export default function CourseLibraryTable({ assets }) {
  return (
    <section className="dashboard-section">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="pb-3">Title</th>
            <th className="pb-3">Format</th>
            <th className="pb-3">Last updated</th>
            <th className="pb-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {assets.map((asset) => (
            <tr key={asset.id} className="hover:bg-primary/5">
              <td className="py-3 text-slate-900">{asset.title}</td>
              <td className="py-3 text-slate-600">{asset.format}</td>
              <td className="py-3 text-slate-600">{asset.updated}</td>
              <td className="py-3 text-right text-xs text-slate-600">
                <button type="button" className="dashboard-pill px-3 py-1">
                  View
                </button>
                <button type="button" className="ml-2 dashboard-pill px-3 py-1">
                  Share
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

CourseLibraryTable.propTypes = {
  assets: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string,
      format: PropTypes.string,
      updated: PropTypes.string
    })
  )
};

CourseLibraryTable.defaultProps = {
  assets: []
};
