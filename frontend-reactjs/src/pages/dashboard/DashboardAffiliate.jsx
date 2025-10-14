import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

import MetricCard from '../../components/dashboard/MetricCard.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

function createSafeId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normaliseMetrics(metrics) {
  if (!Array.isArray(metrics)) {
    return [];
  }
  return metrics
    .filter((metric) => metric?.label && metric?.value !== undefined)
    .map((metric, index) => ({
      id: metric.id ?? `metric-${index}`,
      label: metric.label,
      value: String(metric.value ?? ''),
      change: metric.change ?? null,
      trend: metric.trend === 'down' ? 'down' : 'up'
    }));
}

function statusTone(status) {
  const normalized = String(status ?? '').toLowerCase();
  if (['active', 'approved'].includes(normalized)) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (['paused', 'blocked', 'suspended'].includes(normalized)) {
    return 'bg-rose-100 text-rose-700';
  }
  if (['pending', 'review'].includes(normalized)) {
    return 'bg-amber-100 text-amber-700';
  }
  return 'bg-slate-100 text-slate-600';
}

function recurrenceLabel(recurrence, maxOccurrences) {
  const normalized = String(recurrence ?? 'infinite').toLowerCase();
  if (normalized === 'finite') {
    return `Finite · ${Number(maxOccurrences ?? 0)} cycles`;
  }
  if (normalized === 'once') {
    return 'One-time commission';
  }
  return 'Continuous on every renewal';
}

function normalisePrograms(programs) {
  if (!Array.isArray(programs)) {
    return [];
  }
  return programs.map((program) => ({
    id: program.id ?? program.referralCode ?? createSafeId('affiliate-program'),
    community: program.community?.name ?? 'Community programme',
    communitySlug: program.community?.slug ?? null,
    status: program.status ?? 'pending',
    statusTone: statusTone(program.status),
    referralCode: program.referralCode ?? 'N/A',
    commission: {
      rate: program.commission?.rateLabel ?? '0%',
      tier: program.commission?.tierLabel ?? 'Tier 1',
      recurrence: recurrenceLabel(program.commission?.recurrence, program.commission?.maxOccurrences)
    },
    earnings: {
      total: program.earnings?.totalFormatted ?? '$0.00',
      outstanding: program.earnings?.outstandingFormatted ?? '$0.00',
      paid: program.earnings?.paidFormatted ?? '$0.00'
    },
    performance: {
      conversions: program.performance?.conversions ?? 0,
      conversions30d: program.performance?.conversions30d ?? 0,
      volume: program.performance?.volumeFormatted ?? '$0.00',
      volume30d: program.performance?.volume30dFormatted ?? '$0.00',
      lastConversionLabel: program.performance?.lastConversionLabel ?? 'No conversions yet'
    },
    payouts: {
      next: program.payouts?.next ?? null,
      last: program.payouts?.last ?? null
    },
    highlights: Array.isArray(program.highlights) ? program.highlights : [],
    links: {
      landingPage: program.links?.landingPage ?? null,
      mediaKit: program.links?.mediaKit ?? null
    }
  }));
}

function normalisePayouts(payouts) {
  if (!Array.isArray(payouts)) {
    return [];
  }
  return payouts.map((payout) => ({
    id: payout.id ?? createSafeId('affiliate-payout'),
    status: payout.status ?? 'scheduled',
    statusTone: statusTone(payout.status),
    amount: payout.amount ?? '$0.00',
    scheduledLabel: payout.scheduledAt
      ? payout.scheduledLabel ?? payout.scheduledAt
      : 'Pending',
    processedLabel: payout.processedAt
      ? payout.processedAt
      : payout.processedLabel ?? '—',
    communityName: payout.communityName ?? 'Affiliate',
    referralCode: payout.referralCode ?? '—'
  }));
}

function normaliseCommission(commission) {
  if (!commission) {
    return {
      recurrence: 'Continuous on every renewal',
      tiers: []
    };
  }
  const tiers = Array.isArray(commission.tiers)
    ? commission.tiers.map((tier, index) => ({
        id: tier.id ?? `tier-${index}`,
        label: tier.label ?? `Tier ${index + 1}`,
        threshold: tier.thresholdCents ?? 0,
        thresholdLabel: tier.thresholdCents
          ? `$${(Number(tier.thresholdCents) / 100).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`
          : '$0.00',
        rate: tier.rateLabel ?? '0%'
      }))
    : [];
  return {
    recurrence: recurrenceLabel(commission.recurrence, commission.maxOccurrences),
    tiers
  };
}

function normaliseCompliance(compliance) {
  const entries = [];
  if (!compliance) {
    return entries;
  }
  entries.push({
    label: 'Auto-approve new affiliates',
    enabled: Boolean(compliance.autoApprove)
  });
  entries.push({
    label: 'Require verified tax profile',
    enabled: Boolean(compliance.requireTaxInformation)
  });
  entries.push({
    label: 'Block self-referrals',
    enabled: Boolean(compliance.blockSelfReferral)
  });
  entries.push({
    label: 'Two-factor required for payouts',
    enabled: Boolean(compliance.enforceTwoFactorForPayouts)
  });
  entries.push({
    label: `Attribution window · ${compliance.cookieWindowDays ?? 0} days`,
    enabled: true
  });
  entries.push({
    label: `Default payout cadence · ${compliance.payoutScheduleDays ?? 0} days`,
    enabled: true
  });
  return entries;
}

function normaliseActions(actions) {
  if (!Array.isArray(actions)) {
    return [];
  }
  return actions
    .filter((action) => typeof action === 'string' && action.trim().length > 0)
    .map((action, index) => ({ id: `action-${index}`, label: action }));
}

function normaliseResources(resources) {
  if (!Array.isArray(resources)) {
    return [];
  }
  return resources.map((resource, index) => ({
    id: resource.id ?? `resource-${index}`,
    title: resource.title ?? 'Resource',
    description:
      resource.description ?? 'Guidance and templates to scale your affiliate programme.',
    action: resource.action ?? 'Open',
    href: resource.href ?? '#'
  }));
}

function ReferralCodeBadge({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch (error) {
      console.warn('Unable to copy referral code', error);
    }
  };

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      <span className="font-mono text-sm text-slate-700">{code}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="text-primary transition hover:text-primary-dark"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  );
}

export default function DashboardAffiliate() {
  const { role, dashboard, refresh } = useOutletContext();
  const affiliate = dashboard?.affiliate ?? null;

  const metrics = useMemo(() => normaliseMetrics(affiliate?.summary?.metrics), [
    affiliate?.summary?.metrics
  ]);
  const programs = useMemo(() => normalisePrograms(affiliate?.programs), [affiliate?.programs]);
  const payouts = useMemo(() => normalisePayouts(affiliate?.payouts), [affiliate?.payouts]);
  const commission = useMemo(() => normaliseCommission(affiliate?.commission), [
    affiliate?.commission
  ]);
  const compliance = useMemo(
    () => normaliseCompliance(affiliate?.compliance),
    [affiliate?.compliance]
  );
  const actions = useMemo(() => normaliseActions(affiliate?.actions), [affiliate?.actions]);
  const resources = useMemo(() => normaliseResources(affiliate?.resources), [
    affiliate?.resources
  ]);

  const totals = affiliate?.summary?.totals ?? {};
  const nextPayout = affiliate?.summary?.nextPayout ?? null;

  if (!affiliate) {
    return (
      <DashboardStateMessage
        title="Affiliate workspace not ready"
        description="Connect at least one affiliate programme to surface referral analytics and payout controls."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  if (!programs.length) {
    return (
      <DashboardStateMessage
        title="No affiliate programmes yet"
        description="Invite trusted partners or learners to promote your offering and track commissions here once live."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Affiliate revenue control center
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor referrals, commission performance, and payout readiness for the {role} workspace.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
              Programmes · {totals.programCount ?? 0}
            </span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
              Outstanding · {totals.outstandingFormatted ?? '$0.00'}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
              Active · {totals.activePrograms ?? 0}
            </span>
          </div>
        </div>
        {nextPayout ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary-dark">
            <p className="font-semibold">Next payout</p>
            <p className="mt-1 text-base font-semibold text-primary-dark">
              {nextPayout.amount}
            </p>
            <p className="text-xs text-primary-dark/80">
              {nextPayout.scheduledLabel} · {nextPayout.communityName ?? 'Affiliate'}
            </p>
          </div>
        ) : null}
      </header>

      {metrics.length ? (
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        {programs.map((program) => (
          <article
            key={program.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{program.community}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ReferralCodeBadge code={program.referralCode} />
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${program.statusTone}`}>
                    {program.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="dashboard-kicker">Total earned</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{program.earnings.total}</p>
                <p className="text-xs text-slate-500">Outstanding {program.earnings.outstanding}</p>
              </div>
              <div>
                <p className="dashboard-kicker">Commission</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{program.commission.rate}</p>
                <p className="text-xs text-slate-500">{program.commission.tier}</p>
              </div>
              <div>
                <p className="dashboard-kicker">Conversions</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {program.performance.conversions}
                </p>
                <p className="text-xs text-slate-500">
                  {program.performance.conversions30d} in the last 30 days
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="dashboard-kicker">Revenue attribution</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {program.performance.volume}
                </p>
                <p className="text-xs text-slate-500">
                  {program.performance.volume30d} in the last 30 days
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="dashboard-kicker">Recurrence</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {program.commission.recurrence}
                </p>
                <p className="text-xs text-slate-500">Last conversion {program.performance.lastConversionLabel}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="dashboard-kicker">Next payout</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {program.payouts.next?.amount ?? 'Awaiting scheduling'}
                </p>
                <p className="text-xs text-slate-500">
                  {program.payouts.next?.scheduledLabel ?? 'No payout scheduled'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="dashboard-kicker">Last payout</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {program.payouts.last?.amount ?? '—'}
                </p>
                <p className="text-xs text-slate-500">
                  {program.payouts.last?.processedLabel ?? 'Not processed yet'}
                </p>
              </div>
            </div>

            {program.highlights.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {program.highlights.map((highlight, index) => (
                  <span
                    key={`highlight-${program.id}-${index}`}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-primary">
              {program.links.landingPage ? (
                <a
                  href={program.links.landingPage}
                  className="inline-flex items-center gap-1 font-semibold transition hover:text-primary-dark"
                  target="_blank"
                  rel="noreferrer"
                >
                  Campaign landing page
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
              ) : null}
              {program.links.mediaKit ? (
                <a
                  href={program.links.mediaKit}
                  className="inline-flex items-center gap-1 font-semibold transition hover:text-primary-dark"
                  target="_blank"
                  rel="noreferrer"
                >
                  Media kit
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Payout timeline</h2>
            <p className="text-sm text-slate-600">
              Track scheduled releases and completed disbursements across all programmes.
            </p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Scheduled</th>
                <th className="px-4 py-2">Processed</th>
                <th className="px-4 py-2">Programme</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payouts.length ? (
                payouts.map((payout) => (
                  <tr key={payout.id} className="bg-white">
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${payout.statusTone}`}>
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-semibold text-slate-900">{payout.amount}</td>
                    <td className="px-4 py-2 text-slate-600">{payout.scheduledLabel}</td>
                    <td className="px-4 py-2 text-slate-600">{payout.processedLabel}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {payout.communityName}
                      <span className="ml-2 font-mono text-xs text-slate-500">
                        {payout.referralCode}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-sm text-slate-500">
                    No payout records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Commission framework</h2>
          <p className="mt-1 text-sm text-slate-600">{commission.recurrence}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">Tier</th>
                  <th className="px-4 py-2">Threshold</th>
                  <th className="px-4 py-2">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {commission.tiers.length ? (
                  commission.tiers.map((tier) => (
                    <tr key={tier.id} className="bg-white">
                      <td className="px-4 py-2 font-semibold text-slate-900">{tier.label}</td>
                      <td className="px-4 py-2 text-slate-600">{tier.thresholdLabel}</td>
                      <td className="px-4 py-2 text-slate-600">{tier.rate}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-4 py-6 text-center text-sm text-slate-500">
                      No commission tiers configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Compliance & automation</h2>
          <p className="mt-1 text-sm text-slate-600">
            Active guardrails keep payouts secure and audit-ready.
          </p>
          <ul className="mt-4 space-y-3">
            {compliance.map((item, index) => (
              <li
                key={`compliance-${index}`}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <CheckCircleIcon
                  className={`mt-0.5 h-5 w-5 ${item.enabled ? 'text-emerald-500' : 'text-slate-400'}`}
                />
                <span className="text-sm text-slate-700">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Action center</h2>
          <p className="mt-1 text-sm text-slate-600">
            Immediate steps to keep the affiliate engine running smoothly.
          </p>
          <ul className="mt-4 space-y-3">
            {actions.length ? (
              actions.map((action) => (
                <li
                  key={action.id}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 text-primary" />
                  <span className="text-sm text-slate-700">{action.label}</span>
                </li>
              ))
            ) : (
              <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                All affiliate queues are clear.
              </li>
            )}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Resources</h2>
          <p className="mt-1 text-sm text-slate-600">
            Templates and policies to help your partners launch faster.
          </p>
          <div className="mt-4 grid gap-4">
            {resources.map((resource) => (
              <a
                key={resource.id}
                href={resource.href}
                className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-primary/40 hover:text-primary"
                target="_blank"
                rel="noreferrer"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{resource.title}</p>
                    <p className="text-xs text-slate-500">{resource.description}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    {resource.action}
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

