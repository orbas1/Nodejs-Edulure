import AdminStats from '../components/AdminStats.jsx';
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx';

const approvals = [
  {
    name: 'Taylor Reed',
    type: 'Instructor application',
    summary: 'Specializes in community monetization and retention playbooks.',
    status: 'Pending review'
  },
  {
    name: 'Momentum Makers',
    type: 'Community launch',
    summary: 'Private accelerator for operators scaling evergreen programs.',
    status: 'Ready to go live'
  }
];

export default function Admin() {
  const { isFeatureEnabled, getConfigValue, loading } = useRuntimeConfig();
  const adminConsoleEnabled = isFeatureEnabled('admin.operational-console');
  const escalationChannel = getConfigValue('admin.console.escalation-channel', '#admin-escalations');

  if (!adminConsoleEnabled && !loading) {
    return (
      <section className="bg-slate-50/70 py-24">
        <div className="mx-auto max-w-3xl space-y-6 px-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Admin console disabled</h1>
          <p className="text-sm text-slate-600">
            The operational console is currently disabled for your account. If you believe this is an error, contact the
            platform operations team via <span className="font-semibold text-primary">{escalationChannel}</span> or raise a
            ticket with support.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-slate-50/70 py-16">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Admin control center</h1>
            <p className="mt-3 text-sm text-slate-600">
              Monitor growth, manage instructors, and approve communities from a single command console.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:border-primary hover:text-primary">
              Switch to instructor view
            </button>
            <button className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card hover:bg-primary-dark">
              Invite admin
            </button>
          </div>
        </div>
        <AdminStats />
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Approvals queue</h2>
          <div className="mt-6 space-y-4">
            {approvals.map((item) => (
              <div key={item.name} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs uppercase tracking-wide text-primary">{item.type}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{item.status}</span>
                  <button className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-primary hover:text-primary">
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
