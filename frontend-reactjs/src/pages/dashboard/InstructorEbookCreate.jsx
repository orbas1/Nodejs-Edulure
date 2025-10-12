import { useOutletContext } from 'react-router-dom';

export default function InstructorEbookCreate() {
  const { dashboard } = useOutletContext();
  const pipelines = dashboard?.ebooks?.creationPipelines ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">E-book production</h1>
          <p className="mt-2 text-sm text-slate-400">Coordinate drafts, editing, and release planning for upcoming titles.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Create new manuscript
        </button>
      </div>

      <section className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
        <ul className="space-y-4">
          {pipelines.map((pipeline) => (
            <li key={pipeline.id} className="rounded-2xl border border-slate-900/60 bg-slate-900/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{pipeline.stage}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{pipeline.title}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>Owner {pipeline.owner}</p>
                  <button type="button" className="mt-2 rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                    Open workspace
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
