export default function InstructorCourseCreate() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Course creation hub</h1>
          <p className="mt-2 text-sm text-slate-400">Structure your next cohort with guided scaffolding and production support.</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
          >
            Generate outline
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-primary/40 hover:text-white"
          >
            Import from Notion
          </button>
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        {[
          {
            title: 'Cohort blueprint',
            description: 'Define transformation, pacing, and accountability rituals. Auto-sync with tutor pods.',
            actions: ['Draft promise', 'Set milestones', 'Add rituals']
          },
          {
            title: 'Lesson architecture',
            description: 'Break down learning arcs into lesson beats with assets, activities, and assignments.',
            actions: ['Add module', 'Attach resources', 'Assign owner']
          },
          {
            title: 'Outcomes engine',
            description: 'Connect success metrics, surveys, and analytics to evaluate learner progress in real time.',
            actions: ['Configure metrics', 'Design survey', 'Launch dashboard']
          },
          {
            title: 'Launch kit',
            description: 'Craft promos, email sequences, and landing page copy with AI-assisted tooling.',
            actions: ['Brief marketing', 'Generate assets', 'Preview funnel']
          }
        ].map((card) => (
          <div key={card.title} className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
            <h2 className="text-lg font-semibold text-white">{card.title}</h2>
            <p className="mt-3 text-sm text-slate-400">{card.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
              {card.actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
