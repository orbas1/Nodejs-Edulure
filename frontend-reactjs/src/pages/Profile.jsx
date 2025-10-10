export default function Profile() {
  return (
    <section className="bg-slate-50/70 py-16">
      <div className="mx-auto max-w-4xl space-y-10 px-6">
        <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-card">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <img
                src="https://i.pravatar.cc/100?img=28"
                alt="Profile"
                className="h-20 w-20 rounded-full object-cover"
              />
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Alex Morgan</h1>
                <p className="text-sm text-slate-500">Founder @ Growth Operator, Instructor</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:border-primary hover:text-primary">
                Edit profile
              </button>
              <button className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card hover:bg-primary-dark">
                Share profile
              </button>
            </div>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Communities</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">12 joined</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Courses hosted</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">5 live • 3 upcoming</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avg. engagement</p>
              <p className="mt-2 text-lg font-semibold text-primary">87%</p>
            </div>
          </div>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Active programs</h2>
            <ul className="mt-4 space-y-4 text-sm text-slate-600">
              <li className="flex items-center justify-between">
                <span>Revenue Operations Intensive</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Live</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Community Monetization Sprint</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Cohort prepping</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Scaling Advisors Collective</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Applications open</span>
              </li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Personal automation stack</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Auto-sync leads to HubSpot + Slack alerts</li>
              <li>Weekly engagement digests delivered to team inboxes</li>
              <li>Retention risk scoring with recommended actions</li>
            </ul>
            <button className="mt-6 w-full rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:border-primary hover:text-primary">
              Configure automations
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
