import PropTypes from 'prop-types';
import { useMemo } from 'react';

function buildLanguageLabel(languages) {
  if (!Array.isArray(languages) || languages.length === 0) {
    return 'N/A';
  }
  return languages
    .map((language) => {
      const label = language.label ?? language.code;
      const indicator = language.published ? '' : ' (draft)';
      return `${label}${indicator}`;
    })
    .join(', ');
}

function catalogueToCsv(rows) {
  const headers = [
    'Title',
    'Format',
    'Languages',
    'Active learners',
    'Completed learners',
    'Average progress (%)',
    'Automation cadence',
    'Updated at'
  ];
  const lines = rows.map((row) => [
    row.title,
    row.format,
    buildLanguageLabel(row.languages),
    row.learners?.active ?? 0,
    row.learners?.completed ?? 0,
    row.averageProgress ?? 0,
    row.automation?.cadence ?? row.automation?.cadenceLabel ?? row.automation?.cadence ?? 'N/A',
    row.updatedAt ?? '—'
  ]);
  return [headers, ...lines]
    .map((line) =>
      line
        .map((value) => {
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"')) {
            return `"${stringValue.replaceAll('"', '""')}"`;
          }
          return stringValue;
        })
        .join(',')
    )
    .join('\n');
}

export default function CourseCatalogueSection({ catalogue }) {
  const rows = useMemo(() => (Array.isArray(catalogue) ? catalogue : []), [catalogue]);
  const hasRows = rows.length > 0;

  if (!hasRows) {
    return null;
  }

  const handleExport = () => {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return;
    const csv = catalogueToCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'edulure-course-catalogue.csv';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="dashboard-section">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Course catalogue</h2>
          <p className="text-sm text-slate-600">
            Track localisation coverage, learner volume, and production status for every active blueprint.
          </p>
        </div>
        <button type="button" className="dashboard-pill" onClick={handleExport}>
          Export CSV
        </button>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-600">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-3">Title</th>
              <th className="pb-3">Format</th>
              <th className="pb-3">Languages</th>
              <th className="pb-3">Learners</th>
              <th className="pb-3">Avg progress</th>
              <th className="pb-3">Automation</th>
              <th className="pb-3 text-right">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((course) => (
              <tr key={course.id} className="hover:bg-primary/5">
                <td className="py-3 font-semibold text-slate-900">{course.title}</td>
                <td className="py-3">{course.format ?? '—'}</td>
                <td className="py-3">
                  <span className="whitespace-nowrap">
                    {course.languages?.map((language) => (
                      <span
                        key={`${course.id}-${language.code}`}
                        className="mr-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                        dir={language.direction ?? 'ltr'}
                      >
                        <span>{language.label ?? language.code}</span>
                        {!language.published && <span className="font-medium text-amber-600">Draft</span>}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="py-3">
                  <span className="block text-sm font-medium text-slate-900">{course.learners?.active ?? 0} active</span>
                  <span className="text-xs text-slate-500">{course.learners?.completed ?? 0} completed</span>
                </td>
                <td className="py-3">{course.averageProgress ?? 0}%</td>
                <td className="py-3">
                  {course.automation?.cadence ?? course.automation?.cadenceLabel ?? 'Manual orchestration'}
                </td>
                <td className="py-3 text-right text-xs text-slate-500">
                  {course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

CourseCatalogueSection.propTypes = {
  catalogue: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      title: PropTypes.string,
      format: PropTypes.string,
      languages: PropTypes.arrayOf(
        PropTypes.shape({
          code: PropTypes.string,
          label: PropTypes.string,
          published: PropTypes.bool,
          direction: PropTypes.string
        })
      ),
      learners: PropTypes.shape({
        active: PropTypes.number,
        completed: PropTypes.number
      }),
      averageProgress: PropTypes.number,
      automation: PropTypes.object,
      updatedAt: PropTypes.string
    })
  )
};

CourseCatalogueSection.defaultProps = {
  catalogue: []
};
