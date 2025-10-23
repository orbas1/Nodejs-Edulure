import { useLanguage } from '../context/LanguageContext.jsx';
import LanguageSelector from '../components/navigation/LanguageSelector.jsx';
import MarketingHero from '../components/marketing/MarketingHero.jsx';
import ProductPreviewTabs from '../components/marketing/ProductPreviewTabs.jsx';
import PlanHighlights from '../components/marketing/PlanHighlights.jsx';
import CommunitySpotlight from '../components/home/CommunitySpotlight.jsx';
import PerksGrid from '../components/home/PerksGrid.jsx';
import HomeFaq from '../components/home/HomeFaq.jsx';
import ClosingCtaBanner from '../components/home/ClosingCtaBanner.jsx';
import TutorArcade from '../components/home/TutorArcade.jsx';
import CoursesAdventure from '../components/home/CoursesAdventure.jsx';
import EbookShowcase from '../components/home/EbookShowcase.jsx';
import usePageMetadata from '../hooks/usePageMetadata.js';
import communitiesPreview from '../assets/home/preview/communities.svg';
import coursesPreview from '../assets/home/preview/courses.svg';
import liveEventsPreview from '../assets/home/preview/live-events.svg';
import libraryPreview from '../assets/home/preview/library.svg';

const HERO_CHIP_KEYS = [
  { key: 'home.hero.chips.communities', fallback: 'Communities' },
  { key: 'home.hero.chips.courses', fallback: 'Courses' },
  { key: 'home.hero.chips.ebooks', fallback: 'E-books' },
  { key: 'home.hero.chips.tutors', fallback: '1:1 Tutors' }
];

const PREVIEW_TAB_CONFIG = [
  {
    key: 'communities',
    accent: 'from-emerald-400 via-cyan-400 to-sky-400',
    image: communitiesPreview,
    fallback: {
      label: 'Communities',
      caption: 'Threaded clubhouses with rituals built in.',
      description: 'Spin up themed rooms, layer rituals, and keep every cohort pulsing with guided prompts that surface fresh wins.',
      highlights: ['Guided weekly prompts', 'Moderation cues baked in', 'Members see wins instantly'],
      imageAlt: 'Preview of Edulure community spaces'
    }
  },
  {
    key: 'courses',
    accent: 'from-indigo-400 via-purple-500 to-fuchsia-500',
    image: coursesPreview,
    fallback: {
      label: 'Courses',
      caption: 'Story-based curricula without the spreadsheets.',
      description: 'Design multi-week arcs, stack media-rich lessons, and publish refreshes without exporting a single syllabus spreadsheet.',
      highlights: ['Drag-and-drop modules', 'Completion signals live', 'Scope updates in real time'],
      imageAlt: 'Preview of Edulure course builder interface'
    }
  },
  {
    key: 'liveEvents',
    accent: 'from-amber-400 via-orange-400 to-rose-400',
    image: liveEventsPreview,
    fallback: {
      label: 'Live events',
      caption: 'Studio energy minus the chaos.',
      description: 'Host jam sessions, AMAs, and office hours with a control room that keeps chat, back-channel notes, and recordings in sync.',
      highlights: ['Green-room checklists', 'Auto recordings ready', 'Backstage chat for hosts'],
      imageAlt: 'Preview of Edulure live event control center'
    }
  },
  {
    key: 'library',
    accent: 'from-sky-400 via-emerald-400 to-violet-400',
    image: libraryPreview,
    fallback: {
      label: 'Resource library',
      caption: 'A candy shop of downloads and replays.',
      description: 'Curate templates, replays, and swipe files with smart filters so learners always find the exact asset they need.',
      highlights: ['Filter by format fast', 'Smart recs rotate weekly', 'Brand-safe sharing links'],
      imageAlt: 'Preview of Edulure resource library grid'
    }
  }
];

const PLAN_CONFIG = [
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

const MAX_PLAN_FEATURES = 6;
const HIGHLIGHT_KEYS = ['highlightOne', 'highlightTwo', 'highlightThree'];

function HeroPreviewPanel({ t }) {
  return (
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
                {['AK', 'JR', 'MT', 'LS'].map((initials) => (
                  <span
                    key={initials}
                    className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-900 bg-white/90 text-sm font-semibold text-slate-900"
                    aria-hidden="true"
                  >
                    {initials}
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

export default function Home() {
  const { t } = useLanguage();
  usePageMetadata({
    title: 'Edulure · Education operating system for community-led learning',
    description:
      'Operate your education business with live classrooms, cohort management, content studios, and analytics inside one secure workspace built for operators.',
    canonicalPath: '/',
    image: 'https://www.edulure.com/assets/og/edulure-home.jpg',
    keywords: ['community-led learning', 'education operations', 'cohort management', 'live classrooms', 'content studio'],
    analytics: {
      page_type: 'home'
    }
  });

  const heroChips = HERO_CHIP_KEYS.map(({ key, fallback }) => t(key, fallback));
  const heroData = {
    eyebrow: t('home.hero.eyebrow', 'Learning community & marketplace'),
    status: t('home.hero.status', 'Built for cohort-based learning'),
    headline: t('home.hero.headline', 'Learn, teach, and build together.'),
    subheadline: t('home.hero.subhead', 'Swap playbooks, host live jams, and grow with peers on Edulure.'),
    primaryLabel: t('home.hero.ctaPrimary', 'Get started'),
    secondaryLabel: t('home.hero.ctaSecondary', 'Preview the community'),
    instructorLabel: t('home.hero.instructorPill', "I'm an instructor")
  };

  const previewTabs = PREVIEW_TAB_CONFIG.map((tab) => {
    const highlights = HIGHLIGHT_KEYS.map((highlightKey, index) =>
      t(`home.preview.tabs.${tab.key}.${highlightKey}`, tab.fallback.highlights[index])
    ).filter(Boolean);

    return {
      key: tab.key,
      label: t(`home.preview.tabs.${tab.key}.label`, tab.fallback.label),
      caption: t(`home.preview.tabs.${tab.key}.caption`, tab.fallback.caption),
      description: t(`home.preview.tabs.${tab.key}.description`, tab.fallback.description),
      highlights,
      accent: tab.accent,
      image: {
        src: tab.image,
        alt: t(`home.preview.tabs.${tab.key}.imageAlt`, tab.fallback.imageAlt)
      }
    };
  });

  const planCards = PLAN_CONFIG.map((plan) => {
    const heading = t(`home.membership.plans.${plan.id}.title`, 'Channel title');
    const tagline = t(`home.membership.plans.${plan.id}.tagline`, 'Standard commission structure for this channel.');
    const price = t(`home.membership.plans.${plan.id}.price`, 'Flat commission rate');
    const features = [];

    for (let index = 0; index < MAX_PLAN_FEATURES; index += 1) {
      const translationKey = `home.membership.plans.${plan.id}.features.${index}`;
      const feature = t(translationKey);
      if (feature === translationKey) {
        break;
      }
      features.push(feature);
    }

    if (features.length === 0) {
      features.push(t('home.membership.defaults.feature', 'Transparent commission highlight'));
    }

    const note = t(
      `home.membership.plans.${plan.id}.note`,
      'Applies automatically across this revenue channel.'
    );

    return {
      ...plan,
      heading,
      tagline,
      price,
      features,
      note
    };
  });

  return (
    <div className="bg-slate-50 text-slate-900">
      <MarketingHero
        eyebrow={heroData.eyebrow}
        statusLabel={heroData.status}
        languageSelector={{
          desktop: <LanguageSelector size="compact" variant="dark" align="end" />,
          mobile: <LanguageSelector size="compact" variant="dark" align="start" fullWidth />
        }}
        chips={heroChips}
        headline={heroData.headline}
        subheadline={heroData.subheadline}
        primaryAction={{ to: '/register', label: heroData.primaryLabel }}
        secondaryAction={{ to: '/feed', label: heroData.secondaryLabel }}
        tertiaryAction={{ href: '#instructor', label: heroData.instructorLabel }}
        rightPanel={<HeroPreviewPanel t={t} />}
      />
      <CommunitySpotlight />
      <PerksGrid />
      <ProductPreviewTabs
        helper={t('home.preview.helper', 'Spotlights from this week’s launches')}
        title={t('home.preview.title', 'See what’s waiting inside the Edulure clubhouse')}
        subtitle={t(
          'home.preview.subtitle',
          'Toggle between community rooms, curriculum, and live ops to feel the flow before you sign in.'
        )}
        cta={{ to: '/register', label: t('home.preview.cta', 'Browse all spaces') }}
        footnote={t('home.preview.footnote', 'Fresh previews rotate every Monday at 09:00 UTC.')}
        tablistLabel={t('home.preview.tablistLabel', 'Preview categories')}
        tabs={previewTabs}
      />
      <TutorArcade />
      <EbookShowcase />
      <PlanHighlights
        eyebrow={t('home.membership.pretitle', 'Commission snapshot')}
        title={t('home.membership.title', 'Flat commissions, zero monthly fees')}
        subtitle={t(
          'home.membership.subtitle',
          'Operate on transparent usage-based pricing designed for modern learning businesses.'
        )}
        plans={planCards}
        cta={{ to: '/register', label: t('home.membership.cta', 'Launch your workspace'), icon: '✨' }}
        disclaimer={t(
          'home.membership.disclaimer',
          'Commission defaults include a 25% affiliate share and non-custodial settlement.'
        )}
      />
      <HomeFaq />
      <ClosingCtaBanner />
      <CoursesAdventure />
    </div>
  );
}
