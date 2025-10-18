import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Programs',
    helper: 'Build cohorts fast',
    actions: [
      { label: 'New Cohort', to: '/dashboard/instructor/courses/create' },
      { label: 'Module Library', to: '/dashboard/instructor/courses/library' },
      { label: 'Lesson Studio', to: '/dashboard/instructor/creation-studio' }
    ]
  },
  {
    title: 'Engagement',
    helper: 'Keep rooms active',
    actions: [
      { label: 'Live Rooms', to: '/dashboard/instructor/live-classes' },
      { label: 'Calendar', to: '/dashboard/instructor/calendar' },
      { label: 'Inbox', to: '/dashboard/instructor/inbox' }
    ]
  },
  {
    title: 'Revenue',
    helper: 'Track and grow',
    actions: [
      { label: 'Pricing', to: '/dashboard/instructor/pricing' },
      { label: 'Affiliate', to: '/dashboard/instructor/affiliate' },
      { label: 'Ads', to: '/dashboard/instructor/ads' }
    ]
  }
];

export default function FeatureGrid() {
  return (
    <section className="bg-slate-50/70">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="md:text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Workflow shortcuts</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">Move from idea to launch without detours</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex h-full flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-card"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{feature.helper}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">{feature.title}</h3>
              </div>
              <div className="grid gap-3">
                {feature.actions.map((action) => (
                  <Link
                    key={action.label}
                    to={action.to}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
