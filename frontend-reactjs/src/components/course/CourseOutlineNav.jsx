import PropTypes from 'prop-types';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function formatStatus(lesson) {
  if (lesson.completed) {
    return 'Completed';
  }
  if (lesson.status === 'scheduled') {
    if (lesson.releaseAt) {
      try {
        const date = new Date(lesson.releaseAt);
        if (!Number.isNaN(date.getTime())) {
          return `Unlocks ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        }
      } catch (error) {
        return 'Scheduled';
      }
    }
    return 'Scheduled';
  }
  return 'Ready to start';
}

export default function CourseOutlineNav({
  modules,
  activeLessonSlug,
  onSelectLesson,
  onToggleLessonComplete,
  updatingLesson
}) {
  if (!modules?.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
        Modules will appear here once the instructor publishes the curriculum.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {modules.map((module, index) => (
        <div key={module.id ?? module.slug ?? index} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Module {index + 1}</p>
              <p className="text-sm font-semibold text-slate-900">{module.title}</p>
              <p className="text-xs text-slate-500">{module.releaseLabel}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="text-sm font-semibold text-slate-900">{module.progress?.completionPercent ?? 0}%</p>
              <p>
                {module.progress?.completedLessons ?? 0} / {module.progress?.totalLessons ?? 0} lessons
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {(module.lessons ?? []).map((lesson) => {
              const isActive = activeLessonSlug && lesson.slug === activeLessonSlug;
              const isUpdating = updatingLesson === lesson.slug;
              const isDisabled = lesson.status === 'scheduled';
              const completed = Boolean(lesson.completed);
              return (
                <div
                  key={lesson.id ?? lesson.slug}
                  className={classNames(
                    'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition',
                    isActive ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-slate-200 bg-slate-50'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectLesson?.(lesson)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-slate-800">{lesson.title}</p>
                    <p className="text-xs text-slate-500">{formatStatus(lesson)}</p>
                  </button>
                  <button
                    type="button"
                    disabled={isDisabled || isUpdating}
                    onClick={() => onToggleLessonComplete?.(lesson, !completed)}
                    className={classNames(
                      'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition',
                      completed
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300',
                      isDisabled ? 'cursor-not-allowed opacity-60 hover:bg-slate-200' : ''
                    )}
                  >
                    {isUpdating ? 'Saving…' : completed ? 'Completed' : 'Mark done'}
                  </button>
                </div>
              );
            })}
            {module.lessons?.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-400">
                Lessons are being scheduled.
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

CourseOutlineNav.propTypes = {
  modules: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      slug: PropTypes.string,
      title: PropTypes.string,
      releaseLabel: PropTypes.string,
      lessons: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
          slug: PropTypes.string,
          title: PropTypes.string,
          status: PropTypes.string,
          releaseAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
          completed: PropTypes.bool
        })
      ),
      progress: PropTypes.shape({
        completionPercent: PropTypes.number,
        completedLessons: PropTypes.number,
        totalLessons: PropTypes.number
      })
    })
  ),
  activeLessonSlug: PropTypes.string,
  onSelectLesson: PropTypes.func,
  onToggleLessonComplete: PropTypes.func,
  updatingLesson: PropTypes.string
};

CourseOutlineNav.defaultProps = {
  modules: [],
  activeLessonSlug: null,
  onSelectLesson: null,
  onToggleLessonComplete: null,
  updatingLesson: null
};
