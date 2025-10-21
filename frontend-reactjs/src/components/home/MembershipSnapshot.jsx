import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.jsx';
import HomeSection from './HomeSection.jsx';

const PLAN_KEYS = [
  {
    id: 'communityTutor',
    icon: '🤝',
    accent: 'from-emerald-500/25 via-teal-500/30 to-cyan-500/30',
    border: 'border-emerald-300/40',
    shadow: 'shadow-[0_32px_84px_-42px_rgba(16,185,129,0.6)]'
  },
  {
    id: 'catalogue',
    icon: '📚',
    accent: 'from-indigo-500/25 via-sky-500/30 to-violet-500/30',
    border: 'border-indigo-300/40',
    shadow: 'shadow-[0_38px_92px_-40px_rgba(99,102,241,0.65)]'
  },
  {
    id: 'liveDonations',
    icon: '🎤',
    accent: 'from-rose-500/25 via-orange-500/30 to-amber-500/30',
    border: 'border-rose-300/40',
    shadow: 'shadow-[0_44px_98px_-38px_rgba(244,114,182,0.6)]'
  }
];

const MAX_FEATURE_ITEMS = 6;

export default function MembershipSnapshot() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white">
      <div className="absolute left-1/4 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-10 right-10 h-72 w-72 translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[140px]" aria-hidden="true" />
      <HomeSection className="relative flex flex-col gap-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">
            {t('home.membership.pretitle', 'Commission snapshot')}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('home.membership.title', 'Flat commissions, zero monthly fees')}
          </h2>
          <p className="mt-4 text-base text-white/70">
            {t(
              'home.membership.subtitle',
              'Operate on transparent usage-based pricing designed for modern learning businesses.'
            )}
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {PLAN_KEYS.map(({ id, icon, accent, border, shadow }) => {
            const heading = t(`home.membership.plans.${id}.title`, 'Channel title');
            const tagline = t(
              `home.membership.plans.${id}.tagline`,
              'Standard commission structure for this channel.'
            );
            const price = t(`home.membership.plans.${id}.price`, 'Flat commission rate');
            const features = [];

            for (let index = 0; index < MAX_FEATURE_ITEMS; index += 1) {
              const translationKey = `home.membership.plans.${id}.features.${index}`;
              const feature = t(translationKey);
              if (feature === translationKey) {
                break;
              }
              features.push(feature);
            }

            if (features.length === 0) {
              features.push(
                t('home.membership.defaults.feature', 'Transparent commission highlight')
              );
            }

            return (
              <article
                key={id}
                className={`relative flex h-full flex-col justify-between rounded-[2.5rem] border ${border} bg-gradient-to-br ${accent} p-8 backdrop-blur-xl ${shadow}`}
              >
                <div className="absolute inset-x-6 -top-6 flex justify-center">
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-3xl">
                    {icon}
                  </span>
                </div>
                <div className="mt-10 flex flex-col gap-5">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{heading}</h3>
                    <p className="mt-2 text-sm text-white/70">{tagline}</p>
                  </div>
                  <p className="text-sm font-medium uppercase tracking-[0.35em] text-white/60">
                    {price}
                  </p>
                  <ul className="mt-4 space-y-3 text-sm text-white/80">
                    {features.map((feature, index) => (
                      <li key={`${id}-feature-${index}`} className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-white/70" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8">
                  <p className="text-xs text-white/60">
                    {t(
                      `home.membership.plans.${id}.note`,
                      'Applies automatically across this revenue channel.'
                    )}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mx-auto flex flex-wrap items-center justify-center gap-3 text-sm text-white/80">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 font-semibold transition hover:border-white/60 hover:bg-white/20"
          >
            <span aria-hidden="true">✨</span>
            {t('home.membership.cta', 'Launch your workspace')}
          </Link>
          <span className="text-xs text-white/50">
            {t(
              'home.membership.disclaimer',
              'Commission defaults include a 25% affiliate share and non-custodial settlement.'
            )}
          </span>
        </div>
      </HomeSection>
    </section>
  );
}
