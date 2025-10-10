const features = [
  {
    title: 'Community operating system',
    description:
      'Run cohorts, memberships, and masterminds with modular spaces for lessons, calls, and challenges.',
    bullets: ['Dynamic classroom builder', 'Member onboarding journeys', 'Automated nudges']
  },
  {
    title: 'Commerce that converts',
    description: 'Launch high-performing funnels with built-in analytics, upsells, and subscription billing.',
    bullets: ['Adaptive landing pages', 'Stripe & Paddle support', 'Behavioral segmentation']
  },
  {
    title: 'Live learning intelligence',
    description:
      'Track engagement across live sessions, resources, and community threads to scale what works.',
    bullets: ['Unified engagement graph', 'Session quality scoring', 'AI-powered insights']
  }
];

export default function FeatureGrid() {
  return (
    <section className="bg-slate-50/70">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="md:text-center">
          <h2 className="text-3xl font-semibold text-slate-900">Operate your learning empire from a single dashboard</h2>
          <p className="mt-4 text-base text-slate-600">
            Everything from discovery to delivery to community growth, wired for scale and obsession-worthy experiences.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
              <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-4 text-sm leading-6 text-slate-600">{feature.description}</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                {feature.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-4 rounded-full bg-primary" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
