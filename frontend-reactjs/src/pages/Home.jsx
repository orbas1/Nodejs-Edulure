import { useCallback, useMemo } from 'react';

import { useLanguage } from '../context/LanguageContext.jsx';
import LanguageSelector from '../components/navigation/LanguageSelector.jsx';
import MarketingHero from '../components/marketing/MarketingHero.jsx';
import ProductPreviewTabs from '../components/marketing/ProductPreviewTabs.jsx';
import PlanHighlights from '../components/marketing/PlanHighlights.jsx';
import CaseStudyGrid from '../components/marketing/CaseStudyGrid.jsx';
import MonetizationRibbon from '../components/marketing/MonetizationRibbon.jsx';
import ConversionPanel from '../components/marketing/ConversionPanel.jsx';
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
import heroIllustration from '../assets/home/hero/flow-five-hero.svg';
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
const HERO_VIDEO_SOURCES = [
  {
    src: 'https://media.edulure.test/flow5/hero-loop.webm',
    type: 'video/webm',
    resolution: 1080
  },
  {
    src: 'https://media.edulure.test/flow5/hero-loop.mp4',
    type: 'video/mp4',
    resolution: 1080
  }
];
const HERO_IMAGE_SOURCES = [
  { src: heroIllustration, width: 960 },
  { src: heroIllustration, width: 720 },
  { src: heroIllustration, width: 540 }
];

const CASE_STUDY_FALLBACKS = [
  {
    id: 'opsGuild',
    slug: 'ops-guild',
    translationKey: 'home.caseStudies.opsGuild',
    fallback: {
      title: 'Ops Guild scaled Flow 5 invites',
      summary: 'Kai unified marketing experiments, onboarding checklists, and sponsor offers to lift enrolment 28%.',
      persona: 'Kai • Revenue Ops',
      metric: '+28% enrolment',
      ctaLabel: 'Read Ops Guild story',
      href: 'https://stories.edulure.test/flow5-ops-guild'
    },
    media: {
      imageSources: [
        { src: 'https://images.edulure.test/case-studies/ops-guild-960.webp', width: 960 },
        { src: 'https://images.edulure.test/case-studies/ops-guild-720.webp', width: 720 },
        { src: 'https://images.edulure.test/case-studies/ops-guild-480.webp', width: 480 }
      ]
    },
    altKey: 'case-study.ops-guild'
  },
  {
    id: 'cohortStudio',
    slug: 'cohort-studio',
    translationKey: 'home.caseStudies.cohortStudio',
    fallback: {
      title: 'Cohort Studio halved production time',
      summary: 'Amina replaced siloed spreadsheets with Flow 5 lesson kits and automated sponsor unlocks for each cohort.',
      persona: 'Amina • Learning Designer',
      metric: '-50% build time',
      ctaLabel: 'Explore Cohort Studio playbook',
      href: 'https://stories.edulure.test/cohort-studio'
    },
    media: {
      imageSources: [
        { src: 'https://images.edulure.test/case-studies/cohort-studio-960.webp', width: 960 },
        { src: 'https://images.edulure.test/case-studies/cohort-studio-720.webp', width: 720 },
        { src: 'https://images.edulure.test/case-studies/cohort-studio-480.webp', width: 480 }
      ]
    },
    altKey: 'case-study.cohort-studio'
  },
  {
    id: 'tutorLeague',
    slug: 'tutor-league',
    translationKey: 'home.caseStudies.tutorLeague',
    fallback: {
      title: 'Tutor League unlocked sponsor-ready pods',
      summary: 'Noah brought tutor pods, live donations, and affiliate payouts under one dashboard to grow recurring revenue.',
      persona: 'Noah • Tutor Collective Lead',
      metric: '+42% sponsor revenue',
      ctaLabel: 'See Tutor League results',
      href: 'https://stories.edulure.test/tutor-league'
    },
    media: {
      imageSources: [
        { src: 'https://images.edulure.test/case-studies/tutor-league-960.webp', width: 960 },
        { src: 'https://images.edulure.test/case-studies/tutor-league-720.webp', width: 720 },
        { src: 'https://images.edulure.test/case-studies/tutor-league-480.webp', width: 480 }
      ]
    },
    altKey: 'case-study.tutor-league'
  }
];

const MONETISATION_FALLBACK_HIGHLIGHTS = [
  { key: 'home.monetization.highlights.ads', fallback: 'Ad pods with sponsor pacing controls' },
  { key: 'home.monetization.highlights.tutors', fallback: 'Tutor pods synced with payouts dashboard' },
  { key: 'home.monetization.highlights.affiliates', fallback: 'Affiliate revenue reconciled nightly' }
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
      eyebrow: t('home.hero.eyebrow', 'Learning community & marketplace'),
      statusLabel: t('home.hero.status', 'Built for cohort-based learning'),
      headline: t('home.hero.headline', 'Learn, teach, and build together.'),
      subheadline: t('home.hero.subhead', 'Swap playbooks, host live jams, and grow with peers on Edulure.'),
      primaryLabel: t('home.hero.ctaPrimary', 'Get started'),
      secondaryLabel: t('home.hero.ctaSecondary', 'Preview the community'),
      tertiaryLabel: t('home.hero.instructorPill', "I'm an instructor")
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
      'Flow 5 keeps marketing, onboarding, and payouts connected in one workspace.'
    );
    const fallbackAlt = t(
      'home.hero.media.alt',
      getMarketingAltText('hero.flow-five', 'Operators collaborating inside the Flow 5 workspace.')
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

  const caseStudyBlock = useMemo(() => {
    if (!marketingData?.blocks?.length) {
      return null;
    }
    return marketingData.blocks.find((block) => block.blockType === 'case-study') ?? null;
  }, [marketingData]);

  const caseStudies = useMemo(() => {
    return CASE_STUDY_FALLBACKS.map((fallback) => {
      const payload = Array.isArray(caseStudyBlock?.metadata?.caseStudies)
        ? caseStudyBlock.metadata.caseStudies.find(
            (study) => study.slug === fallback.slug || study.id === fallback.slug
          ) ?? null
        : null;
      const title = t(`${fallback.translationKey}.title`, payload?.title ?? fallback.fallback.title);
      const summary = t(`${fallback.translationKey}.summary`, payload?.summary ?? fallback.fallback.summary);
      const persona = t(`${fallback.translationKey}.persona`, payload?.persona ?? fallback.fallback.persona);
      const metric = t(`${fallback.translationKey}.metric`, payload?.metric ?? fallback.fallback.metric);
      const ctaLabel = t(`${fallback.translationKey}.ctaLabel`, payload?.cta?.label ?? fallback.fallback.ctaLabel);
      const href = payload?.cta?.href ?? payload?.href ?? fallback.fallback.href;
      const alt = t(
        `${fallback.translationKey}.alt`,
        getMarketingAltText(fallback.altKey, fallback.fallback.title)
      );
      const media = payload?.media ?? fallback.media;

      return {
        id: fallback.id,
        title,
        summary,
        persona,
        metric,
        media,
        alt,
        cta: href
          ? {
              href,
              label: ctaLabel,
              onClick: () =>
                trackEvent('marketing:case_study_cta', {
                  surface: 'home',
                  slug: payload?.slug ?? fallback.slug,
                  destination: href,
                  label: ctaLabel
                })
            }
          : null
      };
    });
  }, [caseStudyBlock, t]);

  const caseStudyEyebrow = caseStudyBlock?.eyebrow ?? t('home.caseStudies.eyebrow', 'Operator proof');
  const caseStudyTitle = caseStudyBlock?.title ?? t('home.caseStudies.title', 'Operators scaling with Flow 5');
  const caseStudyCaption = caseStudyBlock?.subtitle ??
    t(
      'home.caseStudies.caption',
      'Revenue, community, and tutor teams growing through shared Edulure workflows.'
    );

  const monetisationBlock = useMemo(() => {
    if (!marketingData?.blocks?.length) {
      return null;
    }
    return marketingData.blocks.find((block) => block.blockType === 'monetization-ribbon') ?? null;
  }, [marketingData]);

  const monetisationTitle = t(
    'home.monetization.title',
    monetisationBlock?.title ?? 'Monetise every surface with Flow 5'
  );
  const monetisationDescription = t(
    'home.monetization.description',
    monetisationBlock?.subtitle ??
      'Blend sponsorships, tutor pods, and affiliate revenue without leaving the dashboard.'
  );
  const monetisationHighlights = useMemo(() => {
    if (Array.isArray(monetisationBlock?.metadata?.highlights) && monetisationBlock.metadata.highlights.length) {
      return monetisationBlock.metadata.highlights.map((highlight, index) =>
        t(`home.monetization.highlights.dynamic.${index}`, typeof highlight === 'string' ? highlight : highlight?.label ?? '')
      ).filter(Boolean);
    }
    return MONETISATION_FALLBACK_HIGHLIGHTS.map(({ key, fallback }) => t(key, fallback));
  }, [monetisationBlock, t]);

  const monetisationPrimaryAction = useMemo(() => {
    const base = monetisationBlock?.primaryCta ?? null;
    if (base?.href && !base?.to) {
      return normaliseExternalAction(
        base,
        'https://docs.edulure.test/flow5/monetisation',
        t('home.monetization.primaryCta', 'Activate monetisation')
      );
    }
    return normaliseInternalAction(
      base,
      '/register',
      t('home.monetization.primaryCta', 'Activate monetisation')
    );
  }, [monetisationBlock?.primaryCta, t]);

  const monetisationSecondaryAction = useMemo(() => {
    const base = monetisationBlock?.secondaryCta ?? null;
    if (!base) {
      return normaliseInternalAction(
        base,
        '/pricing',
        t('home.monetization.secondaryCta', 'Review pricing')
      );
    }
    if (base.href && !base.to) {
      return normaliseExternalAction(
        base,
        'https://docs.edulure.test/flow5/monetisation',
        t('home.monetization.secondaryCta', 'Review pricing')
      );
    }
    return normaliseInternalAction(
      base,
      '/pricing',
      t('home.monetization.secondaryCta', 'Review pricing')
    );
  }, [monetisationBlock?.secondaryCta, t]);

  const monetisationAnalyticsKey = monetisationBlock?.metadata?.analyticsKey ?? 'monetization-ribbon';

  const initialLeadInvites = useMemo(() => {
    if (!marketingData || !Array.isArray(marketingData.invites)) {
      return [];
    }
    return marketingData.invites;
  }, [marketingData]);
  const defaultLeadEmail = useMemo(() => {
    if (!initialLeadInvites.length) {
      return '';
    }
    return initialLeadInvites[0]?.email ?? '';
  }, [initialLeadInvites]);

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
        features.push(t('home.membership.defaults.feature', 'Transparent commission highlight'));
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
        'Standard commission structure for this channel.'
      );
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
      label: t('home.membership.cta', 'Launch your workspace'),
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
        languageSelector={{
          desktop: <LanguageSelector size="compact" variant="dark" align="end" />, 
          mobile: <LanguageSelector size="compact" variant="dark" align="start" fullWidth />
        }}
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
      <ConversionPanel blockSlug={heroSurfaceId} defaultEmail={defaultLeadEmail} initialInvites={initialLeadInvites} />
      <CaseStudyGrid
        eyebrow={caseStudyEyebrow}
        title={caseStudyTitle}
        caption={caseStudyCaption}
        studies={caseStudies}
      />
      <MonetizationRibbon
        title={monetisationTitle}
        description={monetisationDescription}
        highlights={monetisationHighlights}
        primaryAction={monetisationPrimaryAction}
        secondaryAction={monetisationSecondaryAction}
        analyticsKey={monetisationAnalyticsKey}
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
        cta={planCta}
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
