import PropTypes from 'prop-types';
import clsx from 'clsx';
import { useMemo } from 'react';

import { formatLearningClusterCounts, LEARNING_CLUSTER_TYPES } from '../../utils/learningClusters.js';

function buildExamples(examples = {}) {
  const collected = new Set();
  LEARNING_CLUSTER_TYPES.forEach((type) => {
    (examples[type] ?? []).forEach((example) => {
      if (typeof example === 'string' && collected.size < 3) {
        collected.add(example);
      }
    });
  });
  return Array.from(collected);
}

function aggregateTotals(clusters) {
  const counts = LEARNING_CLUSTER_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {});
  const examples = LEARNING_CLUSTER_TYPES.reduce((acc, type) => {
    acc[type] = [];
    return acc;
  }, {});

  clusters.forEach((cluster) => {
    LEARNING_CLUSTER_TYPES.forEach((type) => {
      const value = cluster.counts?.[type] ?? 0;
      counts[type] += value;
      (cluster.examples?.[type] ?? []).forEach((example) => {
        if (typeof example === 'string' && examples[type].length < 3 && !examples[type].includes(example)) {
          examples[type].push(example);
        }
      });
    });
  });

  const total = Object.values(counts).reduce((acc, value) => acc + value, 0);
  return { counts, examples, total };
}

export default function LearningClusterSummary({ clusters, activeKey = 'all', onSelect, showAllOption = true }) {
  const totals = useMemo(() => aggregateTotals(clusters), [clusters]);

  const cards = useMemo(() => {
    const items = clusters.map((cluster) => ({
      ...cluster,
      counts: cluster.counts ?? {},
      examples: cluster.examples ?? {},
      key: cluster.key
    }));

    if (showAllOption) {
      items.unshift({
        key: 'all',
        label: 'All clusters',
        description: 'Combined signals from the course catalogue, content library and discovery tooling.',
        badgeLabel: 'Overview',
        accentClass: 'text-primary',
        backgroundClass: 'bg-primary/5 border-primary/20',
        counts: totals.counts,
        examples: totals.examples,
        total: totals.total
      });
    }

    return items;
  }, [clusters, showAllOption, totals.counts, totals.examples, totals.total]);

  if (!cards.length) {
    return null;
  }

  const handleSelect = (key) => {
    if (typeof onSelect === 'function') {
      onSelect(key);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((cluster) => {
        const isActive = activeKey === cluster.key || (cluster.key === 'all' && activeKey === 'all');
        const countsLabel = formatLearningClusterCounts(cluster.counts);
        const examples = buildExamples(cluster.examples);
        const isInteractive = typeof onSelect === 'function';
        const Wrapper = isInteractive ? 'button' : 'div';

        return (
          <Wrapper
            key={cluster.key}
            type={isInteractive ? 'button' : undefined}
            onClick={isInteractive ? () => handleSelect(cluster.key) : undefined}
            className={clsx(
              'group relative flex h-full flex-col gap-3 rounded-3xl border p-5 text-left transition',
              cluster.backgroundClass ?? 'bg-white border-slate-200',
              isInteractive && 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
              isInteractive && 'hover:-translate-y-0.5 hover:shadow-lg',
              isActive && 'border-primary/60 bg-white shadow-lg ring-1 ring-primary/40'
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={clsx('text-xs font-semibold uppercase tracking-[0.3em]', cluster.accentClass ?? 'text-slate-500')}>
                {cluster.badgeLabel ?? cluster.label}
              </span>
              <span className="text-xs font-semibold text-slate-400">{countsLabel}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{cluster.label}</h3>
              {cluster.description ? <p className="mt-1 text-sm text-slate-600">{cluster.description}</p> : null}
            </div>
            {examples.length ? (
              <p className="mt-auto text-xs font-semibold text-slate-500">e.g. {examples.join(', ')}</p>
            ) : null}
          </Wrapper>
        );
      })}
    </div>
  );
}

LearningClusterSummary.propTypes = {
  clusters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string,
      counts: PropTypes.object,
      examples: PropTypes.object,
      accentClass: PropTypes.string,
      backgroundClass: PropTypes.string,
      badgeLabel: PropTypes.string
    })
  ).isRequired,
  activeKey: PropTypes.string,
  onSelect: PropTypes.func,
  showAllOption: PropTypes.bool
};
