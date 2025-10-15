import PropTypes from 'prop-types';
import {
  ArrowPathIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

const TYPE_FILTERS = [
  { id: 'all', label: 'All types' },
  { id: 'course', label: 'Courses' },
  { id: 'ebook', label: 'E-books' },
  { id: 'community', label: 'Communities' },
  { id: 'ads_asset', label: 'Ads assets' }
];

const STATUS_TONE = {
  draft: 'bg-slate-100 text-slate-600',
  ready_for_review: 'bg-amber-100 text-amber-700',
  in_review: 'bg-sky-100 text-sky-700',
  changes_requested: 'bg-rose-100 text-rose-700',
  approved: 'bg-emerald-100 text-emerald-700',
  published: 'bg-emerald-200 text-emerald-800',
  archived: 'bg-slate-200 text-slate-500'
};

function StatusBadge({ status }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.draft;
  const label = status.replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${tone}`}>
      {label}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired
};

function ProjectRow({ project, selected, onSelect }) {
  return (
    <tr
      className={`cursor-pointer border-b last:border-b-0 ${
        selected ? 'bg-primary/5' : 'bg-white hover:bg-slate-50'
      }`}
      onClick={() => onSelect(project)}
    >
      <td className="px-4 py-4">
        <div className="font-semibold text-slate-900">{project.title}</div>
        <div className="mt-1 text-xs text-slate-500">{project.publicId}</div>
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={project.status} />
      </td>
      <td className="px-4 py-4 text-sm text-slate-600 capitalize">{project.type}</td>
      <td className="px-4 py-4 text-sm text-slate-600">
        <div className="flex items-center gap-2 text-xs">
          <UsersIcon className="h-4 w-4" />
          {project.collaboratorCount ?? project.collaborators?.length ?? 0}
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-slate-600">
        <div className="flex items-center gap-2 text-xs">
          <ClockIcon className="h-4 w-4" />
          {project.updatedAt ? new Date(project.updatedAt).toLocaleString() : '—'}
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-slate-600">
        {project.latestVersion?.versionNumber ? `v${project.latestVersion.versionNumber}` : 'v1'}
      </td>
    </tr>
  );
}

ProjectRow.propTypes = {
  project: PropTypes.shape({
    title: PropTypes.string,
    publicId: PropTypes.string,
    status: PropTypes.string,
    type: PropTypes.string,
    collaboratorCount: PropTypes.number,
    collaborators: PropTypes.array,
    updatedAt: PropTypes.string,
    latestVersion: PropTypes.shape({ versionNumber: PropTypes.number })
  }).isRequired,
  selected: PropTypes.bool,
  onSelect: PropTypes.func.isRequired
};

ProjectRow.defaultProps = {
  selected: false
};

export default function CreationProjectList({
  projects,
  selectedId,
  onSelect,
  loading,
  error,
  onRetry,
  filters,
  onFilterChange
}) {
  const handleSearch = (event) => {
    onFilterChange({ ...filters, search: event.target.value });
  };

  const handleFilterClick = (filterId) => {
    onFilterChange({ ...filters, type: filterId });
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Creation studio projects</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Portfolio overview</h2>
        </div>
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <div className="relative w-full md:w-80">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-12 pr-4 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Search projects"
              value={filters.search}
              onChange={handleSearch}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((filter) => {
              const isActive = filters.type === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => handleFilterClick(filter.id)}
                  className={`rounded-2xl border px-3 py-1 text-xs font-semibold transition ${
                    isActive
                      ? 'border-primary bg-primary text-white shadow'
                      : 'border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 p-6 text-sm text-slate-500">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          Loading projects…
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-4 p-6 text-sm text-rose-600">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <span>{error.message ?? 'Failed to load projects'}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full border border-rose-200 px-4 py-1 text-xs font-semibold text-rose-600 hover:border-rose-400 hover:bg-rose-50"
            >
              Retry
            </button>
          )}
        </div>
      ) : projects.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">No projects found for the selected filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Collaborators</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Version</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <ProjectRow
                  key={project.publicId ?? project.id}
                  project={project}
                  selected={(project.publicId ?? project.id) === selectedId}
                  onSelect={onSelect}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

CreationProjectList.propTypes = {
  projects: PropTypes.arrayOf(ProjectRow.propTypes.project),
  selectedId: PropTypes.string,
  onSelect: PropTypes.func,
  loading: PropTypes.bool,
  error: PropTypes.instanceOf(Error),
  onRetry: PropTypes.func,
  filters: PropTypes.shape({
    search: PropTypes.string,
    type: PropTypes.string
  }),
  onFilterChange: PropTypes.func
};

CreationProjectList.defaultProps = {
  projects: [],
  selectedId: null,
  onSelect: () => {},
  loading: false,
  error: null,
  onRetry: null,
  filters: { search: '', type: 'all' },
  onFilterChange: () => {}
};
