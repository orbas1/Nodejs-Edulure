import { useMemo } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';

export default function CourseViewer() {
  const { courseId } = useParams();
  const { dashboard } = useOutletContext();
  const course = useMemo(() => dashboard?.courses?.active.find((item) => item.id === courseId), [dashboard, courseId]);

  if (!course) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-400">Course not found or not part of your current programs.</p>
        <Link to="/dashboard/learner/courses" className="text-sm font-semibold text-primary hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Course viewer</p>
          <h1 className="text-2xl font-semibold text-white">{course.title}</h1>
          <p className="text-sm text-slate-400">Facilitated by {course.instructor}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
          >
            Launch workspace
          </button>
          <Link
            to="/dashboard/learner/courses"
            className="rounded-full border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-primary/40 hover:text-white"
          >
            Back to courses
          </Link>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white">Lesson queue</h2>
          <p className="mt-2 text-sm text-slate-400">Dive into the structured journey. Progress auto-saves when you leave.</p>
          <ul className="mt-5 space-y-4">
            {[
              'Lesson 1 · Systems baseline assessment',
              'Lesson 2 · Ritual inventory mapping',
              'Lesson 3 · Sprint retrospectives live lab',
              'Lesson 4 · Automation roundtable'
            ].map((lesson, index) => (
              <li key={lesson} className="rounded-2xl border border-slate-900/60 bg-slate-900/60 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 text-sm font-semibold text-slate-300">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{lesson}</p>
                    {index === 2 ? <p className="text-xs text-primary">Next lesson · {course.nextLesson}</p> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
            <h2 className="text-lg font-semibold text-white">Progress</h2>
            <p className="mt-2 text-sm text-slate-400">{course.progress}% complete</p>
            <div className="mt-4 h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark" style={{ width: `${course.progress}%` }} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Next action: {course.nextLesson}</p>
          </div>
          <div className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
            <h2 className="text-lg font-semibold text-white">Resources</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li className="rounded-xl border border-slate-900/60 bg-slate-900/60 px-3 py-2">Program handbook</li>
              <li className="rounded-xl border border-slate-900/60 bg-slate-900/60 px-3 py-2">Sprint templates</li>
              <li className="rounded-xl border border-slate-900/60 bg-slate-900/60 px-3 py-2">Mentor office hours</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
