import PropTypes from 'prop-types';
import { useMemo } from 'react';

function formatDueDate(value) {
  if (!value) return 'TBD';
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) {
    return 'TBD';
  }
  const now = new Date();
  const diffDays = Math.round((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
  const label = formatter.format(due);
  if (diffDays < 0) {
    return `${label} · ${Math.abs(diffDays)}d overdue`;
  }
  if (diffDays === 0) {
    return `${label} · due today`;
  }
  if (diffDays === 1) {
    return `${label} · due tomorrow`;
  }
  return `${label} · ${diffDays}d`; // due in diffDays days
}

function formatWorkflowLabel(entry) {
  if (!entry.mode) return 'Manual review';
  if (typeof entry.mode === 'string') {
    const normalised = entry.mode.toLowerCase();
    if (normalised.includes('auto')) return 'Automation';
    if (normalised.includes('peer')) return 'Peer review';
    if (normalised.includes('ai')) return 'AI assisted';
  }
  return entry.mode;
}

export default function AssignmentPipelineSection({ assignments }) {
  const summary = assignments?.summary ?? {};
  const upcoming = useMemo(
    () => [...(assignments?.queues?.upcoming ?? [])].sort((a, b) => {
      const dateA = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
      const dateB = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
      return dateA - dateB;
    }),
    [assignments?.queues?.upcoming]
  );
  const review = assignments?.queues?.review ?? [];
  const automation = assignments?.queues?.automation ?? [];

  const hasContent =
    (summary.total ?? 0) > 0 || upcoming.length > 0 || review.length > 0 || automation.length > 0;
  if (!hasContent) {
    return null;
  }

  const handleOpenAssignment = (assignment) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('edulure:assignment-open', {
        detail: {
          assignmentId: assignment.id,
          courseTitle: assignment.courseTitle,
          dueAt: assignment.dueAt ?? assignment.dueDate ?? null,
          source: 'assignment-pipeline-section'
        }
      })
    );
  };

  return (
    <section className="dashboard-section">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Assignment pipeline</h2>
          <p className="text-sm text-slate-600">
            Track grading workload, automation coverage, and upcoming learner commitments.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs text-slate-600 md:text-sm">
          <div className="dashboard-card-muted px-4 py-3 text-center">
            <p className="font-semibold text-slate-900">{summary.total ?? 0}</p>
            <p>Total assignments</p>
          </div>
          <div className="dashboard-card-muted px-4 py-3 text-center">
            <p className="font-semibold text-slate-900">{summary.dueThisWeek ?? 0}</p>
            <p>Due this week</p>
          </div>
          <div className="dashboard-card-muted px-4 py-3 text-center">
            <p className="font-semibold text-slate-900">{summary.requiresReview ?? 0}</p>
            <p>Needs review</p>
          </div>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">Upcoming deadlines</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-600">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-3">Assignment</th>
                  <th className="pb-3">Course</th>
                  <th className="pb-3">Owner</th>
                  <th className="pb-3">Due</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {upcoming.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-primary/5">
                    <td className="py-3 font-semibold text-slate-900">{assignment.title}</td>
                    <td className="py-3">{assignment.courseTitle}</td>
                    <td className="py-3">{assignment.owner ?? 'Curriculum'}</td>
                    <td className="py-3 text-xs text-slate-500">{formatDueDate(assignment.dueAt ?? assignment.dueDate)}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1 text-xs"
                        onClick={() => handleOpenAssignment(assignment)}
                      >
                        Open brief
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="dashboard-card-muted p-4">
          <h3 className="text-sm font-semibold text-slate-900">Review queue</h3>
          {review.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">No assignments awaiting manual review.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {review.map((assignment) => (
                <li key={assignment.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{assignment.title}</p>
                    <p className="text-xs text-slate-500">{assignment.courseTitle}</p>
                  </div>
                  <span className="text-xs font-medium text-amber-600">Reviewer: {assignment.owner ?? 'Curriculum'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="dashboard-card-muted p-4">
          <h3 className="text-sm font-semibold text-slate-900">Automation coverage</h3>
          {automation.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">No automation workflows configured yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {automation.map((assignment) => (
                <li key={assignment.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{assignment.title}</p>
                    <p className="text-xs text-slate-500">{assignment.courseTitle}</p>
                  </div>
                  <span className="text-xs font-medium text-emerald-600">
                    {formatWorkflowLabel(assignment)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

AssignmentPipelineSection.propTypes = {
  assignments: PropTypes.shape({
    summary: PropTypes.shape({
      total: PropTypes.number,
      dueThisWeek: PropTypes.number,
      requiresReview: PropTypes.number
    }),
    queues: PropTypes.shape({
      upcoming: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          title: PropTypes.string,
          courseTitle: PropTypes.string,
          owner: PropTypes.string,
          dueAt: PropTypes.string,
          dueDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)])
        })
      ),
      review: PropTypes.arrayOf(PropTypes.object),
      automation: PropTypes.arrayOf(PropTypes.object)
    })
  })
};

AssignmentPipelineSection.defaultProps = {
  assignments: null
};
