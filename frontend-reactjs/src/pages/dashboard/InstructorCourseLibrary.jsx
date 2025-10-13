import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function InstructorCourseLibrary() {
  const { dashboard, refresh } = useOutletContext();
  const library = dashboard?.courses?.library ?? [];

  if (library.length === 0) {
    return (
      <DashboardStateMessage
        title="No recorded assets"
        description="Upload or migrate recorded sessions to build your evergreen course library."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Recorded content library</h1>
          <p className="mt-2 text-sm text-slate-500">Manage evergreen assets, refresh cadences, and distribution channels.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Upload new asset
        </button>
      </div>

      <section className="dashboard-panel">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-3">Title</th>
              <th className="pb-3">Format</th>
              <th className="pb-3">Last updated</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {library.map((asset) => (
              <tr key={asset.id} className="hover:bg-primary/5">
                <td className="py-3 text-slate-900">{asset.title}</td>
                <td className="py-3 text-slate-500">{asset.format}</td>
                <td className="py-3 text-slate-500">{asset.updated}</td>
                <td className="py-3 text-right text-xs text-slate-500">
                  <button className="rounded-full border border-slate-300 px-3 py-1 hover:border-primary/50">View</button>
                  <button className="ml-2 rounded-full border border-slate-300 px-3 py-1 hover:border-primary/50">Share</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
