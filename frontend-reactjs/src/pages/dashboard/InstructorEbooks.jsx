import { useOutletContext } from 'react-router-dom';

export default function InstructorEbooks() {
  const { dashboard } = useOutletContext();
  const catalogue = dashboard?.ebooks?.catalogue ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">E-book catalogue</h1>
          <p className="mt-2 text-sm text-slate-400">Track performance of your published guides across the Edulure network.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Promote title
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {catalogue.map((ebook) => (
          <div key={ebook.id} className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
            <p className="text-xs uppercase tracking-wide text-slate-500">{ebook.status}</p>
            <h2 className="mt-2 text-lg font-semibold text-white">{ebook.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{ebook.downloads} downloads</p>
            <div className="mt-4 flex gap-3 text-xs text-slate-400">
              <button type="button" className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                View analytics
              </button>
              <button type="button" className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                Share link
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
