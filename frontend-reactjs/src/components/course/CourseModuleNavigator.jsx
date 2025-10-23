import PropTypes from 'prop-types';

import CourseProgressBar from './CourseProgressBar.jsx';

function resolveLessonStatusTone(lesson) {
  if (!lesson) return 'text-slate-500';
  if (lesson.completed) return 'text-emerald-600';
  if (lesson.status === 'scheduled') return 'text-amber-600';
  return 'text-primary';
}

function LessonPreview({ lesson, onSelect, isActive }) {
  if (!lesson) return null;
  const baseClasses = [
    'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition',
    'hover:border-primary/40 hover:bg-primary/5'
  ];
  if (isActive) {
    baseClasses.push('border-primary bg-white shadow-sm');
  } else {
    baseClasses.push('border-slate-200 bg-slate-50');
  }
  return (
    <button
      type="button"
      onClick={() => onSelect?.(lesson)}
      className={baseClasses.join(' ')}
      aria-current={isActive ? 'true' : undefined}
    >
      <div>
        <p className="text-sm font-medium text-slate-800">{lesson.title}</p>
        <p className="text-xs text-slate-500">{lesson.releaseLabel ?? lesson.nextActionLabel}</p>
      </div>
      <span className={`text-xs font-semibold ${resolveLessonStatusTone(lesson)}`}>
        {lesson.completed ? 'Done' : lesson.status === 'scheduled' ? 'Scheduled' : 'Ready'}
      </span>
    </button>
  );
}

LessonPreview.propTypes = {
  lesson: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    title: PropTypes.string,
    releaseLabel: PropTypes.string,
    status: PropTypes.string,
    completed: PropTypes.bool
  }).isRequired,
  onSelect: PropTypes.func,
  isActive: PropTypes.bool
};

LessonPreview.defaultProps = {
  onSelect: undefined,
  isActive: false
};

function ModuleCard({ module, maxPreviewLessons, onLessonSelect, index, activeLessonId }) {
  const lessons = Array.isArray(module.lessons) ? module.lessons : [];
  const previewLessons = lessons.slice(0, maxPreviewLessons);
  const extraCount = Math.max(0, lessons.length - previewLessons.length);
  const moduleNumber = Number.isFinite(module.position)
    ? module.position >= 1
      ? module.position
      : module.position + 1
    : index + 1;
  return (
    <div className="dashboard-card-muted space-y-4 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="dashboard-kicker">Module {moduleNumber}</p>
          <p className="text-sm font-semibold text-slate-900">{module.title}</p>
          {module.releaseLabel ? (
            <p className="text-xs text-slate-500">{module.releaseLabel}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">{module.completionPercent}%</p>
          <p className="text-xs text-slate-500">
            {module.completedLessons}/{module.totalLessons} lessons
          </p>
        </div>
      </div>
      <CourseProgressBar value={module.completionPercent} tone={module.completionPercent === 100 ? 'emerald' : 'primary'} />
      <div>
        {module.nextLesson ? (
          <p className="text-xs font-semibold text-primary">
            Next lesson · {module.nextLesson.title}
            {module.nextLesson.releaseLabel ? ` • ${module.nextLesson.releaseLabel}` : ''}
          </p>
        ) : (
          <p className="text-xs font-semibold text-emerald-600">Module complete</p>
        )}
      </div>
      <div className="space-y-2">
        {previewLessons.map((lesson) => (
          <LessonPreview
            key={lesson.id ?? lesson.title}
            lesson={lesson}
            onSelect={onLessonSelect}
            isActive={lesson.id === activeLessonId}
          />
        ))}
        {extraCount > 0 ? (
          <p className="text-xs text-slate-400">+{extraCount} more lessons</p>
        ) : null}
      </div>
    </div>
  );
}

ModuleCard.propTypes = {
  module: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    title: PropTypes.string,
    position: PropTypes.number,
    releaseLabel: PropTypes.string,
    completionPercent: PropTypes.number,
    completedLessons: PropTypes.number,
    totalLessons: PropTypes.number,
    nextLesson: PropTypes.shape({
      title: PropTypes.string,
      releaseLabel: PropTypes.string,
      status: PropTypes.string,
      completed: PropTypes.bool
    }),
    lessons: PropTypes.arrayOf(PropTypes.object)
  }).isRequired,
  maxPreviewLessons: PropTypes.number,
  onLessonSelect: PropTypes.func,
  index: PropTypes.number,
  activeLessonId: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

ModuleCard.defaultProps = {
  maxPreviewLessons: 4,
  onLessonSelect: undefined,
  index: 0,
  activeLessonId: null
};

export function CourseModuleNavigator({
  modules,
  emptyLabel,
  maxPreviewLessons,
  onLessonSelect,
  className,
  activeLessonId
}) {
  if (!modules?.length) {
    return (
      <div className={`rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 ${className}`}>
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className={`space-y-4 ${className}`}>
      {modules.map((module, index) => (
        <ModuleCard
          key={module.id ?? module.title}
          module={module}
          maxPreviewLessons={maxPreviewLessons}
          onLessonSelect={onLessonSelect}
          index={index}
          activeLessonId={activeLessonId}
        />
      ))}
    </div>
  );
}

CourseModuleNavigator.propTypes = {
  modules: PropTypes.arrayOf(PropTypes.object),
  emptyLabel: PropTypes.string,
  maxPreviewLessons: PropTypes.number,
  onLessonSelect: PropTypes.func,
  className: PropTypes.string,
  activeLessonId: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

CourseModuleNavigator.defaultProps = {
  modules: [],
  emptyLabel: 'Modules will appear once the instructor publishes the curriculum.',
  maxPreviewLessons: 4,
  onLessonSelect: undefined,
  className: '',
  activeLessonId: null
};

export { ModuleCard };
