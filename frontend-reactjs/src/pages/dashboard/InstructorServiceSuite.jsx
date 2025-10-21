import clsx from 'clsx';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import withInstructorDashboardAccess from './instructor/withInstructorDashboardAccess.jsx';

const summaryToneStyles = {
  primary: 'border-primary/30 bg-primary/5 text-primary',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  neutral: 'border-slate-200 bg-slate-50 text-slate-600'
};

const stageToneStyles = {
  success: 'border-emerald-200 bg-emerald-50/70',
  warning: 'border-amber-200 bg-amber-50/70',
  info: 'border-sky-200 bg-sky-50/70',
  neutral: 'border-slate-200 bg-slate-50',
  muted: 'border-slate-200 bg-white'
};

const bookingToneStyles = {
  confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  requested: 'border-amber-200 bg-amber-50 text-amber-700',
  in_review: 'border-sky-200 bg-sky-50 text-sky-700'
};

const calendarWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function flattenCalendarWeeks(weeks) {
  if (!Array.isArray(weeks)) return [];
  return weeks.flatMap((week) => (Array.isArray(week.days) ? week.days : []));
}

function getSummaryToneStyle(tone) {
  return summaryToneStyles[tone] ?? summaryToneStyles.neutral;
}

function getStageToneStyle(tone) {
  return stageToneStyles[tone] ?? stageToneStyles.muted;
}

function getBookingToneStyle(status) {
  return bookingToneStyles[status] ?? 'border-slate-200 bg-slate-50 text-slate-600';
}

function InstructorServiceSuite() {
  const { role, dashboard, refresh } = useOutletContext();

  if (role !== 'instructor') {
    return (
      <DashboardStateMessage
        title="Service suite is restricted"
        description="Only instructor Learnspaces can access service orchestration and booking controls."
      />
    );
  }

  const services = dashboard?.services ?? null;

  if (!services) {
    return (
      <DashboardStateMessage
        title="Service data not available"
        description="We could not retrieve your service catalogue or booking telemetry. Refresh to try again."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const summaryCards = Array.isArray(services.summary) ? services.summary : [];
  const workflow = services.workflow ?? {};
  const workflowStages = Array.isArray(workflow.stages) ? workflow.stages : [];
  const offerings = Array.isArray(services.catalogue) ? services.catalogue : [];
  const alerts = Array.isArray(services.alerts) ? services.alerts : [];
  const bookings = services.bookings ?? {};
  const upcomingBookings = Array.isArray(bookings.upcoming) ? bookings.upcoming : [];
  const monthlyBookings = Array.isArray(bookings.monthly) ? bookings.monthly : [];
  const calendarMonths = Array.isArray(bookings.calendar) ? bookings.calendar : [];
  const controls = services.controls ?? {};

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Enterprise service desk</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Service creation &amp; orchestration</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Design, launch, and govern high-touch service offerings with enterprise-grade booking telemetry and automation.
            Track intake queues, forward utilisation, and compliance controls in one cohesive Learnspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-primary-pill px-5" onClick={() => refresh?.()}>
            Refresh data
          </button>
          <a
            href="/dashboard/instructor/tutor-management"
            className="dashboard-pill px-4 py-2 text-sm font-semibold"
          >
            Manage mentor pods
          </a>
        </div>
      </div>

      {summaryCards.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.id}
              className={clsx(
                'rounded-3xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg',
                getSummaryToneStyle(card.tone)
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold">{card.value}</p>
              {card.detail && <p className="mt-2 text-sm opacity-80">{card.detail}</p>}
            </div>
          ))}
        </section>
      )}

      {alerts.length > 0 && (
        <section className="dashboard-section">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Operational alerts</h2>
              <p className="text-sm text-slate-600">
                Address intake bottlenecks and capacity breaches before they impact learner experience.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold text-slate-600">
              {alerts.length} active
            </span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={clsx(
                  'rounded-3xl border p-4',
                  alert.severity === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : alert.severity === 'error'
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                )}
              >
                <p className="text-sm font-semibold">{alert.title}</p>
                {alert.detail && <p className="mt-1 text-sm opacity-80">{alert.detail}</p>}
                {alert.ctaLabel && alert.ctaPath && (
                  <a
                    href={alert.ctaPath}
                    className="mt-3 inline-flex items-center text-xs font-semibold text-primary hover:underline"
                  >
                    {alert.ctaLabel}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {workflowStages.length > 0 && (
        <section className="dashboard-section">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Automation workflow</h2>
              <p className="text-sm text-slate-600">
                Align intake, delivery, and QA stages with clear KPIs and SLAs across your services portfolio.
              </p>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p className="font-semibold text-slate-700">Automation coverage</p>
              <p>{workflow.automationRate ? `${workflow.automationRate}%` : 'Manual orchestration'}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {workflowStages.map((stage) => (
              <div
                key={stage.id}
                className={clsx(
                  'flex h-full flex-col justify-between rounded-3xl border p-6 shadow-sm transition hover:shadow-md',
                  getStageToneStyle(stage.tone ?? stage.statusTone)
                )}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stage.title}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{stage.status}</p>
                  {stage.description && <p className="mt-2 text-sm text-slate-600">{stage.description}</p>}
                </div>
                {Array.isArray(stage.kpis) && stage.kpis.length > 0 && (
                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    {stage.kpis.map((kpi) => (
                      <div key={kpi} className="rounded-full bg-white/70 px-3 py-1 font-semibold text-slate-600 shadow-sm">
                        {kpi}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {Array.isArray(workflow.notes) && workflow.notes.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
              {workflow.notes.map((note) => (
                <span key={note} className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                  {note}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Service catalogue</h2>
            <p className="text-sm text-slate-600">
              Every offering is production-ready with governed pricing, delivery mode, and automation coverage.
            </p>
          </div>
          <a href="/dashboard/instructor/services" className="dashboard-pill text-sm font-semibold">
            Create new service
          </a>
        </div>
        {offerings.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
            No services configured yet. Launch a service to enable enterprise booking and automation workflows.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {offerings.map((offering) => (
              <div
                key={offering.id}
                className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{offering.category}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{offering.name}</p>
                  </div>
                  <span
                    className={clsx(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      offering.statusTone === 'warning'
                        ? 'bg-amber-50 text-amber-700'
                        : offering.statusTone === 'success'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {offering.statusLabel ?? offering.status}
                  </span>
                </div>
                {offering.description && <p className="mt-3 text-sm text-slate-600">{offering.description}</p>}
                <dl className="mt-4 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Pricing</dt>
                    <dd className="font-semibold text-slate-900">{offering.priceLabel}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Duration</dt>
                    <dd className="font-semibold text-slate-900">{offering.durationLabel}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Delivery</dt>
                    <dd className="font-semibold text-slate-900">{offering.deliveryLabel}</dd>
                  </div>
                  {offering.csatLabel && (
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-500">CSAT</dt>
                      <dd className="font-semibold text-slate-900">{offering.csatLabel}</dd>
                    </div>
                  )}
                  {offering.clientsServedLabel && (
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-500">Clients</dt>
                      <dd className="font-semibold text-slate-900">{offering.clientsServedLabel}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-4 space-y-2 text-xs text-slate-500">
                  {offering.automationLabel && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold">
                      {offering.automationLabel}
                    </span>
                  )}
                  {offering.slaLabel && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold">
                      {offering.slaLabel}
                    </span>
                  )}
                  {offering.utilisationLabel && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold">
                      {offering.utilisationLabel}
                    </span>
                  )}
                </div>
                {Array.isArray(offering.tags) && offering.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                    {offering.tags.slice(0, 6).map((tag) => (
                      <span key={tag} className="rounded-full bg-primary/5 px-3 py-1 font-semibold text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="dashboard-section">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Upcoming bookings</h2>
              <p className="text-sm text-slate-600">High-visibility pipeline for the next dozen confirmed or pending sessions.</p>
            </div>
            <a href="/dashboard/instructor/bookings" className="dashboard-pill text-xs font-semibold">
              Open booking queue
            </a>
          </div>
          {upcomingBookings.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
              No upcoming bookings. Publish availability or approve pending requests to populate this view.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className={clsx(
                    'flex flex-col gap-3 rounded-3xl border p-4 sm:flex-row sm:items-center sm:justify-between',
                    getBookingToneStyle(booking.status)
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold">{booking.label}</p>
                    <p className="text-xs opacity-80">{booking.learner}</p>
                    <p className="mt-1 text-xs opacity-80">{booking.stage}</p>
                  </div>
                  <div className="text-right text-xs font-semibold">
                    <p>{booking.scheduledFor}</p>
                    {booking.timeLabel && <p className="mt-1 text-[11px] opacity-80">{booking.timeLabel}</p>}
                    <span className="mt-2 inline-flex items-center justify-center rounded-full bg-white/70 px-3 py-1 text-[11px]">
                      {booking.statusLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">Monthly utilisation outlook</h2>
          <p className="mt-1 text-sm text-slate-600">
            Forecast capacity and fulfilment across the next 12 months to maintain service quality.
          </p>
          <div className="mt-6 space-y-4">
            {monthlyBookings.map((month) => (
              <div key={month.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{month.label}</p>
                    <p className="text-xs text-slate-500">{month.note}</p>
                  </div>
                  <div className="text-right text-xs font-semibold text-slate-600">
                    <p className="text-slate-900">{month.confirmed} confirmed</p>
                    <p className="text-amber-600">{month.pending} pending</p>
                    <p className="text-slate-500">
                      {month.utilisationRate !== null ? `${month.utilisationRate}% utilised` : 'Publish availability'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">12-month booking calendar</h2>
            <p className="text-sm text-slate-600">
              Every confirmed and pending booking is mapped across the next 12 months for capacity planning.
            </p>
          </div>
          <a href="/dashboard/instructor/calendar" className="dashboard-pill text-xs font-semibold">
            Open enterprise calendar
          </a>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {calendarMonths.map((month) => {
            const days = flattenCalendarWeeks(month.weeks);
            return (
              <div key={month.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{month.label}</p>
                    <p className="text-xs text-slate-500">
                      {month.confirmed} confirmed • {month.pending} pending •{' '}
                      {month.utilisationRate !== null ? `${month.utilisationRate}% utilised` : 'No capacity'}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                    {month.capacity} slots
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-2 text-[11px] sm:text-xs">
                  {calendarWeekdays.map((day) => (
                    <div key={`${month.id}-${day}-label`} className="text-center font-semibold text-slate-400">
                      {day}
                    </div>
                  ))}
                  {days.map((day) => (
                    <div
                      key={day.id}
                      className={clsx(
                        'min-h-[90px] rounded-xl border p-2 text-[11px] transition sm:text-xs',
                        day.isCurrentMonth ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-white/70 text-slate-300'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">{day.day}</span>
                        {Array.isArray(day.bookings) && day.bookings.length > 0 && (
                          <span className="text-[10px] font-semibold text-primary">{day.bookings.length}</span>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        {Array.isArray(day.bookings) &&
                          day.bookings.slice(0, 2).map((booking) => (
                            <div
                              key={booking.id}
                              className={clsx(
                                'rounded-lg border px-2 py-1 text-[10px] font-semibold sm:text-[11px]',
                                getBookingToneStyle(booking.status)
                              )}
                            >
                              <p className="truncate">{booking.label}</p>
                              {booking.timeLabel && <p className="text-[10px] opacity-80">{booking.timeLabel}</p>}
                            </div>
                          ))}
                        {Array.isArray(day.bookings) && day.bookings.length > 2 && (
                          <p className="text-[10px] font-semibold text-slate-500">
                            +{day.bookings.length - 2} more
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Controls &amp; compliance</h2>
            <p className="text-sm text-slate-600">
              Governance, security, and retention policies enforced across the service lifecycle.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Owner</span>
              <span className="font-semibold text-slate-900">{controls.owner ?? 'Service operations desk'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Last audit</span>
              <span className="font-semibold text-slate-900">{controls.lastAudit ?? 'Audit pending'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Automation coverage</span>
              <span className="font-semibold text-slate-900">
                {controls.automationRate ? `${controls.automationRate}%` : 'Manual orchestration'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Data retention</span>
              <span className="font-semibold text-slate-900">
                {controls.retentionDays ? `${controls.retentionDays} days` : 'Policy pending'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Encryption</span>
              <span className="font-semibold text-slate-900">{controls.encryption ?? 'TLS enforced'}</span>
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            {Array.isArray(controls.policies) && controls.policies.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Policies</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {controls.policies.map((policy) => (
                    <li key={policy} className="rounded-2xl bg-slate-100 px-4 py-2">
                      {policy}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(controls.restrictedRoles) && controls.restrictedRoles.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role access</p>
                <p className="mt-2 text-sm text-slate-600">
                  Restricted to {controls.restrictedRoles.join(', ')} Learnspaces. Access requests are logged for audit.
                </p>
              </div>
            )}
            {controls.monitoring && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monitoring</p>
                <p className="mt-2 text-sm text-slate-600">{controls.monitoring}</p>
              </div>
            )}
            {controls.auditLog && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Audit trail</p>
                <p className="mt-2 text-sm text-slate-600">{controls.auditLog}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default withInstructorDashboardAccess(InstructorServiceSuite);
