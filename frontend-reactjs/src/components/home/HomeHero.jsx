import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.jsx';
import LanguageSelector from '../navigation/LanguageSelector.jsx';
import HomeSection from './HomeSection.jsx';

const CHIP_KEYS = [
  { key: 'home.hero.chips.communities', fallback: 'Communities' },
  { key: 'home.hero.chips.courses', fallback: 'Courses' },
  { key: 'home.hero.chips.ebooks', fallback: 'E-books' },
  { key: 'home.hero.chips.tutors', fallback: '1:1 Tutors' }
];

export default function HomeHero() {
  const { t } = useLanguage();

  const headline = t(
    'home.hero.headline',
    'Learn, teach, and build together.'
  );
  const subhead = t(
    'home.hero.subhead',
    'Swap playbooks, host live jams, and grow with peers on Edulure.'
  );
  const primaryCta = t('home.hero.ctaPrimary', 'Get started');
  const secondaryCta = t('home.hero.ctaSecondary', 'Preview the community');
  const instructorLabel = t('home.hero.instructorPill', "I'm an instructor");

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-40 right-12 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/30 blur-[160px]" />
        <div className="absolute bottom-10 left-1/3 h-60 w-60 -translate-x-1/2 rounded-full bg-sky-400/20 blur-3xl" />
      </div>
      <HomeSection className="relative flex flex-col gap-12 lg:flex-row lg:items-center">
        <div className="flex w-full flex-col gap-10 lg:w-1/2">
          <div className="flex flex-col gap-3 text-xs uppercase tracking-[0.2em] text-white/70 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[0.7rem] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t('home.hero.status', 'Built for cohort-based learning')}
            </span>
            <LanguageSelector
              size="compact"
              variant="dark"
              align="end"
              className="hidden sm:inline-flex"
            />
          </div>
          <div className="sm:hidden">
            <LanguageSelector size="compact" variant="dark" align="start" fullWidth />
          </div>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">{headline}</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/80 md:text-lg md:leading-8">{subhead}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/80 sm:gap-3">
            {CHIP_KEYS.map(({ key, fallback }) => (
              <span
                key={key}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                {t(key, fallback)}
              </span>
            ))}
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link
              to="/register"
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-24px_rgba(79,70,229,0.9)] transition hover:bg-primary-dark sm:w-auto"
            >
              {primaryCta}
            </Link>
            <Link
              to="/feed"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10 sm:w-auto"
            >
              {secondaryCta}
            </Link>
            <a
              href="#instructor"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20 sm:w-auto"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {instructorLabel}
            </a>
          </div>
        </div>
        <div className="relative w-full lg:w-1/2">
          <div className="relative mx-auto max-w-xl">
            <span className="sr-only">{t('home.hero.illustrationAlt', 'Collage of instructors and learners collaborating')}</span>
            <div className="absolute -left-16 -top-20 h-36 w-36 rounded-full bg-primary/40 blur-3xl" aria-hidden="true" />
            <div className="absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-emerald-500/30 blur-[140px]" aria-hidden="true" />
            <div className="absolute left-12 top-12 h-16 w-16 rounded-full border border-white/20" aria-hidden="true" />
            <div className="absolute right-10 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xs font-semibold uppercase tracking-[0.3em] text-white/60 shadow-lg backdrop-blur-md animate-pulse" aria-hidden="true">
              Flow
            </div>
            <div className="relative grid gap-6 rounded-[3rem] border border-white/10 bg-white/5 p-6 shadow-[0_40px_80px_-32px_rgba(15,23,42,0.7)] backdrop-blur-xl sm:p-8">
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
            </div>
          </div>
        </div>
      </HomeSection>
    </section>
  );
}
