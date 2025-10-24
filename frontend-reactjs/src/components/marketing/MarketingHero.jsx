import { useMemo } from 'react';
import PropTypes from 'prop-types';

import useLandingValueProposition from '../../hooks/useLandingValueProposition.js';
import { HERO_ANALYTICS_EVENT } from '../../data/marketing/valueProposition.js';
import { trackEvent } from '../../lib/analytics.js';
import PrimaryHero from './PrimaryHero.jsx';

function buildTrackedAction(action, cta, surface) {
  if (!action) {
    return null;
  }
  return {
    ...action,
    onClick: (event) => {
      if (typeof action.onClick === 'function') {
        action.onClick(event);
      }
      const destination = action.to ?? action.href ?? null;
      trackEvent(HERO_ANALYTICS_EVENT, {
        surface,
        action: cta,
        destination,
        label: action.label,
        analyticsId: action.analyticsId ?? `${cta}-${surface}`
      });
    }
  };
}

export default function MarketingHero({ marketingContent, ...props }) {
  const { hero } = useLandingValueProposition({ prefetchedData: marketingContent });

  const block = props.block ?? hero.block ?? null;
  const eyebrow = props.eyebrow ?? hero.eyebrow;
  const statusLabel = props.statusLabel ?? hero.statusLabel;
  const chips = props.chips ?? hero.chips;
  const headline = props.headline ?? hero.headline;
  const subheadline = props.subheadline ?? hero.subheadline;
  const media = props.media ?? hero.media;
  const mediaCaption = props.mediaCaption ?? hero.mediaCaption;
  const mediaAlt = props.mediaAlt ?? hero.mediaAlt;

  const fallbackPrimaryAction = useMemo(
    () => buildTrackedAction(hero.primaryAction, 'primary', hero.surface),
    [hero.primaryAction, hero.surface]
  );
  const fallbackSecondaryAction = useMemo(
    () => buildTrackedAction(hero.secondaryAction, 'secondary', hero.surface),
    [hero.secondaryAction, hero.surface]
  );
  const fallbackTertiaryAction = useMemo(
    () => buildTrackedAction(hero.tertiaryAction, 'tertiary', hero.surface),
    [hero.tertiaryAction, hero.surface]
  );

  const primaryAction = props.primaryAction ?? fallbackPrimaryAction;
  const secondaryAction = props.secondaryAction ?? fallbackSecondaryAction;
  const tertiaryAction = props.tertiaryAction ?? fallbackTertiaryAction;

  return (
    <PrimaryHero
      {...props}
      block={block}
      eyebrow={eyebrow}
      statusLabel={statusLabel}
      chips={chips}
      headline={headline}
      subheadline={subheadline}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      tertiaryAction={tertiaryAction}
      media={media}
      mediaCaption={mediaCaption}
      mediaAlt={mediaAlt}
    />
  );
}

MarketingHero.propTypes = {
  marketingContent: PropTypes.shape({
    blocks: PropTypes.array,
    plans: PropTypes.array,
    invites: PropTypes.array,
    testimonials: PropTypes.array
  })
};

MarketingHero.defaultProps = {
  marketingContent: null
};
