import PropTypes from 'prop-types';
import { useMemo } from 'react';

function deriveRecommendations(state, metrics) {
  const recommendations = [];
  if (!state.targetingKeywords && !state.targetingAudiences) {
    recommendations.push('Add at least one keyword or audience to improve targeting.');
  }
  if (!state.placements || state.placements.length === 0) {
    recommendations.push('Select a placement so the campaign has an eligible surface.');
  }
  if (!state.creativeHeadline || !state.creativeDescription) {
    recommendations.push('Complete the creative headline and description for approval.');
  }
  if (state.status === 'active' && metrics?.ctr && metrics.ctr < 0.01) {
    recommendations.push('CTR is below 1%. Consider refreshing the creative or targeting.');
  }
  if (state.status === 'scheduled' && !state.startAt) {
    recommendations.push('Scheduled campaigns need a start date.');
  }
  if (metrics?.pacingStatus === 'over') {
    recommendations.push('Reduce daily budget to stay within pacing forecast.');
  }
  if (metrics?.pacingStatus === 'under') {
    recommendations.push('Increase daily budget or add placements to reach delivery goals.');
  }
  return recommendations.slice(0, 5);
}

export default function CampaignOptimizationChecklist({ state, metrics }) {
  const items = useMemo(() => deriveRecommendations(state, metrics), [state, metrics]);

  if (items.length === 0) {
    return null;
  }

  return (
    <aside className="rounded-3xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-700 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Optimization checklist</h3>
      <ul className="mt-3 space-y-2 list-disc pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  );
}

CampaignOptimizationChecklist.propTypes = {
  state: PropTypes.shape({
    targetingKeywords: PropTypes.string,
    targetingAudiences: PropTypes.string,
    placements: PropTypes.arrayOf(PropTypes.string),
    creativeHeadline: PropTypes.string,
    creativeDescription: PropTypes.string,
    status: PropTypes.string,
    startAt: PropTypes.string
  }).isRequired,
  metrics: PropTypes.shape({
    ctr: PropTypes.number,
    pacingStatus: PropTypes.oneOf(['over', 'under', 'on'])
  })
};

CampaignOptimizationChecklist.defaultProps = {
  metrics: null
};
