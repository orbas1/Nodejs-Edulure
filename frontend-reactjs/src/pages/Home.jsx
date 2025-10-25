import { useCallback, useMemo } from 'react';

import { useLanguage } from '../context/LanguageContext.jsx';
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
import useMarketingContent from '../hooks/useMarketingContent.js';
import communitiesPreview from '../assets/home/preview/communities.svg';
import coursesPreview from '../assets/home/preview/courses.svg';
import liveEventsPreview from '../assets/home/preview/live-events.svg';
import libraryPreview from '../assets/home/preview/library.svg';
import heroIllustration from '../assets/home/hero/campus-galaxy-hero.svg';
import { trackEvent } from '../lib/analytics.js';
import { getMarketingAltText } from '../data/marketingAltText.js';

function formatPlanPrice(priceCents, currency = 'USD', billingInterval = 'monthly') {
  const amount = Number.isFinite(priceCents) ? priceCents : 0;
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  });
  const price = formatter.format(Math.max(0, amount) / 100);
  if (!billingInterval || billingInterval === 'lifetime') {
    return billingInterval === 'lifetime' ? `${price} lifetime` : price;
  }
  const intervalLabel = billingInterval === 'annual' ? 'year' : 'month';
  return `${price} / ${intervalLabel}`;
}

function normaliseInternalAction(action, fallbackTo, fallbackLabel) {
  const destination = typeof action?.to === 'string' && action.to.startsWith('/') ? action.to : fallbackTo;
  const label = action?.label ?? action?.text ?? fallbackLabel;
  return { to: destination, label: label || fallbackLabel };
}

function normaliseExternalAction(action, fallbackHref, fallbackLabel) {
  const hrefCandidate = action?.href ?? action?.to;
  const href = typeof hrefCandidate === 'string' && hrefCandidate.length > 0 ? hrefCandidate : fallbackHref;
  const label = action?.label ?? action?.text ?? fallbackLabel;
  return { href, label: label || fallbackLabel };
}

const HERO_CHIP_KEYS = [
  { key: 'home.hero.chips.liveStudios', fallback: 'Live studios' },
  { key: 'home.hero.chips.peerCircles', fallback: 'Peer circles' },
  { key: 'home.hero.chips.library', fallback: 'Shared library' },
  { key: 'home.hero.chips.tutorHotline', fallback: 'Tutor hotline' }
];

const PREVIEW_TAB_CONFIG = [
  {
    key: 'communities',
    accent: 'from-emerald-400 via-cyan-400 to-sky-400',
    image: communitiesPreview,
    fallback: {
      label: 'Communities',
      caption: 'Playful clubs with rituals built in.',
      description: 'Host themed rooms with scheduled prompts, gentle moderation cues, and celebratory moments.',
      highlights: ['Guided prompts arrive automatically', 'Safety tools for every host', 'Celebrate wins in real time'],
      imageAlt: 'Preview of Edulure community spaces'
    }
  },
  {
    key: 'courses',
    accent: 'from-indigo-400 via-purple-500 to-fuchsia-500',
    image: coursesPreview,
    fallback: {
      label: 'Courses',
      caption: 'Story-led courses without spreadsheets.',
      description: 'Design multi-week arcs, add media-rich lessons, and publish refreshes without juggling extra files.',
      highlights: ['Drag-and-drop modules', 'Completion signals stream live', 'Update lessons in minutes'],
      imageAlt: 'Preview of Edulure course builder interface'
    }
  },
  {
    key: 'liveEvents',
    accent: 'from-amber-400 via-orange-400 to-rose-400',
    image: liveEventsPreview,
    fallback: {
      label: 'Live events',
      caption: 'Studio-grade live events minus the chaos.',
      description: 'Run jam sessions, AMAs, and office hours with backstage chat, checklists, and auto-recordings.',
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
      caption: 'A playful library of downloads and replays.',
      description: 'Curate templates, replays, and swipe files with smart filters so learners always find what they need.',
      highlights: ['Filter by format fast', 'Smart recs rotate weekly', 'Share links with confidence'],
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
const HERO_VIDEO_SOURCES = [
  {
    src: 'https://media.edulure.test/campus/hero-loop.webm',
    type: 'video/webm',
    resolution: 1080
  },
  {
    src: 'https://media.edulure.test/campus/hero-loop.mp4',
    type: 'video/mp4',
    resolution: 1080
  }
];
const HERO_IMAGE_SOURCES = [
  { src: heroIllustration, width: 960 },
  { src: heroIllustration, width: 720 },
  { src: heroIllustration, width: 540 }
];

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

  const { data: marketingData } = useMarketingContent();

  const fallbackHero = useMemo(
    () => ({
      eyebrow: t('home.hero.eyebrow', 'Community learning platform'),
      statusLabel: t('home.hero.status', 'Built for shared learning loops'),
      headline: t('home.hero.headline', 'Build your campus without the chaos.'),
      subheadline: t(
        'home.hero.subhead',
        'Welcome learners, run live labs, and keep every resource humming inside one joyful workspace.'
      ),
      primaryLabel: t('home.hero.ctaPrimary', 'Launch your space'),
      secondaryLabel: t('home.hero.ctaSecondary', 'Browse the campus'),
      tertiaryLabel: t('home.hero.instructorPill', "I'm teaching")
    }),
    [t]
  );

  const fallbackHeroChips = useMemo(
    () => HERO_CHIP_KEYS.map(({ key, fallback }) => t(key, fallback)),
    [t]
  );

  const heroBlock = useMemo(() => {
    if (!marketingData?.blocks?.length) {
      return null;
    }
    return marketingData.blocks.find((block) => block.blockType === 'hero') ?? null;
  }, [marketingData]);

  const heroSurfaceId = heroBlock?.slug ?? 'home-fallback-hero';

  const heroEyebrow = heroBlock?.eyebrow ?? fallbackHero.eyebrow;
  const heroStatusLabel = heroBlock?.statusLabel ?? fallbackHero.statusLabel;
  const heroHeadline = heroBlock?.title ?? fallbackHero.headline;
  const heroSubheadline = heroBlock?.subtitle ?? fallbackHero.subheadline;
  const heroChips = heroBlock?.chips?.length ? heroBlock.chips : fallbackHeroChips;

  const heroMedia = useMemo(() => {
    const blockMedia = heroBlock?.media ?? null;
    const fallbackCaption = t(
      'home.hero.media.caption',
      'Edulure keeps sessions, resources, and payments aligned so your campus always feels connected.'
    );
    const fallbackAlt = t(
      'home.hero.media.alt',
      getMarketingAltText('hero.campus-galaxy', 'Operators mapping a blended learning campus inside the Edulure workspace.')
    );
    if (!blockMedia) {
      return {
        type: 'video',
        videoSources: HERO_VIDEO_SOURCES,
        imageSources: HERO_IMAGE_SOURCES,
        poster: heroIllustration,
        caption: fallbackCaption,
        alt: fallbackAlt
      };
    }
    const candidateSources = Array.isArray(blockMedia.sources) ? blockMedia.sources : [];
    const videoSources = Array.isArray(blockMedia.videoSources) && blockMedia.videoSources.length
      ? blockMedia.videoSources
      : candidateSources.filter((source) => typeof source?.type === 'string' && source.type.startsWith('video/'));
    const imageSources = Array.isArray(blockMedia.imageSources) && blockMedia.imageSources.length
      ? blockMedia.imageSources
      : candidateSources.filter((source) => !source?.type || source.type.startsWith('image/'));
    return {
      ...blockMedia,
      type: blockMedia.type ?? 'video',
      videoSources: videoSources.length ? videoSources : HERO_VIDEO_SOURCES,
      imageSources: imageSources.length ? imageSources : HERO_IMAGE_SOURCES,
      poster: blockMedia.poster ?? heroIllustration,
      caption: blockMedia.caption ?? fallbackCaption,
      alt: blockMedia.alt ?? fallbackAlt
    };
  }, [heroBlock, t]);

  const heroPrimaryAction = useMemo(() => {
    const base = normaliseInternalAction(heroBlock?.primaryCta, '/register', fallbackHero.primaryLabel);
    return {
      ...base,
      onClick: () =>
        trackEvent('marketing:hero_cta', {
          surface: 'home',
          action: 'primary',
          blockSlug: heroSurfaceId,
          destination: base.to,
          label: base.label
        })
    };
  }, [heroBlock?.primaryCta, fallbackHero.primaryLabel, heroSurfaceId]);

  const heroSecondaryAction = useMemo(() => {
    const base = normaliseInternalAction(heroBlock?.secondaryCta, '/feed', fallbackHero.secondaryLabel);
    return {
      ...base,
      onClick: () =>
        trackEvent('marketing:hero_cta', {
          surface: 'home',
          action: 'secondary',
          blockSlug: heroSurfaceId,
          destination: base.to,
          label: base.label
        })
    };
  }, [heroBlock?.secondaryCta, fallbackHero.secondaryLabel, heroSurfaceId]);

  const heroTertiaryAction = useMemo(() => {
    const base = normaliseExternalAction(heroBlock?.tertiaryCta, '#instructor', fallbackHero.tertiaryLabel);
    return {
      ...base,
      onClick: () =>
        trackEvent('marketing:hero_cta', {
          surface: 'home',
          action: 'tertiary',
          blockSlug: heroSurfaceId,
          destination: base.href,
          label: base.label
        })
    };
  }, [heroBlock?.tertiaryCta, fallbackHero.tertiaryLabel, heroSurfaceId]);

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

  const marketingPlanCards = useMemo(() => {
    if (!marketingData?.plans?.length) {
      return [];
    }
    return marketingData.plans.map((plan) => {
      const accent = plan.metadata?.accent ?? {};
      const features = [];
      let icon = plan.metadata?.icon ?? null;

      if (Array.isArray(plan.features)) {
        for (const feature of plan.features) {
          if (features.length >= MAX_PLAN_FEATURES) {
            break;
          }
          if (!icon && feature?.metadata?.icon) {
            icon = feature.metadata.icon;
          }
          if (feature?.label) {
            features.push(feature.label);
          }
        }
      }

      if (features.length === 0) {
        features.push(t('home.membership.defaults.feature', 'Transparent fee highlight'));
      }

      return {
        id: plan.publicId ?? String(plan.id),
        icon,
        accent: accent.gradient ?? undefined,
        border: accent.border ?? undefined,
        shadow: accent.shadow ?? undefined,
        heading: plan.headline ?? plan.name,
        tagline: plan.tagline ?? null,
        price: formatPlanPrice(plan.priceCents, plan.currency, plan.billingInterval),
        features,
        note: plan.upsell?.descriptor ?? null
      };
    });
  }, [marketingData, t]);

  const fallbackPlanCards = useMemo(() => {
    return PLAN_CONFIG.map((plan) => {
      const heading = t(`home.membership.plans.${plan.id}.title`, 'Channel title');
      const tagline = t(
        `home.membership.plans.${plan.id}.tagline`,
        'Standard fee structure for this channel.'
      );
      const price = t(`home.membership.plans.${plan.id}.price`, 'Flat fee rate');
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
        features.push(t('home.membership.defaults.feature', 'Transparent fee highlight'));
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
  }, [t]);

  const planCards = marketingPlanCards.length ? marketingPlanCards : fallbackPlanCards;

  const handlePlanCta = useCallback(() => {
    const planIds = planCards.map((plan) => plan.id);
    trackEvent('marketing:plan_cta', {
      surface: 'home',
      planIds
    });
  }, [planCards]);

  const planCta = useMemo(
    () => ({
      to: '/register',
      label: t('home.membership.cta', 'Open your workspace'),
      icon: '✨',
      onClick: handlePlanCta
    }),
    [handlePlanCta, t]
  );

  return (
    <div className="bg-slate-50 text-slate-900">
      <MarketingHero
        marketingContent={marketingData}
        block={heroBlock}
        eyebrow={heroEyebrow}
        statusLabel={heroStatusLabel}
        chips={heroChips}
        headline={heroHeadline}
        subheadline={heroSubheadline}
        primaryAction={heroPrimaryAction}
        secondaryAction={heroSecondaryAction}
        tertiaryAction={heroTertiaryAction}
        media={heroMedia}
        mediaCaption={heroMedia.caption}
        mediaAlt={heroMedia.alt}
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
        eyebrow={t('home.membership.pretitle', 'Fees')}
        title={t('home.membership.title', 'Clear fees, zero monthly surprises')}
        subtitle={t(
          'home.membership.subtitle',
          'Operate on usage-based pricing that keeps more of every payout in your hands.'
        )}
        plans={planCards}
        cta={planCta}
        disclaimer={t(
          'home.membership.disclaimer',
          'Fees include optional affiliate sharing and direct-to-you settlement.'
        )}
      />
      <HomeFaq />
      <ClosingCtaBanner />
      <CoursesAdventure />
    </div>
  );
}
