import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.jsx';
import LanguageSelector from '../navigation/LanguageSelector.jsx';

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
    'Learning HQ for people building the future of education'
  );
  const subhead = t(
    'home.hero.subhead',
    'Spin up communities, drop fresh content, and host live touchpoints without ever leaving Edulure.'
  );
  const primaryCta = t('home.hero.ctaPrimary', 'Get started');
  const secondaryCta = t('home.hero.ctaSecondary', 'Preview the community');
  const instructorLabel = t('home.hero.instructorPill', "I'm an instructor");
  const illustrationSrc = t('home.hero.illustrationSrc', '');
  const hasIllustration = illustrationSrc.trim().length > 0;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-40 right-12 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/30 blur-[160px]" />
        <div className="absolute bottom-10 left-1/3 h-60 w-60 -translate-x-1/2 rounded-full bg-sky-400/20 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 py-24 lg:flex-row lg:items-center">
        <div className="flex w-full flex-col gap-10 lg:w-1/2">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.2em] text-white/70">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[0.7rem] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t('home.hero.status', 'Built for cohort-based learning')}
            </span>
            <LanguageSelector size="small" variant="dark" align="end" className="ml-auto" />
          </div>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">{headline}</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/80 md:text-lg md:leading-8">{subhead}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
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
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-24px_rgba(79,70,229,0.9)] transition hover:bg-primary-dark"
            >
              {primaryCta}
            </Link>
            <Link
              to="/feed"
              className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              {secondaryCta}
            </Link>
            <a
              href="#instructor"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {instructorLabel}
            </a>
          </div>
        </div>
        <div className="relative w-full lg:w-1/2">
          <div className="relative mx-auto flex max-w-xl items-center justify-center">
            <div className="absolute -left-12 -top-12 h-28 w-28 rounded-full bg-primary/40 blur-3xl" />
            <div className="absolute -right-16 bottom-8 h-32 w-32 rounded-full bg-emerald-500/30 blur-3xl" />
            <div className="absolute -bottom-12 left-1/3 h-24 w-24 -translate-x-1/2 rounded-full border border-white/30 bg-transparent" />
            <div className="absolute right-8 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xs font-semibold uppercase tracking-[0.3em] text-white/60 shadow-lg backdrop-blur-md animate-pulse">
              Flow
            </div>
            <div className="relative overflow-hidden rounded-[3rem] border border-white/15 bg-white/5 p-6 shadow-[0_40px_80px_-32px_rgba(15,23,42,0.7)] backdrop-blur-xl">
              <div className="absolute inset-0 animate-pulse rounded-[3rem] bg-gradient-to-br from-white/10 via-transparent to-white/5" />
              {hasIllustration ? (
                <img
                  src={illustrationSrc}
                  alt={t('home.hero.illustrationAlt', 'Collage of instructors and learners collaborating')}
                  className="relative z-10 w-full max-w-md rounded-[2.5rem] object-cover shadow-2xl"
                />
              ) : (
                <div
                  className="relative z-10 flex aspect-[4/5] w-full max-w-md items-center justify-center rounded-[2.5rem] bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.35),_rgba(14,116,144,0.2)_60%,_rgba(15,23,42,0.9))] text-sm font-semibold uppercase tracking-[0.3em] text-white/40"
                  aria-hidden="true"
                >
                  Edulure
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
