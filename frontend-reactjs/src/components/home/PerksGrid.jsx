import { useLanguage } from '../../context/LanguageContext.jsx';
import HomeSection from './HomeSection.jsx';

const PERK_ITEMS = [
  {
    key: 'communityMagnetism',
    icon: '🌈',
    gradient: 'from-rose-100 via-orange-100 to-amber-100'
  },
  {
    key: 'liveStudioVibes',
    icon: '🎙️',
    gradient: 'from-sky-100 via-cyan-100 to-indigo-100'
  },
  {
    key: 'contentPlayground',
    icon: '🧩',
    gradient: 'from-emerald-100 via-teal-100 to-lime-100'
  },
  {
    key: 'signalBoosts',
    icon: '📣',
    gradient: 'from-fuchsia-100 via-pink-100 to-rose-100'
  },
  {
    key: 'supportLoop',
    icon: '💬',
    gradient: 'from-violet-100 via-purple-100 to-slate-100'
  },
  {
    key: 'growthOps',
    icon: '🚀',
    gradient: 'from-amber-100 via-yellow-100 to-sky-100'
  }
];

export default function PerksGrid() {
  const { t } = useLanguage();

  const eyebrow = t('home.perks.eyebrow', 'Playful perks');
  const heading = t(
    'home.perks.headline',
    'Perks that keep the learning energy high'
  );
  const subheading = t(
    'home.perks.subhead',
    'Playful boosts designed for curious learners and hands-on instructors.'
  );
  const learnersLabel = t('home.perks.learnersLabel', 'For Learners');
  const instructorsLabel = t('home.perks.instructorsLabel', 'For Instructors');

  return (
    <section className="bg-gradient-to-b from-slate-50 via-white to-slate-100/70">
      <HomeSection pad="cozy">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">
            {heading}
          </h2>
          <p className="mt-4 text-base text-slate-600 md:text-lg">{subheading}</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {PERK_ITEMS.map(({ key, icon, gradient }) => {
            const title = t(`home.perks.items.${key}.title`, 'Playful moment');
            const learnersLine = t(
              `home.perks.items.${key}.learners`,
              'Learners get a joyful boost.'
            );
            const instructorsLine = t(
              `home.perks.items.${key}.instructors`,
              'Instructors orchestrate with ease.'
            );

            return (
              <article
                key={key}
                className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_36px_90px_-36px_rgba(79,70,229,0.55)]"
              >
                <div
                  className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${gradient} opacity-70`}
                  aria-hidden="true"
                />
                <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/40" aria-hidden="true" />
                <div className="relative flex flex-col gap-5">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-2xl shadow-inner">
                    <span aria-hidden="true">{icon}</span>
                    <span className="sr-only">{title}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
                    <div className="mt-4 space-y-2 text-sm leading-6">
                      <p className="text-slate-700">
                        <span className="font-semibold text-slate-900">{learnersLabel}:</span>{' '}
                        {learnersLine}
                      </p>
                      <p className="text-slate-700">
                        <span className="font-semibold text-slate-900">{instructorsLabel}:</span>{' '}
                        {instructorsLine}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </HomeSection>
    </section>
  );
}
