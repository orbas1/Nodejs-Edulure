import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

function MetricCard({ title, value, hint }) {
  return (
    <div className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  hint: PropTypes.string
};

MetricCard.defaultProps = {
  hint: null
};

function RevenueBar({ label, value }) {
  const width = Math.min(Math.max(Number(value ?? 0), 0), 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{width}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-800">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

RevenueBar.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

const numberFromString = (value) => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const match = value.replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/);
    if (match) {
      return Number(match[0]);
    }
  }
  return 0;
};

const percentFromString = (value) => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const match = value.replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/);
    if (match) {
      return Number(match[0]);
    }
  }
  return 0;
};

const parseSeats = (value) => {
  if (typeof value !== 'string') {
    return { reserved: 0, total: 0 };
  }
  const [reservedPart, totalPart] = value.split('/');
  const reserved = numberFromString(reservedPart);
  const total = numberFromString(totalPart);
  return { reserved, total };
};

export default function InstructorPricing() {
  const { dashboard, refresh } = useOutletContext();
  const pricing = dashboard?.pricing;
  const revenueStreams = dashboard?.analytics?.revenueStreams ?? [];

  const offers = useMemo(() => pricing?.offers ?? [], [pricing]);
  const subscriptions = useMemo(() => pricing?.subscriptions ?? [], [pricing]);
  const sessions = useMemo(() => pricing?.sessions ?? [], [pricing]);
  const insights = useMemo(() => pricing?.insights ?? [], [pricing]);

  const summary = useMemo(() => {
    const totalLearners = offers.reduce((sum, offer) => sum + numberFromString(offer.learners), 0);
    const activeSubscribers = subscriptions.reduce((sum, tier) => sum + numberFromString(tier.members), 0);
    const avgConversion = offers.length
      ? offers.reduce((sum, offer) => sum + percentFromString(offer.conversion), 0) / offers.length
      : 0;
    const seatStats = sessions.reduce(
      (acc, session) => {
        const parsed = parseSeats(session.seats ?? '0/0');
        return {
          reserved: acc.reserved + parsed.reserved,
          total: acc.total + parsed.total
        };
      },
      { reserved: 0, total: 0 }
    );
    const seatUtilisation = seatStats.total > 0 ? (seatStats.reserved / seatStats.total) * 100 : 0;

    return {
      totalLearners,
      activeSubscribers,
      avgConversion: Math.round(avgConversion * 10) / 10,
      sessions: sessions.length,
      seatUtilisation: Math.round(seatUtilisation * 10) / 10
    };
  }, [offers, sessions, subscriptions]);

  if (!pricing) {
    return (
      <DashboardStateMessage
        title="Pricing data unavailable"
        description="We couldn't load monetisation telemetry for your workspace. Refresh once data sources are connected."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const hasSignals = offers.length + subscriptions.length + sessions.length + revenueStreams.length + insights.length > 0;

  if (!hasSignals) {
    return (
      <DashboardStateMessage
        title="No monetisation activity"
        description="There are no course offers, subscription tiers, or live session revenues tracked yet. Refresh after syncing commerce data."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Monetisation control centre</h1>
          <p className="mt-2 text-sm text-slate-400">
            Track cohort pricing, subscription tiers, and live session utilisation to keep revenue streams healthy.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
          >
            Export finance report
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-primary/40 hover:text-white"
          >
            Configure pricing rules
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Cohort enrolments" value={summary.totalLearners} hint="Learners across paid cohorts" />
        <MetricCard title="Active subscribers" value={summary.activeSubscribers} hint="Members across gated communities" />
        <MetricCard title="Avg conversion" value={`${summary.avgConversion}%`} hint="Rolling 30-day average" />
        <MetricCard
          title="Live seat utilisation"
          value={`${summary.seatUtilisation}%`}
          hint={summary.sessions > 0 ? `${summary.sessions} sessions scheduled` : 'No live sessions scheduled'}
        />
      </section>

      {revenueStreams.length > 0 ? (
        <section className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Revenue mix</h2>
              <p className="text-sm text-slate-400">Distribution of revenue over the last 30 days.</p>
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-primary/40 hover:text-white"
            >
              Refresh snapshot
            </button>
          </div>
          <div className="mt-6 space-y-4">
            {revenueStreams.map((stream) => (
              <RevenueBar key={stream.name} label={stream.name} value={stream.value} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Course offers</h2>
              <button
                type="button"
                className="rounded-full border border-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-primary/40 hover:text-white"
              >
                Launch new offer
              </button>
            </div>
            {offers.length > 0 ? (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="pb-3">Program</th>
                      <th className="pb-3">Price</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Conversion</th>
                      <th className="pb-3">Learners</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {offers.map((offer) => (
                      <tr key={offer.id} className="hover:bg-slate-900/40">
                        <td className="py-3 text-white">{offer.name}</td>
                        <td className="py-3 text-slate-400">{offer.price}</td>
                        <td className="py-3 text-slate-400">{offer.status}</td>
                        <td className="py-3 text-slate-400">{offer.conversion}</td>
                        <td className="py-3 text-slate-400">{offer.learners}</td>
                        <td className="py-3 text-right text-xs text-slate-400">
                          <button className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                            View funnel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No course offers are live. Publish a cohort to populate this table.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Subscription tiers</h2>
              <button
                type="button"
                className="rounded-full border border-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-primary/40 hover:text-white"
              >
                Manage tiers
              </button>
            </div>
            {subscriptions.length > 0 ? (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="pb-3">Tier</th>
                      <th className="pb-3">Price</th>
                      <th className="pb-3">Members</th>
                      <th className="pb-3">Churn</th>
                      <th className="pb-3">Next renewal</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {subscriptions.map((subscription) => (
                      <tr key={subscription.id} className="hover:bg-slate-900/40">
                        <td className="py-3 text-white">{subscription.name}</td>
                        <td className="py-3 text-slate-400">{subscription.price}</td>
                        <td className="py-3 text-slate-400">{subscription.members}</td>
                        <td className="py-3 text-slate-400">{subscription.churn}</td>
                        <td className="py-3 text-slate-400">{subscription.renewal}</td>
                        <td className="py-3 text-right text-xs text-slate-400">
                          <button className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                            Adjust pricing
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                No subscription tiers are active. Create a community paywall to start recurring revenue.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Live session pricing</h2>
              <button
                type="button"
                className="rounded-full border border-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-primary/40 hover:text-white"
              >
                Edit sessions
              </button>
            </div>
            {sessions.length > 0 ? (
              <ul className="mt-5 space-y-4">
                {sessions.map((session) => (
                  <li key={session.id} className="rounded-2xl border border-slate-900/60 bg-slate-900/60 p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{session.status}</span>
                      <span>{session.date}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">{session.name}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>Price {session.price}</span>
                      <span>{session.seats}</span>
                    </div>
                    <div className="mt-4 flex gap-3 text-xs text-slate-400">
                      <button type="button" className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                        Promote session
                      </button>
                      <button type="button" className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                        View roster
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No paid live sessions are scheduled.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
            <h2 className="text-lg font-semibold text-white">Signals & insights</h2>
            {insights.length > 0 ? (
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {insights.map((insight, index) => (
                  <li key={`${insight}-${index}`} className="rounded-2xl border border-slate-900/60 bg-slate-900/60 px-4 py-3">
                    {insight}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-400">Insights will populate once revenue streams stabilise.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
