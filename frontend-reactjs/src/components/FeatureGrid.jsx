import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import { useLanguage } from '../context/LanguageContext.jsx';
import HomeSection from './home/HomeSection.jsx';

const FEATURE_CONFIG = [
  {
    key: 'programs',
    fallback: {
      title: 'Programs',
      helper: 'Build cohorts fast'
    },
    actions: [
      {
        key: 'cohort',
        fallback: 'New Cohort',
        to: '/dashboard/instructor/courses/create',
        badge: 'Launch ready'
      },
      {
        key: 'library',
        fallback: 'Module Library',
        to: '/dashboard/instructor/courses/library'
      },
      {
        key: 'studio',
        fallback: 'Lesson Studio',
        to: '/dashboard/instructor/creation-studio'
      }
    ]
  },
  {
    key: 'engagement',
    fallback: {
      title: 'Engagement',
      helper: 'Keep rooms active'
    },
    actions: [
      {
        key: 'rooms',
        fallback: 'Live Rooms',
        to: '/dashboard/instructor/live-classes',
        badge: 'Beta'
      },
      {
        key: 'calendar',
        fallback: 'Calendar',
        to: '/dashboard/instructor/calendar'
      },
      {
        key: 'inbox',
        fallback: 'Inbox',
        to: '/dashboard/instructor/inbox'
      }
    ]
  },
  {
    key: 'revenue',
    fallback: {
      title: 'Revenue',
      helper: 'Track and grow'
    },
    actions: [
      {
        key: 'pricing',
        fallback: 'Pricing',
        to: '/dashboard/instructor/pricing',
        badge: 'Insights'
      },
      {
        key: 'affiliate',
        fallback: 'Affiliate',
        to: '/dashboard/instructor/affiliate'
      },
      {
        key: 'ads',
        fallback: 'Ads',
        to: '/dashboard/instructor/ads'
      }
    ]
  }
];

export default function FeatureGrid({ onActionClick }) {
  const { t } = useLanguage();

  const eyebrow = t('home.featureGrid.eyebrow', 'Workflow shortcuts');
  const heading = t(
    'home.featureGrid.headline',
    'Move from idea to launch without detours'
  );

  const features = FEATURE_CONFIG.map((feature) => ({
    key: feature.key,
    title: t(
      `home.featureGrid.categories.${feature.key}.title`,
      feature.fallback.title
    ),
    helper: t(
      `home.featureGrid.categories.${feature.key}.helper`,
      feature.fallback.helper
    ),
    actions: feature.actions.map((action) => ({
      ...action,
      label: t(
        `home.featureGrid.categories.${feature.key}.actions.${action.key}`,
        action.fallback
      ),
      description: t(
        `home.featureGrid.categories.${feature.key}.descriptions.${action.key}`,
        ''
      )
    }))
  }));

  return (
    <section className="bg-slate-50/70">
      <HomeSection pad="cozy">
        <div className="md:text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">{heading}</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.key}
              className="flex h-full flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-card"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{feature.helper}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">{feature.title}</h3>
              </div>
              <div className="grid gap-3">
                {feature.actions.map((action) => (
                  <Link
                    key={action.key}
                    to={action.to}
                    className="group inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                    onClick={() => onActionClick?.(action)}
                  >
                    <span>
                      {action.label}
                      {action.description && (
                        <span className="block text-xs font-medium text-slate-400 group-hover:text-primary/80">
                          {action.description}
                        </span>
                      )}
                    </span>
                    {action.badge && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        {action.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </HomeSection>
    </section>
  );
}

FeatureGrid.propTypes = {
  onActionClick: PropTypes.func
};

FeatureGrid.defaultProps = {
  onActionClick: undefined
};
