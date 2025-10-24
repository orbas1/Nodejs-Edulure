import { useMemo } from 'react';

import { useLanguage } from '../context/LanguageContext.jsx';
import {
  buildHeroPayload,
  buildPillarPayload,
  buildStatsPayload,
  selectHeroBlock
} from '../data/marketing/valueProposition.js';
import useMarketingContent from './useMarketingContent.js';

function normaliseData(data) {
  if (!data) {
    return { blocks: [], plans: [], invites: [], testimonials: [] };
  }
  return {
    blocks: Array.isArray(data.blocks) ? data.blocks : [],
    plans: Array.isArray(data.plans) ? data.plans : [],
    invites: Array.isArray(data.invites) ? data.invites : [],
    testimonials: Array.isArray(data.testimonials) ? data.testimonials : []
  };
}

export default function useLandingValueProposition({ surfaces = ['home'], prefetchedData = null } = {}) {
  const { t } = useLanguage();
  const prefilled = normaliseData(prefetchedData);
  const disabled = Boolean(prefetchedData);

  const { data, loading, error } = useMarketingContent({
    surfaces,
    variants: ['hero', 'value-prop', 'stat', 'metric'],
    disabled,
    initialData: prefetchedData
  });

  const blocks = disabled ? prefilled.blocks : data.blocks;

  const heroBlock = useMemo(() => selectHeroBlock(blocks), [blocks]);
  const hero = useMemo(() => buildHeroPayload({ block: heroBlock, t }), [heroBlock, t]);
  const stats = useMemo(() => buildStatsPayload({ blocks, t }), [blocks, t]);
  const pillars = useMemo(() => buildPillarPayload({ blocks, t }), [blocks, t]);

  return {
    hero,
    stats,
    pillars,
    loading: disabled ? false : loading,
    error: disabled ? null : error
  };
}
