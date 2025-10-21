import PropTypes from 'prop-types';

function SummaryCards({ cards, meta }) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
        Tooling telemetry will appear once communities are activated.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.id}
            className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:border-primary/40 hover:shadow-card"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">{card.label}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{card.value ?? '—'}</p>
            {card.helper ? <p className="mt-2 text-xs text-slate-500">{card.helper}</p> : null}
          </article>
        ))}
      </div>
      {meta ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-100/70 px-4 py-3 text-xs font-semibold text-slate-600">
          {meta.pipelineValue ? (
            <span>
              Pipeline value <span className="text-slate-900">{meta.pipelineValue}</span>
            </span>
          ) : null}
          {meta.occupancy ? (
            <span>
              Occupancy <span className="text-slate-900">{meta.occupancy}</span>
            </span>
          ) : null}
          {meta.lastAudit ? (
            <span>
              Last sync <span className="text-slate-900">{meta.lastAudit}</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

SummaryCards.propTypes = {
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      helper: PropTypes.string
    })
  ),
  meta: PropTypes.shape({
    pipelineValue: PropTypes.string,
    occupancy: PropTypes.string,
    lastAudit: PropTypes.string
  })
};

SummaryCards.defaultProps = {
  cards: [],
  meta: null
};

function ToolsListing({ listing }) {
  if (!Array.isArray(listing) || listing.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
        No tooling suites require attention. Listings will populate as communities onboard.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {listing.map((tool) => (
        <article
          key={tool.id}
          className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm transition hover:border-primary/50 hover:shadow-card"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900">{tool.name ?? 'Untitled tool'}</h3>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  {tool.status ?? 'Planned'}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {tool.lifecycleStage ?? 'Unassigned'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {(tool.category ?? 'Platform tooling')} • Stewarded by{' '}
                <span className="font-semibold text-slate-700">{tool.owner ?? 'TBC'}</span>
              </p>
              {tool.ownerEmail ? <p className="text-xs text-slate-400">{tool.ownerEmail}</p> : null}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">{tool.utilisation ?? '—'}</p>
              <p className="text-xs text-slate-500">
                Available units {tool.availableUnits ?? '—'} / {tool.totalCapacity ?? '—'}
              </p>
            </div>
          </div>
          <dl className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl bg-slate-100/70 px-3 py-2">
              <dt className="font-semibold text-slate-600">Adoption velocity</dt>
              <dd className="mt-1 text-slate-900">{tool.adoptionVelocity ?? '—'}</dd>
            </div>
            <div className="rounded-xl bg-slate-100/70 px-3 py-2">
              <dt className="font-semibold text-slate-600">Demand signal</dt>
              <dd className="mt-1 text-slate-900">{tool.demandLevel ?? '—'}</dd>
            </div>
            <div className="rounded-xl bg-slate-100/70 px-3 py-2">
              <dt className="font-semibold text-slate-600">Lifecycle health</dt>
              <dd className="mt-1 text-slate-900">{tool.healthScore ?? '—'}</dd>
            </div>
            <div className="rounded-xl bg-slate-100/70 px-3 py-2">
              <dt className="font-semibold text-slate-600">Active contracts</dt>
              <dd className="mt-1 text-slate-900">{tool.rentalContracts ?? '—'}</dd>
            </div>
            <div className="rounded-xl bg-slate-100/70 px-3 py-2">
              <dt className="font-semibold text-slate-600">Projected value</dt>
              <dd className="mt-1 text-slate-900">{tool.value ?? '—'}</dd>
            </div>
            <div className="rounded-xl bg-slate-100/70 px-3 py-2">
              <dt className="font-semibold text-slate-600">Last audit</dt>
              <dd className="mt-1 text-slate-900">{tool.lastAudit ?? '—'}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

ToolsListing.propTypes = {
  listing: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      category: PropTypes.string,
      status: PropTypes.string,
      lifecycleStage: PropTypes.string,
      owner: PropTypes.string,
      ownerEmail: PropTypes.string,
      utilisation: PropTypes.string,
      availableUnits: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      totalCapacity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      adoptionVelocity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      demandLevel: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      lastAudit: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      healthScore: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      rentalContracts: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })
  )
};

ToolsListing.defaultProps = {
  listing: []
};

function SalesInsights({ sales }) {
  const metrics = sales?.metrics ?? {};
  const pipeline = Array.isArray(sales?.pipeline) ? sales.pipeline : [];
  const forecast = sales?.forecast ?? {};

  const metricEntries = [
    { id: 'pipelineValue', label: 'Pipeline value', value: metrics.pipelineValue },
    { id: 'winRate', label: 'Win rate', value: metrics.winRate },
    { id: 'averageDealSize', label: 'Avg. deal size', value: metrics.averageDealSize },
    { id: 'cycleTime', label: 'Sales cycle', value: metrics.cycleTime },
    { id: 'renewalRate', label: 'Renewal rate', value: metrics.renewalRate }
  ].filter((entry) => entry.value !== undefined && entry.value !== null && entry.value !== '');

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {metricEntries.map((metric) => (
          <article key={metric.id} className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">{metric.label}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{metric.value}</p>
          </article>
        ))}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-slate-700">Revenue pipeline</h4>
        <ul className="mt-3 space-y-3">
          {pipeline.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
              No active tooling opportunities.
            </li>
          ) : (
            pipeline.map((stage) => (
              <li
                key={stage.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{stage.stage ?? 'Stage pending'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {stage.deals ? `${stage.deals} deals` : 'No active deals'} • {stage.velocity ?? 'Velocity TBC'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{stage.value ?? '—'}</p>
                  <p className="mt-1 text-xs text-primary">Conversion {stage.conversion ?? '—'}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-primary/10 via-white to-primary/5 px-5 py-4 text-xs text-slate-600 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">30 day outlook</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{forecast.next30d ?? '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Committed</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{forecast.committed ?? '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Upside</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{forecast.upside ?? '—'}</p>
          </div>
        </div>
        {forecast.lastUpdated ? (
          <p className="mt-3 text-[11px] text-slate-500">Last updated {forecast.lastUpdated}</p>
        ) : null}
      </div>
    </div>
  );
}

SalesInsights.propTypes = {
  sales: PropTypes.shape({
    metrics: PropTypes.object,
    pipeline: PropTypes.array,
    forecast: PropTypes.object
  })
};

SalesInsights.defaultProps = {
  sales: null
};

function RentalOverview({ rental }) {
  const metrics = rental?.metrics ?? {};
  const active = Array.isArray(rental?.active) ? rental.active : [];
  const utilisation = rental?.utilisation ?? {};
  const expiring = Array.isArray(rental?.expiring) ? rental.expiring : [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Occupancy</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{metrics.occupancy ?? '—'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Active contracts</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{metrics.activeContracts ?? '—'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Average duration</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{metrics.averageDuration ?? '—'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Expiring soon</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{metrics.expiringSoon ?? '—'}</p>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-slate-700">Active rentals</h4>
        <ul className="mt-3 space-y-3">
          {active.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
              No rentals currently engaged.
            </li>
          ) : (
            active.map((record) => (
              <li
                key={record.id}
                className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm transition hover:border-primary/40"
              >
                <div className="flex flex-col gap-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{record.tool ?? 'Unnamed tool'}</p>
                    <p className="mt-1 text-slate-500">Lessee • {record.lessee ?? 'Unassigned'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{record.value ?? '—'}</p>
                    <p className="mt-1 text-slate-500">Utilisation {record.utilisation ?? '—'}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-[11px] text-slate-500 sm:grid-cols-3">
                  <span>Start {record.startAt ?? 'TBC'}</span>
                  <span>End {record.endAt ?? 'TBC'}</span>
                  <span>Status {record.status ?? 'Scheduled'} • {record.remaining ?? '—'}</span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <h4 className="text-sm font-semibold text-slate-700">Utilisation leaders</h4>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            {Array.isArray(utilisation.topPerformers) && utilisation.topPerformers.length > 0 ? (
              utilisation.topPerformers.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between rounded-xl bg-white/90 px-3 py-2 shadow-sm">
                  <span className="font-semibold text-slate-700">{entry.tool ?? '—'}</span>
                  <span className="text-primary">{entry.utilisation ?? '—'}</span>
                </li>
              ))
            ) : (
              <li className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
                Utilisation data not yet available.
              </li>
            )}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <h4 className="text-sm font-semibold text-slate-700">Expiring contracts</h4>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            {expiring.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
                No expiries in the next 45 days.
              </li>
            ) : (
              expiring.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between rounded-xl bg-white/90 px-3 py-2 shadow-sm">
                  <div>
                    <p className="font-semibold text-slate-700">{entry.tool ?? '—'}</p>
                    <p className="text-[11px] text-slate-500">Owner {entry.owner ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-700">{entry.expiresAt ?? 'Date TBC'}</p>
                    <p className="text-[11px] text-primary">{entry.remaining ?? '—'}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

RentalOverview.propTypes = {
  rental: PropTypes.shape({
    metrics: PropTypes.object,
    active: PropTypes.array,
    utilisation: PropTypes.object,
    expiring: PropTypes.array
  })
};

RentalOverview.defaultProps = {
  rental: null
};

function ManagementPanel({ management }) {
  const maintenance = Array.isArray(management?.maintenance) ? management.maintenance : [];
  const audits = Array.isArray(management?.audits) ? management.audits : [];
  const governance = management?.governance ?? {};

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-semibold text-slate-700">Maintenance queue</h4>
        <ul className="mt-3 space-y-2 text-xs text-slate-600">
          {maintenance.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
              No maintenance actions pending.
            </li>
          ) : (
            maintenance.map((ticket) => (
              <li key={ticket.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
                <div>
                  <p className="font-semibold text-slate-700">{ticket.tool ?? '—'}</p>
                  <p className="text-[11px] text-slate-500">Owner {ticket.owner ?? '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">{ticket.severity ?? 'Normal'} priority</p>
                  <p className="text-[11px] text-slate-500">{ticket.status ?? 'Scheduled'} • {ticket.updated ?? '—'}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-slate-700">Audit milestones</h4>
        <ul className="mt-3 space-y-2 text-xs text-slate-600">
          {audits.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
              No audits scheduled.
            </li>
          ) : (
            audits.map((audit) => (
              <li key={audit.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
                <div>
                  <p className="font-semibold text-slate-700">{audit.title ?? 'Audit milestone'}</p>
                  <p className="text-[11px] text-slate-500">Owner {audit.owner ?? '—'}</p>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">{audit.status ?? 'Planned'}</p>
                <p className="text-[11px] text-slate-500">Due {audit.dueAt ?? 'TBC'}</p>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-primary/5 p-5 text-xs text-slate-600 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-700">Governance posture</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-primary/70">Policy coverage</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{governance.policyCoverage ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-primary/70">Risk level</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{governance.riskLevel ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-primary/70">Incidents YTD</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{governance.incidentsYtd ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-primary/70">MTTR</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{governance.mttr ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-primary/70">Escalation playbooks</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{governance.escalationPlaybooks ?? '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

ManagementPanel.propTypes = {
  management: PropTypes.shape({
    maintenance: PropTypes.array,
    audits: PropTypes.array,
    governance: PropTypes.object
  })
};

ManagementPanel.defaultProps = {
  management: null
};

function FinalisationPanel({ finalisation }) {
  const checklist = Array.isArray(finalisation?.checklist) ? finalisation.checklist : [];
  const communications = Array.isArray(finalisation?.communications) ? finalisation.communications : [];
  const pipeline = Array.isArray(finalisation?.pipeline) ? finalisation.pipeline : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Launch readiness</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{finalisation?.readinessScore ?? '—'}</p>
        </div>
        <p className="text-xs text-slate-500 sm:max-w-xs">
          Ensures tooling offboarding and customer communications are sequenced with enterprise guardrails.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <h4 className="text-sm font-semibold text-slate-700">Checklist</h4>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            {checklist.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
                No finalisation tasks pending.
              </li>
            ) : (
              checklist.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-xl bg-white/95 px-3 py-2 shadow-sm">
                  <div>
                    <p className="font-semibold text-slate-700">{item.label ?? 'Checklist item'}</p>
                    <p className="text-[11px] text-slate-500">Owner {item.owner ?? '—'}</p>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">{item.status ?? 'Draft'}</p>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <h4 className="text-sm font-semibold text-slate-700">Communications</h4>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            {communications.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
                Communication plan pending.
              </li>
            ) : (
              communications.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-xl bg-white/95 px-3 py-2 shadow-sm">
                  <div>
                    <p className="font-semibold text-slate-700">{item.channel ?? 'Channel TBC'}</p>
                    <p className="text-[11px] text-slate-500">Audience {item.audience ?? '—'}</p>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">{item.status ?? 'Draft'}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-700">Decommission pipeline</h4>
        <ul className="mt-3 space-y-2 text-xs text-slate-600">
          {pipeline.length === 0 ? (
            <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
              No tooling suites in finalisation.
            </li>
          ) : (
              pipeline.map((item) => (
                <li key={item.id} className="flex flex-col gap-1 rounded-xl bg-slate-50/80 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-700">{item.tool ?? '—'}</p>
                    <p className="text-[11px] text-slate-500">Owner {item.owner ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">{item.stage ?? 'Planned'}</p>
                    <p className="text-[11px] text-slate-500">ETA {item.eta ?? 'TBC'}</p>
                  </div>
                </li>
              ))
          )}
        </ul>
      </div>
    </div>
  );
}

FinalisationPanel.propTypes = {
  finalisation: PropTypes.shape({
    readinessScore: PropTypes.string,
    checklist: PropTypes.array,
    communications: PropTypes.array,
    pipeline: PropTypes.array
  })
};

FinalisationPanel.defaultProps = {
  finalisation: null
};

export default function AdminToolsSection({ sectionId, tools }) {
  const summary = tools?.summary ?? {};
  const listing = tools?.listing ?? [];
  const sales = tools?.sales ?? null;
  const rental = tools?.rental ?? null;
  const management = tools?.management ?? null;
  const finalisation = tools?.finalisation ?? null;

  return (
    <section id={sectionId} className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="dashboard-kicker">Tooling</p>
          <h2 className="text-2xl font-semibold text-slate-900">Tooling lifecycle control</h2>
          <p className="text-sm text-slate-600">
            Govern listings, sales velocity, rentals, and decommission flows with enterprise-grade telemetry.
          </p>
        </div>
        {summary?.occupancyRate ? (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
            Occupancy {summary.occupancyRate}
          </span>
        ) : null}
      </header>
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="dashboard-section lg:col-span-12">
          <SummaryCards cards={summary.cards ?? []} meta={summary.meta ?? null} />
        </div>
        <div className="dashboard-section space-y-5 lg:col-span-7">
          <h3 className="text-lg font-semibold text-slate-900">Tool suite listings</h3>
          <ToolsListing listing={listing} />
        </div>
        <div className="dashboard-section space-y-5 lg:col-span-5">
          <h3 className="text-lg font-semibold text-slate-900">Sales &amp; revenue insights</h3>
          <SalesInsights sales={sales} />
        </div>
        <div className="dashboard-section space-y-5 lg:col-span-7">
          <h3 className="text-lg font-semibold text-slate-900">Rental operations</h3>
          <RentalOverview rental={rental} />
        </div>
        <div className="dashboard-section space-y-5 lg:col-span-5">
          <h3 className="text-lg font-semibold text-slate-900">Management &amp; governance</h3>
          <ManagementPanel management={management} />
        </div>
        <div className="dashboard-section space-y-5 lg:col-span-12">
          <h3 className="text-lg font-semibold text-slate-900">Finalisation readiness</h3>
          <FinalisationPanel finalisation={finalisation} />
        </div>
      </div>
    </section>
  );
}

AdminToolsSection.propTypes = {
  sectionId: PropTypes.string,
  tools: PropTypes.shape({
    summary: PropTypes.object,
    listing: PropTypes.array,
    sales: PropTypes.object,
    rental: PropTypes.object,
    management: PropTypes.object,
    finalisation: PropTypes.object
  })
};

AdminToolsSection.defaultProps = {
  sectionId: 'tools',
  tools: {}
};
