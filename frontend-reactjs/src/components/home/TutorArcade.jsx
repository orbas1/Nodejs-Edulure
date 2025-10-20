import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.jsx';

const QUEUE_ITEMS = [
  {
    titleKey: 'home.tutoring.calendar.slots.focus.title',
    fallback: 'Focus sprint · UX critique',
    metaKey: 'home.tutoring.calendar.slots.focus.meta',
    fallbackMeta: '12 min • Rina (Product mentor)',
    icon: '🎯',
    glow: 'from-emerald-500/70 to-emerald-400/50'
  },
  {
    titleKey: 'home.tutoring.calendar.slots.strategy.title',
    fallback: 'Strategy boost · Launch runway',
    metaKey: 'home.tutoring.calendar.slots.strategy.meta',
    fallbackMeta: '28 min • Malik (Growth coach)',
    icon: '🚀',
    glow: 'from-sky-500/70 to-indigo-400/50'
  },
  {
    titleKey: 'home.tutoring.calendar.slots.clarity.title',
    fallback: 'Clarity check · Data storytelling',
    metaKey: 'home.tutoring.calendar.slots.clarity.meta',
    fallbackMeta: '45 min • Zia (Analytics guide)',
    icon: '📊',
    glow: 'from-fuchsia-500/70 to-purple-500/50'
  }
];

const LEARNER_ITEMS = [
  {
    key: 'home.tutoring.learner.items.0',
    fallback: 'Drop micro-goals and get laser feedback without waitlists.'
  },
  {
    key: 'home.tutoring.learner.items.1',
    fallback: 'Unlock curated practice quests after every session.'
  },
  {
    key: 'home.tutoring.learner.items.2',
    fallback: 'Sync notes and replays straight into your Edulure workspace.'
  }
];

const INSTRUCTOR_ITEMS = [
  {
    key: 'home.tutoring.instructor.items.0',
    fallback: 'Fill idle blocks with learners already primed for your craft.'
  },
  {
    key: 'home.tutoring.instructor.items.1',
    fallback: 'Launch reusable session templates with one neon tap.'
  },
  {
    key: 'home.tutoring.instructor.items.2',
    fallback: 'Earn spotlight boosts when five-star reviews roll in fast.'
  }
];

function NeonArcadeFrame() {
  return (
    <svg
      viewBox="0 0 420 520"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="arcade-border" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="arcade-inner" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38f9d7" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#6366f1" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect
        x="6"
        y="6"
        width="408"
        height="508"
        rx="64"
        stroke="url(#arcade-border)"
        strokeWidth="3"
        fill="none"
        opacity="0.9"
      />
      <rect
        x="30"
        y="36"
        width="360"
        height="448"
        rx="52"
        stroke="url(#arcade-inner)"
        strokeWidth="2"
        strokeDasharray="14 14"
        fill="none"
        opacity="0.55"
      />
      <circle cx="80" cy="48" r="14" fill="#f97316" opacity="0.7" />
      <circle cx="120" cy="48" r="14" fill="#22d3ee" opacity="0.7" />
      <circle cx="160" cy="48" r="14" fill="#a855f7" opacity="0.7" />
    </svg>
  );
}

export default function TutorArcade() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-500/30 blur-[140px]" />
        <div className="absolute -bottom-32 right-10 h-64 w-64 rounded-full bg-sky-500/30 blur-[120px]" />
        <div className="absolute top-1/2 left-0 h-72 w-72 -translate-y-1/2 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[140px]" />
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 py-24 lg:flex-row lg:items-center lg:gap-20">
        <div className="relative w-full lg:w-1/2">
          <div className="relative mx-auto max-w-xl">
            <span className="sr-only">{t('home.tutoring.calendar.title', 'Arcade queue')}</span>
            <div className="absolute inset-0 -m-10 rounded-[3.5rem] bg-gradient-to-br from-fuchsia-500/20 via-transparent to-emerald-400/20 blur-3xl" aria-hidden="true" />
            <NeonArcadeFrame />
            <div className="relative overflow-hidden rounded-[2.75rem] border border-fuchsia-500/40 bg-slate-950/70 p-10 shadow-[0_45px_120px_-45px_rgba(217,70,239,0.8)] backdrop-blur-2xl">
              <div className="flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-fuchsia-200">
                <span className="inline-flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70 opacity-75" aria-hidden="true" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </span>
                  {t('home.tutoring.calendar.status', 'Live queue')}
                </span>
                <span className="text-fuchsia-400">{t('home.tutoring.calendar.next', 'Next refresh in 00:30')}</span>
              </div>
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                {t('home.tutoring.calendar.title', 'Arcade queue')}
              </h3>
              <div className="mt-6 grid gap-4">
                {QUEUE_ITEMS.map((item) => (
                  <div
                    key={item.titleKey}
                    className="group relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/5 p-5 shadow-[0_24px_60px_-35px_rgba(168,85,247,0.75)] transition hover:border-fuchsia-400/60"
                  >
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition group-hover:opacity-100"
                      aria-hidden="true"
                    />
                    <div className="relative flex items-start gap-4">
                      <span
                        className={`inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br ${item.glow} text-lg`}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{t(item.titleKey, item.fallback)}</p>
                        <p className="mt-1 text-xs text-white/60">{t(item.metaKey, item.fallbackMeta)}</p>
                      </div>
                      <span className="self-center rounded-full border border-emerald-400/60 px-3 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-emerald-200">
                        {t('home.tutoring.calendar.status', 'Live queue')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-8 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-3 text-xs text-fuchsia-100">
                {t('home.tutoring.calendar.footnote', 'Auto-matching refreshes every 30 seconds to keep energy high.')}
              </p>
            </div>
          </div>
        </div>
        <div className="w-full space-y-10 lg:w-1/2">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-fuchsia-200">
              {t('home.tutoring.kicker', 'Tutor arcade')}
            </p>
            <h2 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
              {t('home.tutoring.headline', 'Queue up your next breakthrough session')}
            </h2>
            <p className="max-w-xl text-base text-white/80">
              {t(
                'home.tutoring.subhead',
                'Spin up on-demand mentors, drop goals into the queue, and leave every call with a power-up tailored to your momentum.'
              )}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_35px_80px_-45px_rgba(34,197,94,0.7)]">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-teal-400/20 opacity-80" aria-hidden="true" />
              <div className="relative">
                <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200">
                  {t('home.tutoring.learner.title', 'Learner power-ups')}
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-white/80">
                  {LEARNER_ITEMS.map((item) => (
                    <li key={item.key} className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-emerald-400" aria-hidden="true" />
                      <span>{t(item.key, item.fallback)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_35px_80px_-45px_rgba(217,70,239,0.75)]">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-fuchsia-500/25 via-transparent to-purple-500/25 opacity-80" aria-hidden="true" />
              <div className="relative">
                <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-fuchsia-200">
                  {t('home.tutoring.instructor.title', 'Instructor power-ups')}
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-white/80">
                  {INSTRUCTOR_ITEMS.map((item) => (
                    <li key={item.key} className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-fuchsia-400" aria-hidden="true" />
                      <span>{t(item.key, item.fallback)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/tutors"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_30px_60px_-28px_rgba(79,70,229,0.85)] transition hover:bg-primary-dark"
            >
              {t('home.tutoring.ctaPrimary', 'Explore the tutor arcade')}
            </Link>
            <Link
              to="/tutors?intent=book"
              className="inline-flex items-center gap-2 rounded-full border border-white/50 px-5 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              <span className="inline-flex h-2 w-2 rounded-full bg-fuchsia-400" aria-hidden="true" />
              {t('home.tutoring.ctaSecondary', 'Book a lightning session')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
