import PropTypes from 'prop-types';

export default function HomeHeroMedia({ t }) {
  return (
    <div className="relative">
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
  );
}

HomeHeroMedia.propTypes = {
  t: PropTypes.func.isRequired
};
