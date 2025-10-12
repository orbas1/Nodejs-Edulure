import { useOutletContext } from 'react-router-dom';

export default function InstructorCommunityCreate() {
  const { dashboard } = useOutletContext();
  const templates = dashboard?.communities?.createTemplates ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Community launch studio</h1>
          <p className="mt-2 text-sm text-slate-400">Spin up curated community spaces with proven facilitation blueprints.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Start from scratch
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <div key={template.id} className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
            <p className="text-xs uppercase tracking-wide text-slate-500">{template.duration}</p>
            <h2 className="mt-2 text-lg font-semibold text-white">{template.name}</h2>
            <p className="mt-3 text-sm text-slate-300">What’s inside:</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-400">
              {template.ingredients.map((item) => (
                <li key={item} className="rounded-xl border border-slate-900/60 bg-slate-900/60 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-3 text-xs text-slate-400">
              <button type="button" className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                Preview agenda
              </button>
              <button type="button" className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                Duplicate
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
