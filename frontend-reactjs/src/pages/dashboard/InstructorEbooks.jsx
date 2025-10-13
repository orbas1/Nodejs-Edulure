import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function InstructorEbooks() {
  const { dashboard, refresh } = useOutletContext();
  const catalogue = dashboard?.ebooks?.catalogue ?? [];

  if (catalogue.length === 0) {
    return (
      <DashboardStateMessage
        title="No published titles"
        description="Publish a guide or sync from your distribution channels to monitor catalogue performance."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">E-book catalogue</h1>
          <p className="mt-2 text-sm text-slate-600">Track performance of your published guides across the Edulure network.</p>
        </div>
        <button type="button" className="dashboard-primary-pill">
          Promote title
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {catalogue.map((ebook) => (
          <div key={ebook.id} className="dashboard-section">
            <p className="text-xs uppercase tracking-wide text-slate-500">{ebook.status}</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{ebook.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{ebook.downloads} downloads</p>
            <div className="mt-4 flex gap-3 text-xs text-slate-600">
              <button type="button" className="dashboard-pill px-3 py-1 hover:border-primary/50">
                View analytics
              </button>
              <button type="button" className="dashboard-pill px-3 py-1 hover:border-primary/50">
                Share link
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
