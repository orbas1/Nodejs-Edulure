import PropTypes from 'prop-types';

import { trackEvent } from '../../lib/analytics.js';
import PrimaryHero from '../marketing/PrimaryHero.jsx';
import PlanComparison from '../marketing/PlanComparison.jsx';

const COURSE_PLANS = [
  {
    id: 'starter',
    tierLabel: 'Starter',
    name: 'Starter',
    description: 'Launch your first cohort with essential tooling and email support.',
    priceCents: 4900,
    features: ['1 live cohort seat pack', 'Course landing page templates', 'Community bundle optional add-on'],
    ctaLabel: 'Choose starter'
  },
  {
    id: 'growth',
    tierLabel: 'Growth',
    name: 'Growth',
    description: 'Scale recurring cohorts with community bundles and insight dashboards.',
    priceCents: 12900,
    recommended: true,
    features: ['3 concurrent cohorts', 'Community bundle included', 'Conversion analytics and waitlists'],
    ctaLabel: 'Choose growth',
    disclaimer: 'Most learners upgrade here for bundled communities.'
  },
  {
    id: 'enterprise',
    tierLabel: 'Enterprise',
    name: 'Enterprise',
    description: 'Advanced governance, API integrations, and dedicated launch concierge.',
    priceCents: 28900,
    features: ['Unlimited cohorts & instructors', 'Dedicated success pod', 'Security & compliance exports'],
    ctaLabel: 'Talk to sales'
  }
];

export default function CatalogueHero({ onSelectPlan }) {
  const handlePlanSelect = (plan) => {
    trackEvent('plan_compare_select', {
      plan_id: plan.id,
      plan_name: plan.name
    });
    onSelectPlan?.(plan);
  };

  return (
    <div className="space-y-12">
      <PrimaryHero
        eyebrow="Course catalogue"
        title="Bundle live cohorts, async paths, and community upsells"
        description="Curate programmes that feel like a studio while monetising like a marketplace. Mix cohort seats, community memberships, and tutor office hours without complex tooling."
        pills={['Live cohorts', 'Community bundles', 'Tutor upsells']}
        primaryAction={{
          label: 'Create your account',
          to: '/register',
          onClick: () =>
            trackEvent('cta_click', {
              location: 'courses_hero_primary'
            })
        }}
        secondaryAction={{
          label: 'Review pricing plans',
          href: '#plan-comparison',
          onClick: () =>
            trackEvent('cta_click', {
              location: 'courses_hero_secondary'
            })
        }}
        tertiaryAction={{
          label: 'Chat with an advisor',
          href: 'mailto:hello@edulure.com',
          onClick: () =>
            trackEvent('cta_click', {
              location: 'courses_hero_advisor'
            }),
          target: '_blank',
          rel: 'noopener noreferrer'
        }}
        analyticsId="courses-hero"
        mediaSlot={
          <div className="relative grid gap-4">
            <div className="rounded-3xl border border-white/20 bg-white/10 p-4 text-sm text-white/80">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200">Forecast</p>
              <p className="mt-2 text-lg font-semibold text-white">Cohort revenue outlook</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                  <p className="text-white/70">Projected enrolments</p>
                  <p className="mt-1 text-lg font-semibold text-white">128</p>
                  <p className="text-[0.65rem] uppercase tracking-[0.3em] text-emerald-200">+18% vs last run</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                  <p className="text-white/70">Community attach</p>
                  <p className="mt-1 text-lg font-semibold text-white">64%</p>
                  <p className="text-[0.65rem] uppercase tracking-[0.3em] text-emerald-200">Upsell eligible</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-white/15 bg-white/10 p-3">
                  <p className="text-white/70">Tutor office hours</p>
                  <div className="mt-2 flex items-center justify-between text-white">
                    <span className="font-semibold">12 credits</span>
                    <span className="text-xs text-white/60">Suggested add-on</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-white/20 bg-white/10 p-4 text-xs text-white/70">
              <p className="font-semibold text-white">"Pairing the community bundle with the cohort unlocks 40% higher retention."</p>
              <p className="mt-2">— Edulure Monetisation Lab</p>
            </div>
          </div>
        }
      />
      <div id="plan-comparison" className="space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-slate-900">Compare course plans</h2>
          <p className="text-sm text-slate-600">
            Choose the footprint that matches your launch goals. Community bundles are optional on Starter and included with Growth.
          </p>
        </div>
        <PlanComparison plans={COURSE_PLANS} currency="USD" onSelectPlan={handlePlanSelect} />
      </div>
    </div>
  );
}

CatalogueHero.propTypes = {
  onSelectPlan: PropTypes.func
};

CatalogueHero.defaultProps = {
  onSelectPlan: undefined
};
