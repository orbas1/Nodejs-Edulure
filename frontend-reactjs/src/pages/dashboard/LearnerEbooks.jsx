import { useOutletContext } from 'react-router-dom';

export default function LearnerEbooks() {
  const { dashboard } = useOutletContext();
  const library = dashboard?.ebooks?.library ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">E-book library</h1>
          <p className="mt-2 text-sm text-slate-400">
            Access every field guide, playbook, and resource pack to reinforce your coursework.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Upload notes
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {library.map((ebook) => (
          <div key={ebook.id} className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
            <p className="text-xs uppercase tracking-wide text-slate-500">{ebook.format}</p>
            <h2 className="mt-2 text-lg font-semibold text-white">{ebook.title}</h2>
            <p className="mt-2 text-sm text-slate-400">Last opened {ebook.lastOpened}</p>
            <div className="mt-4 h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
                style={{ width: `${ebook.progress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">{ebook.progress}% complete</p>
            <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
              <button type="button" className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                Continue reading
              </button>
              <button type="button" className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                Share highlight
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
