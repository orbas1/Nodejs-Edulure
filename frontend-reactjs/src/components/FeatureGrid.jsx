import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import { useLanguage } from '../context/LanguageContext.jsx';
import useLandingValueProposition from '../hooks/useLandingValueProposition.js';
import { trackEvent } from '../lib/analytics.js';
import HomeSection from './home/HomeSection.jsx';

const FEATURE_EVENT = 'marketing:value_prop_action';

export default function FeatureGrid({ onActionClick, marketingContent }) {
  const { t } = useLanguage();
  const { pillars } = useLandingValueProposition({ prefetchedData: marketingContent });

  const eyebrow = t('home.featureGrid.eyebrow', 'Annex A16 launch system');
  const heading = t(
    'home.featureGrid.headline',
    'Show value from first touch to renewal'
  );
  const intro = t(
    'home.featureGrid.intro',
    'These Edulure pillars pair landing funnels, live rituals, and monetisation guardrails so teams convert faster.'
  );

  const features = useMemo(
    () =>
      pillars.map((pillar) => ({
        key: pillar.key,
        title: pillar.title,
        helper: pillar.helper,
        description: pillar.description,
        analyticsId: pillar.analyticsId,
        actions: pillar.actions.filter(Boolean)
      })),
    [pillars]
  );

  const renderAction = (feature, action) => {
    const handleClick = (event) => {
      if (typeof action.onClick === 'function') {
        action.onClick(event);
      }
      onActionClick?.(action, feature);
      trackEvent(FEATURE_EVENT, {
        pillar: feature.analyticsId ?? feature.key,
        action: action.analyticsId ?? action.key ?? 'cta',
        destination: action.to ?? action.href ?? null,
        label: action.label
      });
    };

    const content = (
      <span>
        {action.label}
        {action.description && (
          <span className="block text-xs font-medium text-slate-400 group-hover:text-primary/80">
            {action.description}
          </span>
        )}
      </span>
    );

    if (action.to) {
      return (
        <Link
          key={action.key ?? action.label}
          to={action.to}
          className="group inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          onClick={handleClick}
        >
          {content}
          {action.badge && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {action.badge}
            </span>
          )}
        </Link>
      );
    }

    return (
      <a
        key={action.key ?? action.label}
        href={action.href}
        className="group inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
        onClick={handleClick}
        target={action.target}
        rel={action.rel ?? (action.href?.startsWith('http') ? 'noreferrer noopener' : undefined)}
      >
        {content}
        {action.badge && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            {action.badge}
          </span>
        )}
      </a>
    );
  };

  return (
    <section className="bg-slate-50/70">
      <HomeSection pad="cozy">
        <div className="md:text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">{heading}</h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm text-slate-600">{intro}</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.key}
              className="flex h-full flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-card"
            >
              <header>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{feature.helper}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">{feature.title}</h3>
                {feature.description ? (
                  <p className="mt-3 text-sm text-slate-600">{feature.description}</p>
                ) : null}
              </header>
              <div className="grid gap-3">
                {feature.actions.map((action) => renderAction(feature, action))}
              </div>
            </article>
          ))}
        </div>
      </HomeSection>
    </section>
  );
}

FeatureGrid.propTypes = {
  onActionClick: PropTypes.func,
  marketingContent: PropTypes.shape({
    blocks: PropTypes.array,
    plans: PropTypes.array,
    invites: PropTypes.array,
    testimonials: PropTypes.array
  })
};

FeatureGrid.defaultProps = {
  onActionClick: undefined,
  marketingContent: null
};
