import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function LearnerEbooks() {
  const { dashboard, refresh } = useOutletContext();
  const ebooks = dashboard?.ebooks;

  if (!ebooks) {
    return (
      <DashboardStateMessage
        title="E-book workspace unavailable"
        description="We could not load your library insights. Refresh to try pulling the latest progress and highlights."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const library = ebooks.library ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">E-book library</h1>
          <p className="mt-2 text-sm text-slate-500">
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
        {library.length > 0 ? (
          library.map((ebook) => (
            <div key={ebook.id} className="dashboard-panel">
              <p className="text-xs uppercase tracking-wide text-slate-500">{ebook.format}</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">{ebook.title}</h2>
              <p className="mt-2 text-sm text-slate-500">Last opened {ebook.lastOpened}</p>
              <div className="mt-4 h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
                  style={{ width: `${ebook.progress}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-slate-500">{ebook.progress}% complete</p>
              <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                <button type="button" className="rounded-full border border-slate-300 px-3 py-1 hover:border-primary/50">
                  Continue reading
                </button>
                <button type="button" className="rounded-full border border-slate-300 px-3 py-1 hover:border-primary/50">
                  Share highlight
                </button>
              </div>
            </div>
          ))
        ) : (
          <DashboardStateMessage
            className="md:col-span-3"
            title="No saved e-books yet"
            description="Import resources or sync from your reader integrations to populate this space."
            actionLabel="Refresh"
            onAction={() => refresh?.()}
          />
        )}
      </section>
    </div>
  );
}
