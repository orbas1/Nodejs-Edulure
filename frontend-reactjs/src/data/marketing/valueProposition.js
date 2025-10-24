import heroIllustration from '../../assets/home/hero/flow-five-hero.svg';

import { getMarketingAltText } from '../marketingAltText.js';

const HERO_VARIANTS = ['hero', 'primary-hero', 'marketing-hero', 'value-prop-hero'];
const PILLAR_VARIANTS = ['pillar', 'value-prop', 'feature-pillar', 'feature'];
const STAT_VARIANTS = ['stat', 'metric', 'kpi', 'proof'];

export const HERO_ANALYTICS_EVENT = 'marketing:hero_cta';

export const HERO_VIDEO_SOURCES = [
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

export const HERO_IMAGE_SOURCES = [
  { src: heroIllustration, width: 960 },
  { src: heroIllustration, width: 720 },
  { src: heroIllustration, width: 540 }
];

const HERO_CHIP_KEYS = [
  { key: 'home.hero.chips.operators', fallback: 'Operators in control' },
  { key: 'home.hero.chips.launches', fallback: 'Launches on autopilot' },
  { key: 'home.hero.chips.monetisation', fallback: 'Monetisation connected' },
  { key: 'home.hero.chips.community', fallback: 'Communities that convert' }
];

const HERO_COPY = {
  eyebrow: { key: 'home.hero.eyebrow', fallback: 'Flow 5 marketing OS' },
  statusLabel: { key: 'home.hero.status', fallback: 'Now shipping Annex A16 playbooks' },
  headline: {
    key: 'home.hero.headline',
    fallback: 'Your launch, onboarding, and revenue funnels in one flow'
  },
  subheadline: {
    key: 'home.hero.subheadline',
    fallback:
      'Flow 5 stitches landing pages, onboarding rituals, and live community activations so every campaign converts faster.'
  },
  mediaCaption: {
    key: 'home.hero.media.caption',
    fallback: 'Flow 5 keeps marketing, onboarding, and payouts connected in one workspace.'
  },
  mediaAlt: {
    key: 'home.hero.media.alt',
    fallback: getMarketingAltText(
      'hero.flow-five',
      'Operators orchestrating onboarding, payments, and community sessions inside Flow 5.'
    )
  }
};

const HERO_ACTIONS = {
  primary: {
    key: 'home.hero.ctaPrimary',
    fallback: 'Book a Flow 5 demo',
    to: '/register',
    analyticsId: 'cta-primary'
  },
  secondary: {
    key: 'home.hero.ctaSecondary',
    fallback: 'Explore the product tour',
    to: '/courses',
    analyticsId: 'cta-secondary'
  },
  tertiary: {
    key: 'home.hero.ctaTertiary',
    fallback: 'Download the Annex A16 brief',
    href: '/ebooks',
    analyticsId: 'cta-tertiary'
  }
};

export const VALUE_PROPOSITION_STATS = [
  {
    key: 'communities',
    value: '168+',
    labelKey: 'home.stats.communities.label',
    fallbackLabel: 'Communities launched',
    helperKey: 'home.stats.communities.helper',
    fallbackHelper: 'Across 41 countries and six segments'
  },
  {
    key: 'creators',
    value: '12k+',
    labelKey: 'home.stats.creators.label',
    fallbackLabel: 'Creators monetising',
    helperKey: 'home.stats.creators.helper',
    fallbackHelper: 'Flow 5 operators shipping new offers monthly'
  },
  {
    key: 'retention',
    value: '38%',
    labelKey: 'home.stats.retention.label',
    fallbackLabel: 'Average retention lift',
    helperKey: 'home.stats.retention.helper',
    fallbackHelper: 'Comparing Flow 5 cohorts to pre-launch baselines'
  },
  {
    key: 'knowledge',
    value: '54k',
    labelKey: 'home.stats.knowledge.label',
    fallbackLabel: 'Daily knowledge exchanges',
    helperKey: 'home.stats.knowledge.helper',
    fallbackHelper: 'Across lessons, rituals, and office hours'
  }
];

export const VALUE_PROPOSITION_PILLARS = [
  {
    key: 'programs',
    titleKey: 'home.featureGrid.categories.programs.title',
    helperKey: 'home.featureGrid.categories.programs.helper',
    descriptionKey: 'home.featureGrid.categories.programs.description',
    fallback: {
      title: 'Program blueprints on day one',
      helper: 'Launch cohorts without detours',
      description: 'Assemble Flow 5 templates for curriculum, onboarding, and sponsor funnels the moment you sign in.'
    },
    analyticsId: 'pillar-programs',
    actions: [
      {
        key: 'workspace',
        labelKey: 'home.featureGrid.categories.programs.actions.workspace',
        descriptionKey: 'home.featureGrid.categories.programs.descriptions.workspace',
        fallbackLabel: 'Start a free workspace',
        fallbackDescription: 'Spin up a Flow 5 launch workspace in three minutes.',
        to: '/register',
        badge: 'New',
        analyticsId: 'start-workspace'
      },
      {
        key: 'templates',
        labelKey: 'home.featureGrid.categories.programs.actions.templates',
        descriptionKey: 'home.featureGrid.categories.programs.descriptions.templates',
        fallbackLabel: 'Browse cohort templates',
        fallbackDescription: '150+ outlines for accelerators, bootcamps, and micro-courses.',
        to: '/courses',
        analyticsId: 'browse-templates'
      },
      {
        key: 'community',
        labelKey: 'home.featureGrid.categories.programs.actions.community',
        descriptionKey: 'home.featureGrid.categories.programs.descriptions.community',
        fallbackLabel: 'Tour live communities',
        fallbackDescription: 'See how rituals, prompts, and feedback loops keep cohorts warm.',
        to: '/communities',
        analyticsId: 'tour-communities'
      }
    ]
  },
  {
    key: 'engagement',
    titleKey: 'home.featureGrid.categories.engagement.title',
    helperKey: 'home.featureGrid.categories.engagement.helper',
    descriptionKey: 'home.featureGrid.categories.engagement.description',
    fallback: {
      title: 'Engagement rituals that stick',
      helper: 'Orchestrate live energy',
      description: 'Route live classrooms, async prompts, and nudges with playbooks drawn straight from Annex A16.'
    },
    analyticsId: 'pillar-engagement',
    actions: [
      {
        key: 'live',
        labelKey: 'home.featureGrid.categories.engagement.actions.live',
        descriptionKey: 'home.featureGrid.categories.engagement.descriptions.live',
        fallbackLabel: 'Host live classrooms',
        fallbackDescription: 'Agenda templates, green-room checklists, and live overlays.',
        to: '/live-classrooms',
        analyticsId: 'host-live'
      },
      {
        key: 'automations',
        labelKey: 'home.featureGrid.categories.engagement.actions.automations',
        descriptionKey: 'home.featureGrid.categories.engagement.descriptions.automations',
        fallbackLabel: 'Automate ritual nudges',
        fallbackDescription: 'Keep members on track with moment-based playbooks.',
        to: '/explorer',
        analyticsId: 'automate-rituals'
      },
      {
        key: 'analytics',
        labelKey: 'home.featureGrid.categories.engagement.actions.analytics',
        descriptionKey: 'home.featureGrid.categories.engagement.descriptions.analytics',
        fallbackLabel: 'Review engagement analytics',
        fallbackDescription: 'See sentiment, attendance, and completion trends in one place.',
        to: '/analytics',
        analyticsId: 'review-analytics'
      }
    ]
  },
  {
    key: 'revenue',
    titleKey: 'home.featureGrid.categories.revenue.title',
    helperKey: 'home.featureGrid.categories.revenue.helper',
    descriptionKey: 'home.featureGrid.categories.revenue.description',
    fallback: {
      title: 'Revenue moments without spreadsheets',
      helper: 'Keep payouts transparent',
      description: 'Affiliate, sponsorship, and tutor revenue pipelines roll up under one commission model.'
    },
    analyticsId: 'pillar-revenue',
    actions: [
      {
        key: 'pricing',
        labelKey: 'home.featureGrid.categories.revenue.actions.pricing',
        descriptionKey: 'home.featureGrid.categories.revenue.descriptions.pricing',
        fallbackLabel: 'Review pricing',
        fallbackDescription: 'Flat rates with payout-ready reporting baked in.',
        to: '/pricing',
        analyticsId: 'review-pricing'
      },
      {
        key: 'sponsors',
        labelKey: 'home.featureGrid.categories.revenue.actions.sponsors',
        descriptionKey: 'home.featureGrid.categories.revenue.descriptions.sponsors',
        fallbackLabel: 'Activate sponsors',
        fallbackDescription: 'Bundle sponsor perks into every onboarding flow.',
        href: 'https://docs.edulure.test/flow5/sponsorships',
        analyticsId: 'activate-sponsors'
      },
      {
        key: 'payouts',
        labelKey: 'home.featureGrid.categories.revenue.actions.payouts',
        descriptionKey: 'home.featureGrid.categories.revenue.descriptions.payouts',
        fallbackLabel: 'Open payout dashboard',
        fallbackDescription: 'Monitor revenue, affiliates, and tutor commissions live.',
        to: '/dashboard/instructor/payouts',
        analyticsId: 'open-payouts'
      }
    ]
  }
];

function translate(t, key, fallback) {
  if (typeof key === 'string' && key.length > 0) {
    return t(key, fallback);
  }
  return fallback;
}

function pickVariant(value) {
  if (!value) {
    return '';
  }
  return String(value).toLowerCase();
}

function isHeroBlock(block) {
  const variant = pickVariant(block?.variant ?? block?.blockType ?? block?.type ?? block?.category);
  return HERO_VARIANTS.includes(variant);
}

function isPillarBlock(block) {
  const variant = pickVariant(block?.variant ?? block?.blockType ?? block?.type ?? block?.category);
  return PILLAR_VARIANTS.includes(variant);
}

function isStatBlock(block) {
  const variant = pickVariant(block?.variant ?? block?.blockType ?? block?.type ?? block?.category);
  return STAT_VARIANTS.includes(variant);
}

function normaliseAction(action, fallback, t, { type = 'link' } = {}) {
  if (!fallback) {
    return null;
  }
  const label = translate(t, fallback.labelKey ?? fallback.key, action?.label ?? action?.text ?? fallback.fallbackLabel ?? fallback.fallback);
  if (type === 'link') {
    const to = typeof action?.to === 'string' && action.to.length ? action.to : typeof action?.href === 'string' && action.href.startsWith('/') ? action.href : fallback.to;
    if (!to) {
      return null;
    }
    return { to, label, analyticsId: fallback.analyticsId ?? action?.analyticsId };
  }
  const href = typeof action?.href === 'string' && action.href.length ? action.href : action?.to ?? fallback.href;
  if (!href) {
    return null;
  }
  return { href, label, analyticsId: fallback.analyticsId ?? action?.analyticsId };
}

function ensureMedia(blockMedia, t) {
  if (!blockMedia || typeof blockMedia !== 'object') {
    return {
      type: 'video',
      videoSources: HERO_VIDEO_SOURCES,
      imageSources: HERO_IMAGE_SOURCES,
      poster: heroIllustration,
      caption: translate(t, HERO_COPY.mediaCaption.key, HERO_COPY.mediaCaption.fallback),
      alt: translate(t, HERO_COPY.mediaAlt.key, HERO_COPY.mediaAlt.fallback)
    };
  }
  const caption = blockMedia.caption ?? translate(t, HERO_COPY.mediaCaption.key, HERO_COPY.mediaCaption.fallback);
  const alt = blockMedia.alt ?? translate(t, HERO_COPY.mediaAlt.key, HERO_COPY.mediaAlt.fallback);
  const poster = blockMedia.poster ?? blockMedia.placeholder ?? heroIllustration;
  const videoSources = Array.isArray(blockMedia.videoSources) && blockMedia.videoSources.length
    ? blockMedia.videoSources
    : HERO_VIDEO_SOURCES;
  const imageSources = Array.isArray(blockMedia.imageSources) && blockMedia.imageSources.length
    ? blockMedia.imageSources
    : HERO_IMAGE_SOURCES;
  return {
    ...blockMedia,
    caption,
    alt,
    poster,
    videoSources,
    imageSources
  };
}

function extractPillars(blocks = []) {
  const candidates = blocks.filter(isPillarBlock);
  if (!candidates.length) {
    return [];
  }
  return candidates.flatMap((block) => {
    const items = Array.isArray(block?.items)
      ? block.items
      : Array.isArray(block?.cards)
        ? block.cards
        : Array.isArray(block?.pillars)
          ? block.pillars
          : [];
    if (items.length) {
      return items.map((item) => ({ ...item, variant: block.variant }));
    }
    return block.title || block.helper || block.actions ? [block] : [];
  });
}

function extractMetrics(blocks = []) {
  const candidates = blocks.filter(isStatBlock);
  if (!candidates.length) {
    return [];
  }
  return candidates.flatMap((block) => {
    if (Array.isArray(block?.metrics)) {
      return block.metrics;
    }
    if (Array.isArray(block?.items)) {
      return block.items;
    }
    if (Array.isArray(block?.data?.metrics)) {
      return block.data.metrics;
    }
    if (Array.isArray(block?.metadata?.metrics)) {
      return block.metadata.metrics;
    }
    return block.value || block.label ? [block] : [];
  });
}

export function selectHeroBlock(blocks = []) {
  return blocks.find(isHeroBlock) ?? null;
}

export function buildHeroPayload({ block, t }) {
  const chips = Array.isArray(block?.chips) && block.chips.length
    ? block.chips
    : HERO_CHIP_KEYS.map(({ key, fallback }) => translate(t, key, fallback));

  const primaryAction = normaliseAction(block?.primaryCta, HERO_ACTIONS.primary, t, { type: 'link' });
  const secondaryAction = normaliseAction(block?.secondaryCta, HERO_ACTIONS.secondary, t, { type: 'link' });
  const tertiaryAction = normaliseAction(block?.tertiaryCta, HERO_ACTIONS.tertiary, t, { type: 'anchor' });

  return {
    block: block ?? null,
    surface: block?.slug ?? block?.id ?? 'home-hero',
    eyebrow: translate(t, HERO_COPY.eyebrow.key, block?.eyebrow ?? HERO_COPY.eyebrow.fallback),
    statusLabel: translate(
      t,
      HERO_COPY.statusLabel.key,
      block?.statusLabel ?? HERO_COPY.statusLabel.fallback
    ),
    headline: translate(t, HERO_COPY.headline.key, block?.title ?? block?.headline ?? HERO_COPY.headline.fallback),
    subheadline: translate(t, HERO_COPY.subheadline.key, block?.subtitle ?? HERO_COPY.subheadline.fallback),
    chips,
    media: ensureMedia(block?.media, t),
    mediaCaption: translate(t, HERO_COPY.mediaCaption.key, block?.media?.caption ?? HERO_COPY.mediaCaption.fallback),
    mediaAlt: translate(t, HERO_COPY.mediaAlt.key, block?.media?.alt ?? HERO_COPY.mediaAlt.fallback),
    primaryAction,
    secondaryAction,
    tertiaryAction
  };
}

export function buildStatsPayload({ blocks, t, fallback = VALUE_PROPOSITION_STATS }) {
  const remote = extractMetrics(blocks);
  const source = remote.length ? remote : fallback;
  return source
    .map((entry, index) => {
      const key = entry.key ?? entry.id ?? `stat-${index}`;
      const value = entry.value ?? entry.stat ?? entry.score ?? fallback[index]?.value ?? '';
      const label = translate(t, entry.labelKey ?? fallback[index]?.labelKey, entry.label ?? entry.title ?? fallback[index]?.fallbackLabel ?? '');
      const helper = translate(
        t,
        entry.helperKey ?? fallback[index]?.helperKey,
        entry.helper ?? entry.caption ?? entry.description ?? fallback[index]?.fallbackHelper ?? ''
      );
      if (!label || !value) {
        return null;
      }
      return {
        key,
        value,
        label,
        helper
      };
    })
    .filter(Boolean);
}

export function buildPillarPayload({ blocks, t, fallback = VALUE_PROPOSITION_PILLARS }) {
  const remote = extractPillars(blocks);
  if (!remote.length) {
    return fallback.map((pillar) => ({
      key: pillar.key,
      title: translate(t, pillar.titleKey, pillar.fallback.title),
      helper: translate(t, pillar.helperKey, pillar.fallback.helper),
      description: translate(t, pillar.descriptionKey, pillar.fallback.description),
      analyticsId: pillar.analyticsId,
      actions: pillar.actions
        .map((action, index) => {
          const resolved = normaliseAction({}, { ...action, fallbackLabel: action.fallbackLabel }, t, {
            type: action.href ? 'anchor' : 'link'
          });
          if (!resolved) {
            return null;
          }
          return {
            key: action.key ?? `${pillar.key}-${index}`,
            ...resolved,
            description: translate(t, action.descriptionKey, action.fallbackDescription),
            badge: action.badge ?? null,
            analyticsId: resolved.analyticsId ?? action.analyticsId ?? null
          };
        })
        .filter(Boolean)
    }));
  }

  return fallback.map((pillarFallback) => {
    const match = remote.find(
      (item) => pickVariant(item.key) === pillarFallback.key || pickVariant(item.slug) === pillarFallback.key
    );
    const actionsSource = Array.isArray(match?.actions)
      ? match.actions
      : Array.isArray(match?.links)
        ? match.links
        : pillarFallback.actions;
    return {
      key: pillarFallback.key,
      title: translate(t, pillarFallback.titleKey, match?.title ?? match?.name ?? pillarFallback.fallback.title),
      helper: translate(t, pillarFallback.helperKey, match?.helper ?? match?.eyebrow ?? pillarFallback.fallback.helper),
      description: translate(
        t,
        pillarFallback.descriptionKey,
        match?.description ?? match?.summary ?? pillarFallback.fallback.description
      ),
      analyticsId: pillarFallback.analyticsId,
      actions: actionsSource
        .map((action, index) => {
          const fallbackAction = pillarFallback.actions.find((item) => item.key === action.key) ?? pillarFallback.actions[index] ?? pillarFallback.actions[0];
          const type = action.href && !action.to ? 'anchor' : fallbackAction?.href ? 'anchor' : 'link';
          const resolved = normaliseAction(action, { ...fallbackAction, fallbackLabel: fallbackAction?.fallbackLabel }, t, {
            type
          });
          if (!resolved) {
            return null;
          }
          return {
            key: action.key ?? fallbackAction?.key ?? `${pillarFallback.key}-${index}`,
            ...resolved,
            description: translate(
              t,
              fallbackAction?.descriptionKey,
              action.description ?? action.caption ?? fallbackAction?.fallbackDescription ?? ''
            ),
            badge: action.badge ?? fallbackAction?.badge ?? null,
            analyticsId: action.analyticsId ?? resolved.analyticsId ?? fallbackAction?.analyticsId ?? null
          };
        })
        .filter(Boolean)
    };
  });
}
