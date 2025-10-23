import PropTypes from 'prop-types';

import { trackEvent } from '../../lib/analytics.js';
import PrimaryHero from '../marketing/PrimaryHero.jsx';

export default function CommunitiesLandingHero({ onExploreDirectory }) {
  return (
    <PrimaryHero
      eyebrow="Communities"
      title="Bring learners together with trusted spaces and live energy"
      description="Layer private communities, events, and resource drops on top of your courses so learners stay engaged between sessions."
      pills={['Private hubs', 'Events', 'Resource drops']}
      primaryAction={{
        label: 'Explore community directory',
        href: '#community-directory',
        onClick: () => {
          trackEvent('cta_click', {
            location: 'communities_hero_primary'
          });
          onExploreDirectory?.();
        }
      }}
      secondaryAction={{
        label: 'Download playbook',
        href: 'https://www.edulure.com/assets/edulure-community-playbook.pdf',
        onClick: () =>
          trackEvent('cta_click', {
            location: 'communities_hero_playbook'
          }),
        target: '_blank',
        rel: 'noopener noreferrer'
      }}
      tertiaryAction={{
        label: 'Request moderation audit',
        href: 'mailto:moderation@edulure.com',
        onClick: () =>
          trackEvent('cta_click', {
            location: 'communities_hero_moderation'
          }),
        target: '_blank',
        rel: 'noopener noreferrer'
      }}
      analyticsId="communities-hero"
      mediaSlot={
        <div className="relative grid gap-4 text-white/80">
          <div className="rounded-3xl border border-white/15 bg-white/10 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/50">Live activity</p>
            <div className="mt-3 space-y-3 text-white">
              <div className="flex items-center justify-between">
                <span>Weekly build circle</span>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Live
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>Peer feedback thread</span>
                <span>48 new responses</span>
              </div>
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>Resource drops</span>
                <span>12 new assets</span>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-4 text-xs text-white/70">
            <p className="font-semibold text-white">"The community bundle gave our cohorts a heartbeat between sessions."</p>
            <p className="mt-2">— Revenue Ops Guild</p>
          </div>
        </div>
      }
    />
  );
}

CommunitiesLandingHero.propTypes = {
  onExploreDirectory: PropTypes.func
};

CommunitiesLandingHero.defaultProps = {
  onExploreDirectory: undefined
};
