import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../context/LanguageContext.jsx';

const STAGES = [
  {
    key: 'discover',
    accent: 'from-sky-500/20 via-indigo-400/10 to-transparent',
    fallbackTitle: 'Discover',
    learnerPerks: [
      {
        key: 'home.courses.stages.discover.learners.perk1',
        fallback: 'Browse curated cohorts by skill focus'
      },
      {
        key: 'home.courses.stages.discover.learners.perk2',
        fallback: 'Preview syllabi, schedules and outcomes'
      }
    ],
    instructorPerks: [
      {
        key: 'home.courses.stages.discover.instructors.perk1',
        fallback: 'Spotlight differentiators with rich metadata'
      },
      {
        key: 'home.courses.stages.discover.instructors.perk2',
        fallback: 'Publish waitlists and discovery-ready previews'
      }
    ]
  },
  {
    key: 'enroll',
    accent: 'from-emerald-400/20 via-sky-400/10 to-transparent',
    fallbackTitle: 'Enroll',
    learnerPerks: [
      {
        key: 'home.courses.stages.enroll.learners.perk1',
        fallback: 'Secure seats with flexible payment plans'
      },
      {
        key: 'home.courses.stages.enroll.learners.perk2',
        fallback: 'Track onboarding tasks and deadlines'
      }
    ],
    instructorPerks: [
      {
        key: 'home.courses.stages.enroll.instructors.perk1',
        fallback: 'Automate acceptance and welcome flows'
      },
      {
        key: 'home.courses.stages.enroll.instructors.perk2',
        fallback: 'Gate resources until kickoff'
      }
    ]
  },
  {
    key: 'coLearn',
    accent: 'from-fuchsia-400/20 via-purple-400/10 to-transparent',
    fallbackTitle: 'Co-learn',
    learnerPerks: [
      {
        key: 'home.courses.stages.coLearn.learners.perk1',
        fallback: 'Join live studios, async threads and office hours'
      },
      {
        key: 'home.courses.stages.coLearn.learners.perk2',
        fallback: 'Earn badges for momentum and peer support'
      }
    ],
    instructorPerks: [
      {
        key: 'home.courses.stages.coLearn.instructors.perk1',
        fallback: 'Orchestrate sprints with templates and nudges'
      },
      {
        key: 'home.courses.stages.coLearn.instructors.perk2',
        fallback: 'Spot at-risk learners with pulse dashboards'
      }
    ]
  },
  {
    key: 'celebrate',
    accent: 'from-amber-400/20 via-rose-400/10 to-transparent',
    fallbackTitle: 'Celebrate',
    learnerPerks: [
      {
        key: 'home.courses.stages.celebrate.learners.perk1',
        fallback: 'Showcase capstone artefacts and reflections'
      },
      {
        key: 'home.courses.stages.celebrate.learners.perk2',
        fallback: 'Share wins with the cohort and alumni'
      }
    ],
    instructorPerks: [
      {
        key: 'home.courses.stages.celebrate.instructors.perk1',
        fallback: 'Issue verifiable certificates in one click'
      },
      {
        key: 'home.courses.stages.celebrate.instructors.perk2',
        fallback: 'Collect testimonials and publish highlights'
      }
    ]
  }
];

function RoleList({ label, items }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 shadow-inner backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">{label}</p>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-white/80">
        {items.map(({ key, text }) => (
          <li key={key} className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-emerald-400" aria-hidden="true" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

RoleList.propTypes = {
  label: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired
    })
  ).isRequired
};

export default function CoursesAdventure() {
  const { t } = useLanguage();

  const kicker = t('home.courses.kicker', 'Courses adventure');
  const title = t(
    'home.courses.title',
    'Chart the shared courses adventure'
  );
  const subtitle = t(
    'home.courses.subtitle',
    'Follow the journey from discovery through celebration with aligned perks for learners and instructors.'
  );
  const ctaLabel = t('home.courses.cta', 'Explore courses');
  const learnersLabel = t('home.courses.roles.learners', 'Learners');
  const instructorsLabel = t('home.courses.roles.instructors', 'Instructors');

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-8 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 bg-fuchsia-500/20 blur-[160px]" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 opacity-95" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            {kicker}
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
          <p className="text-base leading-7 text-white/70 md:text-lg md:leading-8">{subtitle}</p>
        </div>
        <div className="relative mt-16">
          <svg
            className="absolute inset-x-0 top-1/2 hidden h-48 w-full -translate-y-1/2 text-white/10 md:block"
            viewBox="0 0 1200 200"
            fill="none"
            role="presentation"
            aria-hidden="true"
          >
            <path
              d="M40 150 C 220 40, 380 40, 560 150 S 900 260, 1160 110"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="18 20"
            />
          </svg>
          <div className="relative flex flex-col gap-8 md:flex-row">
            {STAGES.map((stage, index) => (
              <div
                key={stage.key}
                className="relative flex flex-1 flex-col gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_60px_-35px_rgba(15,23,42,0.8)] backdrop-blur"
              >
                <div className="absolute -top-5 left-6 hidden h-10 w-10 items-center justify-center rounded-full border-4 border-slate-950 bg-emerald-400 text-xs font-semibold uppercase tracking-[0.3em] text-slate-900 shadow-lg md:flex">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className={`absolute inset-x-4 -top-1 h-1 rounded-full bg-gradient-to-r ${stage.accent}`} aria-hidden="true" />
                <div className="flex flex-col gap-3 pt-4">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                    {t(`home.courses.stages.${stage.key}.title`, stage.fallbackTitle)}
                  </div>
                  <p className="text-lg font-semibold text-white">
                    {t(`home.courses.stages.${stage.key}.headline`, stage.fallbackTitle)}
                  </p>
                </div>
                <div className="grid gap-4">
                  <RoleList
                    label={learnersLabel}
                    items={stage.learnerPerks.map((perk) => ({
                      key: perk.key,
                      text: t(perk.key, perk.fallback)
                    }))}
                  />
                  <RoleList
                    label={instructorsLabel}
                    items={stage.instructorPerks.map((perk) => ({
                      key: perk.key,
                      text: t(perk.key, perk.fallback)
                    }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-20px_rgba(79,70,229,0.8)] transition hover:bg-primary-dark"
          >
            {ctaLabel}
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
          <span className="text-xs text-white/50">
            {t('home.courses.ctaHelper', 'Head straight to the full catalogue and start plotting your next cohort.')}
          </span>
        </div>
      </div>
    </section>
  );
}
