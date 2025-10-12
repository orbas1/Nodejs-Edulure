export default function BecomeInstructor() {
  return (
    <div className="space-y-10">
      <header className="rounded-3xl border border-primary/20 bg-primary/10 p-8 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary-light">Instructor accelerator</p>
            <h1 className="text-3xl font-semibold">Turn your playbooks into premium cohorts</h1>
            <p className="mt-3 max-w-2xl text-sm text-primary-light">
              Apply for the Edulure instructor network to access production resources, cohort strategists, and the marketing
              engine powering our most successful programs.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-slate-100"
          >
            Start instructor application
          </button>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: 'Phase 1 · Portfolio review',
            description: 'Share flagship outcomes, community contributions, and testimonials. Our team responds within 48 hours.'
          },
          {
            title: 'Phase 2 · Instructional design lab',
            description: 'Co-design your curriculum with Edulure producers, including session blueprints and asset plans.'
          },
          {
            title: 'Phase 3 · Launch partnership',
            description: 'Access dedicated marketing, platform tooling, and tutor pods to run your cohort at scale.'
          }
        ].map((phase) => (
          <div key={phase.title} className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
            <p className="text-xs uppercase tracking-wide text-slate-500">{phase.title}</p>
            <p className="mt-3 text-sm text-slate-300">{phase.description}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">What you unlock</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            'Production team with editors, designers, and success ops',
            'Revenue share accelerator with performance multipliers',
            'Mentor pods calibrated to your curriculum',
            'Dedicated community operations squad',
            'Marketing placement across the Edulure network',
            'Access to Edulure Ads experimentation budget'
          ].map((benefit) => (
            <li key={benefit} className="rounded-2xl border border-slate-900/60 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
              {benefit}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
