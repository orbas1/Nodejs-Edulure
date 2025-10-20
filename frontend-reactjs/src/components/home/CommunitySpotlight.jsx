import badgeSparkle from '../../assets/home/community/badge-sparkle.svg';
import polaroidNote from '../../assets/home/community/polaroid-note.svg';
import { useLanguage } from '../../context/LanguageContext.jsx';

const LEARNER_BENEFITS = [
  {
    key: 'home.community.learners.benefits.one',
    fallback: 'Drop into live build labs with peers and mentors who keep things upbeat.'
  },
  {
    key: 'home.community.learners.benefits.two',
    fallback: 'Collect project-ready templates, playlists, and prompts in one playful vault.'
  },
  {
    key: 'home.community.learners.benefits.three',
    fallback: 'Score accountability check-ins that feel more like pep talks than homework.'
  }
];

const INSTRUCTOR_BENEFITS = [
  {
    key: 'home.community.instructors.benefits.one',
    fallback: 'Spin up vibrant cohorts with zero-fuss tooling built for experimentation.'
  },
  {
    key: 'home.community.instructors.benefits.two',
    fallback: 'Package curriculum drops, feedback loops, and analytics in one joyful HQ.'
  },
  {
    key: 'home.community.instructors.benefits.three',
    fallback: 'Spotlight wins with playful badges that keep your learners cheering.'
  }
];

export default function CommunitySpotlight() {
  const { t } = useLanguage();

  const eyebrow = t('home.community.eyebrow', 'Community spotlight');
  const heading = t('home.community.heading', 'Two tracks. One buzzing campus.');
  const description = t(
    'home.community.description',
    'Pick your lane and plug into gatherings designed for momentum, cheer, and meaningful progress.'
  );

  return (
    <section className="relative overflow-hidden bg-white py-24 sm:py-28" aria-labelledby="community-spotlight-heading">
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
        <div className="absolute left-[-4rem] top-16 hidden rotate-[-8deg] sm:block">
          <img src={polaroidNote} alt="" className="w-64 drop-shadow-xl" />
        </div>
        <div className="absolute right-[-3rem] bottom-6 hidden rotate-[12deg] sm:block">
          <img src={badgeSparkle} alt="" className="w-52 drop-shadow-2xl" />
        </div>
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {eyebrow}
          </span>
          <h2 id="community-spotlight-heading" className="mt-6 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {heading}
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">{description}</p>
        </div>

        <div className="relative mt-16 grid gap-8 lg:grid-cols-2">
          <article className="relative rounded-[2.25rem] border border-slate-200 bg-white/90 p-10 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.3)] backdrop-blur">
            <div className="absolute -left-7 -top-7 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-2xl">
              <span role="img" aria-hidden="true">
                📚
              </span>
            </div>
            <header className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                {t('home.community.learners.label', 'For learners')}
              </p>
              <h3 className="text-2xl font-semibold text-slate-900">
                {t('home.community.learners.title', 'Find your flow, one playful sprint at a time.')}
              </h3>
              <p className="text-base leading-7 text-slate-600">
                {t(
                  'home.community.learners.description',
                  'Join squads who learn out loud, swap experiments, and celebrate the little wins that build big confidence.'
                )}
              </p>
            </header>
            <ul className="mt-8 space-y-4 text-sm text-slate-700">
              {LEARNER_BENEFITS.map(({ key, fallback }) => (
                <li key={key} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-base">
                    ✦
                  </span>
                  <span>{t(key, fallback)}</span>
                </li>
              ))}
            </ul>
          </article>

          <article
            id="instructor"
            className="relative rounded-[2.25rem] border border-slate-200 bg-slate-900/95 p-10 text-white shadow-[0_28px_56px_-24px_rgba(15,23,42,0.55)] backdrop-blur"
          >
            <div className="absolute -left-7 -top-7 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-fuchsia-500 text-2xl">
              <span role="img" aria-hidden="true">
                🎓
              </span>
            </div>
            <header className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-200">
                {t('home.community.instructors.label', 'For instructors')}
              </p>
              <h3 className="text-2xl font-semibold text-white">
                {t('home.community.instructors.title', 'Design experiences that feel like festivals, not lectures.')}
              </h3>
              <p className="text-base leading-7 text-white/80">
                {t(
                  'home.community.instructors.description',
                  'Craft cohorts that pulse with curiosity, remix resources on the fly, and watch your community light up.'
                )}
              </p>
            </header>
            <ul className="mt-8 space-y-4 text-sm text-white/85">
              {INSTRUCTOR_BENEFITS.map(({ key, fallback }) => (
                <li key={key} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-base text-white">
                    ✹
                  </span>
                  <span>{t(key, fallback)}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
