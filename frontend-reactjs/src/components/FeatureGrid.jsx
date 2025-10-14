const features = [
  {
    title: 'Community OS',
    description: 'Design and run cohorts with structured spaces that scale cleanly.',
    bullets: ['Modular classrooms', 'Guided onboarding', 'Automated nudges']
  },
  {
    title: 'Commerce engine',
    description: 'Launch offers, bundles, and subscriptions with analytics that close the loop.',
    bullets: ['Adaptive landing pages', 'Stripe & Paddle ready', 'Behavior-based segments']
  },
  {
    title: 'Live learning intelligence',
    description: 'Watch engagement trends across sessions, resources, and conversations in real time.',
    bullets: ['Unified engagement graph', 'Session quality scoring', 'AI-powered insights']
  }
];

export default function FeatureGrid() {
  return (
    <section className="bg-slate-50/70">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="md:text-center">
          <h2 className="text-3xl font-semibold text-slate-900">Run every learning stream from one secure hub</h2>
          <p className="mt-4 text-base text-slate-600">
            Launch, grow, and monetize programs with tooling that keeps teams aligned and data protected.
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
