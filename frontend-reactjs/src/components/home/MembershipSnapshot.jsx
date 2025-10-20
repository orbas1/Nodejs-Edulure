import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.jsx';

const PLAN_KEYS = [
  {
    id: 'freeExplorer',
    icon: '🧭',
    accent: 'from-sky-500/30 via-blue-500/20 to-cyan-500/30',
    border: 'border-sky-300/40',
    shadow: 'shadow-[0_30px_80px_-40px_rgba(56,189,248,0.6)]'
  },
  {
    id: 'creatorPlus',
    icon: '🎨',
    accent: 'from-fuchsia-500/25 via-purple-500/30 to-pink-500/30',
    border: 'border-fuchsia-300/40',
    shadow: 'shadow-[0_40px_90px_-38px_rgba(232,121,249,0.7)]'
  },
  {
    id: 'communityCaptain',
    icon: '🚀',
    accent: 'from-amber-500/25 via-orange-500/30 to-rose-500/30',
    border: 'border-amber-300/40',
    shadow: 'shadow-[0_44px_96px_-36px_rgba(251,191,36,0.65)]'
  }
];

const MAX_FEATURE_ITEMS = 6;

export default function MembershipSnapshot() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 py-24 text-white">
      <div className="absolute left-1/4 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-10 right-10 h-72 w-72 translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[140px]" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">
            {t('home.membership.pretitle', 'Membership snapshot')}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('home.membership.title', 'Pick a playful path into the Edulure universe')}
          </h2>
          <p className="mt-4 text-base text-white/70">
            {t(
              'home.membership.subtitle',
              'Choose the vibe that fits your learning orbit — each plan unlocks new adventures with your crew.'
            )}
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {PLAN_KEYS.map(({ id, icon, accent, border, shadow }) => {
            const heading = t(`home.membership.plans.${id}.title`, 'Plan title');
            const tagline = t(
              `home.membership.plans.${id}.tagline`,
              'A whimsical path for curious creators.'
            );
            const price = t(`home.membership.plans.${id}.price`, 'Included perks');
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
                t('home.membership.defaults.feature', 'Experiential bullet point')
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
                    {t(`home.membership.plans.${id}.note`, 'Toggle when you are ready to level up.')}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mx-auto flex flex-wrap items-center justify-center gap-3 text-sm text-white/80">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 font-semibold transition hover:border-white/60 hover:bg-white/20"
          >
            <span aria-hidden="true">✨</span>
            {t('home.membership.cta', 'See full pricing')}
          </Link>
          <span className="text-xs text-white/50">
            {t('home.membership.disclaimer', 'Every plan comes with a 14-day joyride guarantee.')}
          </span>
        </div>
      </div>
    </section>
  );
}
