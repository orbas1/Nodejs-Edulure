const NUMBER_FALLBACK = 0;

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NUMBER_FALLBACK;
}

function toObject(summary) {
  if (!summary) {
    return {};
  }
  if (summary instanceof Map) {
    return Object.fromEntries(summary.entries());
  }
  if (Array.isArray(summary)) {
    return summary.reduce((acc, entry) => {
      if (!entry) {
        return acc;
      }
      const key = typeof entry.type === 'string' ? entry.type.trim() : null;
      if (!key) {
        return acc;
      }
      acc[key] = toNumber(entry.count ?? entry.value ?? NUMBER_FALLBACK);
      return acc;
    }, {});
  }
  if (typeof summary === 'string') {
    try {
      const parsed = JSON.parse(summary);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch (_error) {
      return {};
    }
  }
  if (typeof summary === 'object') {
    return { ...summary };
  }
  return {};
}

function normalise(summary) {
  const source = toObject(summary);
  const breakdown = {};
  for (const [key, value] of Object.entries(source)) {
    if (!key || key === 'total') {
      continue;
    }
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      continue;
    }
    const numeric = Math.max(NUMBER_FALLBACK, Math.round(toNumber(value)));
    if (!numeric) {
      continue;
    }
    breakdown[trimmedKey] = numeric;
  }
  return breakdown;
}

function summarise(summary) {
  const breakdown = normalise(summary);
  const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  return { breakdown, total };
}

function withTotals(summary) {
  const { breakdown, total } = summarise(summary);
  return { ...breakdown, total };
}

function mergeSummaries(...summaries) {
  const aggregate = {};
  summaries.flat(1).forEach((summary) => {
    const breakdown = normalise(summary);
    for (const [type, count] of Object.entries(breakdown)) {
      aggregate[type] = (aggregate[type] ?? NUMBER_FALLBACK) + count;
    }
  });
  return withTotals(aggregate);
}

export default class ReactionAggregationService {
  static normalise(summary) {
    return normalise(summary);
  }

  static summarise(summary) {
    return summarise(summary);
  }

  static withTotals(summary) {
    return withTotals(summary);
  }

  static merge(...summaries) {
    return mergeSummaries(...summaries);
  }
}

export function normaliseReactionSummary(summary) {
  return ReactionAggregationService.normalise(summary);
}

export function summariseReactions(summary) {
  return ReactionAggregationService.summarise(summary);
}

export function withReactionTotals(summary) {
  return ReactionAggregationService.withTotals(summary);
}

export function mergeReactionSummaries(...summaries) {
  return ReactionAggregationService.merge(...summaries);
}
