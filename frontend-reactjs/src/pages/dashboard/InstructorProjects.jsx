import clsx from 'clsx';
import {
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import withInstructorDashboardAccess from './instructor/withInstructorDashboardAccess.jsx';

const summaryToneStyles = {
  primary: 'border-primary/40 bg-primary/5 text-primary',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  neutral: 'border-slate-200 bg-slate-50 text-slate-600'
};

const momentumStyles = {
  up: 'text-emerald-600',
  down: 'text-rose-600',
  neutral: 'text-slate-500'
};

function SummaryCard({ card }) {
  const tone = summaryToneStyles[card.tone] ?? summaryToneStyles.neutral;
  return (
    <div
      className={clsx(
        'rounded-3xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg',
        tone
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{card.label}</p>
      <p className="mt-3 text-2xl font-semibold">{card.value}</p>
      {card.detail && <p className="mt-2 text-sm opacity-80">{card.detail}</p>}
    </div>
  );
}

function StageBadge({ stage, count, value, probability }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stage}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{count}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{value}</p>
      <p className="mt-2 text-xs font-semibold text-primary">Avg confidence {probability}</p>
    </div>
  );
}

function MetricRow({ icon: Icon, label, value, description }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
    </div>
  );
}

function InstructorProjects() {
  const { role, dashboard, refresh } = useOutletContext();
  const projects = dashboard?.projects ?? null;

  const asArray = (value) => (Array.isArray(value) ? value : []);
  const asObjectArray = (value) => asArray(value).filter((item) => item && typeof item === 'object');
  const normaliseProposal = (proposal = {}) => ({
    ...proposal,
    reviewers: asArray(proposal?.reviewers),
    highlights: asArray(proposal?.highlights)
  });
  const normalisePortfolioItem = (item = {}) => ({
    ...item,
    tags: asArray(item?.tags)
  });
  const normaliseSignal = (signal = {}) => ({
    ...signal,
    tags: asArray(signal?.tags)
  });

  if (role !== 'instructor') {
    return (
      <DashboardStateMessage
        title="Project Learnspace is restricted"
        description="Only instructor studios can manage bids and proposals."
      />
    );
  }

  if (!projects) {
    return (
      <DashboardStateMessage
        title="Project data unavailable"
        description="We couldn't retrieve your bid and proposal telemetry. Refresh to try again."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const summaryCards = asObjectArray(projects.summary);
  const bidStages = asObjectArray(projects.bids?.stages);
  const bidPipeline = asObjectArray(projects.bids?.pipeline);
  const bidMetrics = projects.bids?.metrics ?? {};
  const bidBacklog = asObjectArray(projects.bids?.backlog);
  const proposals = asObjectArray(projects.proposals?.active).map(normaliseProposal);
  const reviewBoard = projects.proposals?.reviewBoard ?? null;
  const proposalTimeline = asObjectArray(projects.proposals?.timeline);
  const deliverables = asObjectArray(projects.portfolio?.deliverables).map(normalisePortfolioItem);
  const artifacts = asObjectArray(projects.portfolio?.artifacts);
  const clients = asObjectArray(projects.clients);
  const signals = asObjectArray(projects.signals).map(normaliseSignal);
  const controls = projects.controls ?? null;
  const complianceSafeguards = asArray(controls?.compliance);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Enterprise deal desk</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Project bids &amp; proposals</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Govern high-stakes engagements with real-time bid telemetry, proposal reviews, and client readiness signals. The
            This Learnspace keeps web and mobile experiences aligned while enforcing compliance and response SLAs.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-primary-pill px-5" onClick={() => refresh?.()}>
            Refresh data
          </button>
          <a href="/dashboard/instructor/services" className="dashboard-pill px-4 py-2 text-sm font-semibold">
            Launch service
          </a>
        </div>
      </div>

      {summaryCards.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCard key={card.id} card={card} />
          ))}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <div className="dashboard-section">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Bid pipeline</h2>
                <p className="text-sm text-slate-600">Confidence-weighted pipeline and status across channels.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold text-slate-600">
                {bidPipeline.length} opportunities
              </span>
            </div>
            {bidStages.length > 0 ? (
              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {bidStages.map((stage) => (
                  <StageBadge
                    key={stage.id}
                    stage={stage.name}
                    count={stage.count}
                    value={stage.value}
                    probability={stage.averageProbability}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No active bids yet"
                description="Publish a proposal or respond to an inbound brief to populate the bid pipeline."
              />
            )}
            {bidPipeline.length > 0 && (
              <div className="mt-8 space-y-4">
                {bidPipeline.map((bid) => (
                  <div
                    key={bid.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow-lg"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{bid.name}</p>
                        <p className="text-xs text-slate-500">{bid.channel} · {bid.stage}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{bid.value}</p>
                        <p className="text-xs text-primary">Confidence {bid.probabilityLabel}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                        <ChartBarIcon className="h-4 w-4" aria-hidden="true" /> {bid.conversionLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                        <BoltIcon className="h-4 w-4" aria-hidden="true" /> {bid.nextAction}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">Owner {bid.owner}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                        Updated {bid.updatedLabel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-section space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Bid telemetry</h2>
            <p className="text-sm text-slate-600">
              Weighted forecast, SLA adherence, and inbound velocity ready for executive review.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricRow
                icon={BriefcaseIcon}
                label="Total pipeline"
                value={bidMetrics.totalPipeline ?? '—'}
                description="Gross contract value across all channels"
              />
              <MetricRow
                icon={ChartBarIcon}
                label="Weighted forecast"
                value={bidMetrics.weightedPipeline ?? '—'}
                description="Probability adjusted 60-day outlook"
              />
              <MetricRow
                icon={BoltIcon}
                label="Average probability"
                value={bidMetrics.averageProbability ?? '—'}
                description="Confidence scoring based on stage progression"
              />
              <MetricRow
                icon={ClipboardDocumentListIcon}
                label="Average conversion"
                value={bidMetrics.averageConversion ?? '—'}
                description="Rolling 30d performance across placements"
              />
              <MetricRow
                icon={ShieldCheckIcon}
                label="Response SLA"
                value={bidMetrics.responseSla ?? '—'}
                description={`${bidMetrics.inboundRequests ?? 0} inbound request${
                  (bidMetrics.inboundRequests ?? 0) === 1 ? '' : 's'
                } queued`}
              />
            </div>
          </div>

          <div className="dashboard-section">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Intake queue</h2>
                <p className="text-sm text-slate-600">Inbound briefs that need qualification before moving to proposal.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold text-slate-600">
                {bidBacklog.length} awaiting review
              </span>
            </div>
            {bidBacklog.length > 0 ? (
              <div className="mt-4 space-y-3">
                {bidBacklog.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">{item.topic}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Requested {item.requested} · {item.learner}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-primary">{item.status}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Queue is clear"
                description="No pending requests—publish a new offer or open additional channels to source demand."
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="dashboard-section">
            <h2 className="text-lg font-semibold text-slate-900">Review board</h2>
            <p className="mt-1 text-sm text-slate-600">
              Structured approvals maintain compliance, parity across devices, and executive visibility.
            </p>
            {reviewBoard ? (
              <dl className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Owner</dt>
                  <dd>{reviewBoard.owner}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Approvals required</dt>
                  <dd>{reviewBoard.approvalsRequired}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Next review</dt>
                  <dd>{reviewBoard.nextReview} · {reviewBoard.nextReviewWindow}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Risk posture</dt>
                  <dd>{reviewBoard.riskAppetite}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Automation</dt>
                  <dd className="text-right">{reviewBoard.automation}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Security</dt>
                  <dd className="text-right">{reviewBoard.security}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Escalation</dt>
                  <dd>{reviewBoard.escalationContact}</dd>
                </div>
              </dl>
            ) : (
              <EmptyState
                title="No review board configured"
                description="Define your approval workflow to unlock deal desk automation and enterprise governance."
              />
            )}
          </div>

          <div className="dashboard-section">
            <h2 className="text-lg font-semibold text-slate-900">Proposal timeline</h2>
            {proposalTimeline.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {proposalTimeline.map((item) => (
                  <li key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.stage}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{item.dueLabel}</p>
                      <p className="text-xs text-primary">{item.dueIn}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No upcoming reviews"
                description="Schedule proposal checkpoints to maintain enterprise visibility and parity across devices."
              />
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Active proposals</h2>
            <p className="text-sm text-slate-600">
              Hand-offs ready for submission with compliance guards and stakeholder alignment baked in.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold text-slate-600">
            {proposals.length} in-flight
          </span>
        </div>
        {proposals.length > 0 ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{proposal.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{proposal.client} · {proposal.stage}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{proposal.value}</p>
                    <p className="text-xs text-primary">Confidence {proposal.confidenceLabel}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <p className="font-semibold text-slate-700">Owner</p>
                  <p>{proposal.owner}</p>
                  <p className="font-semibold text-slate-700">Reviewers</p>
                  <p>{proposal.reviewers.length > 0 ? proposal.reviewers.join(', ') : 'Reviewers pending assignment'}</p>
                  <p className="font-semibold text-slate-700">Due</p>
                  <p>
                    {proposal.dueLabel} · {proposal.dueIn}
                  </p>
                  <p className="font-semibold text-slate-700">Highlights</p>
                  {proposal.highlights.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5">
                      {proposal.highlights.map((highlight, index) => (
                        <li key={`${proposal.id}-highlight-${index}`}>{highlight}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs italic text-slate-500">No highlights documented yet.</p>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">Timezone {proposal.timezone}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">Risk {proposal.riskLevel}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">{proposal.reviewWindow}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No proposals drafted"
            description="Use the deal desk to assemble a proposal with enterprise-grade styling and security."
          />
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">Client portfolio</h2>
          {clients.length > 0 ? (
            <div className="mt-4 space-y-3">
              {clients.map((client) => (
                <div key={client.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{client.topStage}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                      {client.pipelineValue}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                      Confidence {client.averageProbability}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                      Conversion {client.averageConversion}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                      {client.activeProjects} active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Owner {client.owner} · Updated {client.updatedLabel}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No client telemetry"
              description="Activate a channel or sync enterprise accounts to visualise health across every client."
            />
          )}
        </div>

        <div className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">Market signals</h2>
          {signals.length > 0 ? (
            <div className="mt-4 space-y-3">
              {signals.map((signal) => (
                <div key={signal.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{signal.title}</p>
                      <p className="text-xs text-slate-500">{signal.channel} · {signal.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{signal.spend}</p>
                      <p className="text-xs text-primary">{signal.roas}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className={clsx('font-semibold', momentumStyles[signal.momentum ?? 'neutral'])}>{signal.delta}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{signal.objective}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{signal.lastObserved}</span>
                  </div>
                  {signal.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-500">
                      {signal.tags.map((tag) => (
                        <span key={`${signal.id}-${tag}`} className="rounded-full bg-slate-100 px-2 py-1 font-semibold">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No market telemetry"
              description="Sync paid placements or campaigns to surface actionable trend signals."
            />
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">Deliverables</h2>
          {deliverables.length > 0 ? (
            <div className="mt-4 space-y-3">
              {deliverables.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.updatedLabel}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.community} · {item.status}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-500">
                    {item.tags.length > 0 &&
                      item.tags.map((tag) => (
                        <span key={`${item.id}-${tag}`} className="rounded-full bg-slate-100 px-2 py-1 font-semibold">
                          {tag}
                        </span>
                      ))}
                    {item.version && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">v{item.version}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No deliverables tracked"
              description="Publish a template or resource to keep parity across web and mobile rollouts."
            />
          )}
        </div>

        <div className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">Artifacts</h2>
          {artifacts.length > 0 ? (
            <div className="mt-4 space-y-3">
              {artifacts.map((artifact) => (
                <div key={artifact.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{artifact.name}</p>
                    <p className="text-xs text-slate-500">{artifact.lastUpdated}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{artifact.stage}</p>
                  {artifact.notes && <p className="mt-2 text-xs text-slate-600">{artifact.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No supporting artifacts"
              description="Upload watermarked assets so every channel uses compliant collateral."
            />
          )}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Security &amp; controls</h2>
            <p className="text-sm text-slate-600">
              Enterprise guardrails keep proposals compliant, tamper-proof, and synchronised across every device.
            </p>
          </div>
          <a
            href="/dashboard/instructor/settings"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Manage controls <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
        {controls ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Governance</h3>
              <dl className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Owner</dt>
                  <dd>{controls.owner}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Approvals</dt>
                  <dd>{controls.approvalsRequired} reviewers</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Cadence</dt>
                  <dd>{controls.reviewCadence}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Last audit</dt>
                  <dd>{controls.lastAudit}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Security posture</h3>
              <dl className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Security</dt>
                  <dd className="text-right">{controls.security}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Data residency</dt>
                  <dd className="text-right">{controls.dataResidency}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Retention</dt>
                  <dd className="text-right">{controls.retention}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-slate-700">Automation</dt>
                  <dd className="text-right">{controls.automation}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Controls not configured"
            description="Establish governance to meet enterprise security, privacy, and mobile parity standards."
          />
        )}
        {complianceSafeguards.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Compliance safeguards</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              {complianceSafeguards.map((rule, index) => (
                <li key={`control-${index}`}>{rule}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

export default withInstructorDashboardAccess(InstructorProjects);
