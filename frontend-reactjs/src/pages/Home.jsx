import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import FeatureGrid from '../components/FeatureGrid.jsx';
import Testimonials from '../components/Testimonials.jsx';
import LanguageSelector from '../components/navigation/LanguageSelector.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const actionBlocks = [
  {
    kicker: 'Launch',
    title: 'Start Cohorts',
    actions: [
      { label: 'Create Cohort', to: '/dashboard/instructor/courses/create' },
      { label: 'Build Outline', to: '/dashboard/instructor/creation-studio' }
    ]
  },
  {
    kicker: 'Engage',
    title: 'Run Sessions',
    actions: [
      { label: 'Schedule Live', to: '/dashboard/instructor/live-classes' },
      { label: 'Sync Calendar', to: '/dashboard/instructor/calendar' }
    ]
  },
  {
    kicker: 'Community',
    title: 'Grow Spaces',
    actions: [
      { label: 'Open Hub', to: '/dashboard/instructor/communities/create' },
      { label: 'Manage Members', to: '/dashboard/instructor/communities/manage' }
    ]
  },
  {
    kicker: 'Protect',
    title: 'Secure Access',
    actions: [
      { label: 'Review Safety', to: '/dashboard/learner/settings' },
      { label: 'Audit Roles', to: '/dashboard/admin/governance' }
    ]
  }
];

export default function Home() {
  const { t } = useLanguage();

  const heroTitle = t('home.hero.title', 'Build and grow every learnspace in one place');
  const heroDescription = t(
    'home.hero.description',
    'Plan cohorts, host live rooms, and manage revenue without juggling tools.'
  );
  const primaryCtaLabel = t('home.hero.ctaPrimary', 'Join now');
  const secondaryCtaLabel = t('home.hero.ctaSecondary', 'View feed');

  return (
    <div className="bg-slate-50 text-slate-900">
      <PageHero
        title={heroTitle}
        description={heroDescription}
        cta={
          <>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-dark"
            >
              {primaryCtaLabel}
            </Link>
            <Link
              to="/feed"
              className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:border-white hover:bg-white/10"
            >
              {secondaryCtaLabel}
            </Link>
            <LanguageSelector size="large" variant="dark" align="start" className="hover:border-white/80" />
          </>
        }
      />
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {actionBlocks.map((block) => (
              <article
                key={block.title}
                className="flex h-full flex-col gap-6 rounded-3xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{block.kicker}</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">{block.title}</h2>
                </div>
                <div className="grid gap-3">
                  {block.actions.map((action) => (
                    <Link
                      key={action.label}
                      to={action.to}
                      className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner transition hover:bg-primary hover:text-white"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <FeatureGrid />
      <Testimonials />
    </div>
  );
}
