import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function DashboardCalendar() {
  const { role, dashboard, refresh } = useOutletContext();
  const items = dashboard?.calendar ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">{role === 'instructor' ? 'Program calendar' : 'Learning calendar'}</h1>
          <p className="dashboard-subtitle">
            Seamlessly coordinate live sessions, deep work blocks, and content releases.
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="dashboard-primary-pill">
            Create event
          </button>
          <button type="button" className="dashboard-pill">
            Share agenda
          </button>
        </div>
      </div>

      <section className="dashboard-section">
        {items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-5">
            {items.map((day) => (
              <div key={day.id} className="dashboard-card-muted p-4">
                <p className="dashboard-kicker">{day.day}</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {day.items.map((item) => (
                    <li key={item} className="dashboard-card-muted px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <DashboardStateMessage
            title="Calendar is clear"
            description="No commitments found for this role. Refresh after scheduling sessions or syncing calendars."
            actionLabel="Refresh"
            onAction={() => refresh?.()}
          />
        )}
      </section>
    </div>
  );
}
