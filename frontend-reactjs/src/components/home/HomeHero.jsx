import { useLanguage } from '../../context/LanguageContext.jsx';
import LanguageSelector from '../navigation/LanguageSelector.jsx';
import { trackEvent } from '../../lib/analytics.js';
import PrimaryHero from '../marketing/PrimaryHero.jsx';

const CHIP_KEYS = [
  { key: 'home.hero.chips.communities', fallback: 'Communities' },
  { key: 'home.hero.chips.courses', fallback: 'Courses' },
  { key: 'home.hero.chips.ebooks', fallback: 'E-books' },
  { key: 'home.hero.chips.tutors', fallback: '1:1 Tutors' }
];

export default function HomeHero() {
  const { t } = useLanguage();

  const headline = t('home.hero.headline', 'Learn, teach, and build together.');
  const subhead = t(
    'home.hero.subhead',
    'Swap playbooks, host live jams, and grow with peers on Edulure.'
  );
  const primaryCta = t('home.hero.ctaPrimary', 'Get started');
  const secondaryCta = t('home.hero.ctaSecondary', 'Preview the community');
  const instructorLabel = t('home.hero.instructorPill', "I'm an instructor");

  const pills = CHIP_KEYS.map(({ key, fallback }) => t(key, fallback));

  const handlePrimaryClick = () =>
    trackEvent('cta_click', {
      location: 'home_hero_primary'
    });
  const handleSecondaryClick = () =>
    trackEvent('cta_click', {
      location: 'home_hero_secondary'
    });
  const handleInstructorClick = () =>
    trackEvent('cta_click', {
      location: 'home_hero_instructor'
    });

  const mediaSlot = (
    <>
      <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-white/10 via-transparent to-white/5" aria-hidden="true" />
      <div className="relative grid gap-5">
        <div className="relative flex flex-col gap-4 rounded-3xl border border-white/20 bg-slate-950/60 p-5 shadow-[0_24px_48px_-32px_rgba(56,189,248,0.5)] sm:flex-row sm:items-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-400 text-lg font-semibold text-white">
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400" aria-hidden="true" />
            ✨
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{t('home.hero.cards.liveSession.title', 'Live cohort jam')}</p>
            <p className="text-xs text-white/70">{t('home.hero.cards.liveSession.meta', 'Starts in 12 hours')}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-300 sm:ml-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {t('home.hero.cards.liveSession.cta', 'Set reminder')}
          </div>
        </div>
        <div className="relative grid gap-4 rounded-[2.5rem] border border-white/15 bg-gradient-to-br from-indigo-500/30 via-slate-900/70 to-transparent p-6 shadow-[0_20px_60px_-28px_rgba(129,140,248,0.7)]">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/60">
            <span>{t('home.hero.cards.community.title', 'Community pulse')}</span>
            <span className="inline-flex items-center gap-1 text-[0.65rem] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {t('home.hero.cards.community.status', 'Live now')}
            </span>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex -space-x-3">
              {[...Array(4)].map((_, index) => (
                <span
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-900 bg-white/90 text-sm font-semibold text-slate-900"
                  aria-hidden="true"
                >
                  {['AK', 'JR', 'MT', 'LS'][index]}
                </span>
              ))}
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-sm font-semibold text-white">{t('home.hero.cards.community.headline', 'Weekly build circle')}</p>
              <p className="text-xs text-white/70">{t('home.hero.cards.community.subhead', 'Swap launches, feedback, and wins with peers')}</p>
            </div>
          </div>
        </div>
        <div className="relative flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/20 text-base text-emerald-200">
              ☕
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{t('home.hero.cards.resource.title', 'Creator tea digest')}</p>
              <p>{t('home.hero.cards.resource.meta', 'Fresh drops every Monday')}</p>
            </div>
          </div>
          <span className="inline-flex w-full justify-center rounded-full border border-white/20 px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-white/60 sm:w-auto">
            {t('home.hero.cards.resource.cta', 'Read now')}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <PrimaryHero
      eyebrow={t('home.hero.status', 'Built for cohort-based learning')}
      title={headline}
      description={subhead}
      pills={pills}
      headerSlot={
        <>
          <LanguageSelector size="compact" variant="dark" align="end" className="hidden sm:inline-flex" />
          <div className="sm:hidden">
            <LanguageSelector size="compact" variant="dark" align="start" fullWidth />
          </div>
        </>
      }
      mediaSlot={mediaSlot}
      primaryAction={{ label: primaryCta, to: '/register', onClick: handlePrimaryClick }}
      secondaryAction={{ label: secondaryCta, to: '/feed', onClick: handleSecondaryClick }}
      tertiaryAction={{ label: instructorLabel, href: '#instructor', onClick: handleInstructorClick }}
      analyticsId="home-hero"
    />
  );
}
