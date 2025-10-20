import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

import { useLanguage } from '../../context/LanguageContext.jsx';

import communitiesPreview from '../../assets/home/preview/communities.svg';
import coursesPreview from '../../assets/home/preview/courses.svg';
import liveEventsPreview from '../../assets/home/preview/live-events.svg';
import libraryPreview from '../../assets/home/preview/library.svg';

const TAB_CONFIG = [
  {
    key: 'communities',
    image: communitiesPreview,
    accent: 'from-emerald-400 via-cyan-400 to-sky-400',
    fallback: {
      label: 'Communities',
      caption: 'Threaded clubhouses with rituals built in.',
      description:
        'Spin up themed rooms, layer rituals, and keep every cohort pulsing with guided prompts that surface fresh wins.',
      highlightOne: 'Guided weekly prompts',
      highlightTwo: 'Moderation cues baked in',
      highlightThree: 'Members see wins instantly',
      imageAlt: 'Preview of Edulure community spaces'
    }
  },
  {
    key: 'courses',
    image: coursesPreview,
    accent: 'from-indigo-400 via-purple-500 to-fuchsia-500',
    fallback: {
      label: 'Courses',
      caption: 'Story-based curricula without the spreadsheets.',
      description:
        'Design multi-week arcs, stack media-rich lessons, and publish refreshes without exporting a single syllabus spreadsheet.',
      highlightOne: 'Drag-and-drop modules',
      highlightTwo: 'Completion signals live',
      highlightThree: 'Scope updates in real time',
      imageAlt: 'Preview of Edulure course builder interface'
    }
  },
  {
    key: 'liveEvents',
    image: liveEventsPreview,
    accent: 'from-amber-400 via-orange-400 to-rose-400',
    fallback: {
      label: 'Live events',
      caption: 'Studio energy minus the chaos.',
      description:
        'Host jam sessions, AMAs, and office hours with a control room that keeps chat, back-channel notes, and recordings in sync.',
      highlightOne: 'Green-room checklists',
      highlightTwo: 'Auto recordings ready',
      highlightThree: 'Backstage chat for hosts',
      imageAlt: 'Preview of Edulure live event control center'
    }
  },
  {
    key: 'library',
    image: libraryPreview,
    accent: 'from-sky-400 via-emerald-400 to-violet-400',
    fallback: {
      label: 'Resource library',
      caption: 'A candy shop of downloads and replays.',
      description:
        'Curate templates, replays, and swipe files with smart filters so learners always find the exact asset they need.',
      highlightOne: 'Filter by format fast',
      highlightTwo: 'Smart recs rotate weekly',
      highlightThree: 'Brand-safe sharing links',
      imageAlt: 'Preview of Edulure resource library grid'
    }
  }
];

const HIGHLIGHT_KEYS = ['highlightOne', 'highlightTwo', 'highlightThree'];

export default function InsidePreviewTabs() {
  const { t } = useLanguage();
  const [activeKey, setActiveKey] = useState(TAB_CONFIG[0].key);

  const tabs = useMemo(
    () =>
      TAB_CONFIG.map((tab) => ({
        ...tab,
        label: t(`home.preview.tabs.${tab.key}.label`, tab.fallback.label),
        caption: t(`home.preview.tabs.${tab.key}.caption`, tab.fallback.caption),
        description: t(`home.preview.tabs.${tab.key}.description`, tab.fallback.description),
        imageAlt: t(`home.preview.tabs.${tab.key}.imageAlt`, tab.fallback.imageAlt),
        highlights: HIGHLIGHT_KEYS.map((key) =>
          t(`home.preview.tabs.${tab.key}.${key}`, tab.fallback[key])
        ).filter(Boolean)
      })),
    [t]
  );

  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  const title = t(
    'home.preview.title',
    'See what’s waiting inside the Edulure clubhouse'
  );
  const subtitle = t(
    'home.preview.subtitle',
    'Toggle between community rooms, curriculum, and live ops to feel the flow before you sign in.'
  );
  const helper = t('home.preview.helper', 'Spotlights from this week’s launches');
  const cta = t('home.preview.cta', 'Browse all spaces');
  const footnote = t(
    'home.preview.footnote',
    'Fresh previews rotate every Monday at 09:00 UTC.'
  );

  return (
    <section className="bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                {helper}
              </p>
              <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                {title}
              </h2>
              <p className="text-base text-slate-600">{subtitle}</p>
            </div>
            <div className="flex flex-col gap-3">
              {tabs.map((tab) => {
                const isActive = tab.key === activeKey;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveKey(tab.key)}
                    className={`relative overflow-hidden rounded-2xl border px-5 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      isActive
                        ? 'border-transparent bg-gradient-to-r from-primary/10 via-white to-white shadow-[0_12px_40px_-20px_rgba(79,70,229,0.6)]'
                        : 'border-slate-200 bg-white/70 hover:border-primary/40 hover:bg-white'
                    }`}
                    aria-pressed={isActive}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {tab.label}
                        </p>
                        <p className="text-xs text-slate-500">{tab.caption}</p>
                      </div>
                      <span
                        className={`h-10 w-10 rounded-full bg-gradient-to-br ${tab.accent} opacity-70 transition ${
                          isActive ? 'scale-100' : 'scale-95'
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                    {isActive ? (
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <p>{footnote}</p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary-dark"
              >
                {cta}
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </aside>
          <div className="relative">
            <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
            <div className="absolute -right-6 top-12 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-[140px]" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[2.75rem] border border-slate-200 bg-white shadow-[0_40px_120px_-45px_rgba(15,23,42,0.45)]">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10" aria-hidden="true" />
              <img
                src={activeTab.image}
                alt={activeTab.imageAlt}
                className="relative block h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 bg-slate-900/70 p-4 text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.8)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
                  {activeTab.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{activeTab.caption}</p>
                <p className="mt-2 text-sm text-white/75">{activeTab.description}</p>
              </div>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {activeTab.highlights.map((highlight) => (
                <div
                  key={highlight}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-card"
                >
                  <CheckCircleIcon className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
                  <p className="text-sm font-medium text-slate-700">{highlight}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
