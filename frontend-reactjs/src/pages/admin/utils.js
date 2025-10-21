const numberFormatter = new Intl.NumberFormat('en-US');
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});
const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto'
});

const currencyFormatters = new Map();

function getCurrencyFormatter(currency = 'USD', options = {}) {
  const cacheKey = `${currency}:${options.minimumFractionDigits ?? '0'}:${options.maximumFractionDigits ?? '0'}`;
  if (!currencyFormatters.has(cacheKey)) {
    currencyFormatters.set(
      cacheKey,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: options.minimumFractionDigits ?? 0,
        maximumFractionDigits: options.maximumFractionDigits ?? 0
      })
    );
  }

  return currencyFormatters.get(cacheKey);
}

function normaliseNumberCandidate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

export function formatNumber(value, { fallback = '0', minimumFractionDigits = 0, maximumFractionDigits = 0 } = {}) {
  const numeric = normaliseNumberCandidate(value);
  if (numeric === null) {
    return fallback;
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits
  }).format(numeric);
}

export function formatCurrency(value, currency = 'USD', options = {}) {
  const numeric = normaliseNumberCandidate(value);
  if (numeric === null) {
    return options.fallback ?? '—';
  }

  const formatter = getCurrencyFormatter(currency, options);
  return formatter.format(numeric / (options.denominator ?? 1));
}

export function formatPercent(value, { precision = 1, allowSigned = false, fallback = '—' } = {}) {
  const numeric = normaliseNumberCandidate(value);
  if (numeric === null) {
    const raw = String(value ?? '').trim();
    return raw ? (raw.includes('%') ? raw : `${raw}%`) : fallback;
  }

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: numeric % 1 === 0 ? 0 : precision,
    maximumFractionDigits: precision
  });
  const prefix = allowSigned && numeric > 0 ? '+' : '';
  return `${prefix}${formatter.format(numeric)}%`;
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return dateTimeFormatter.format(date);
}

export function formatRelativeTime(value, reference = new Date()) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const referenceDate = reference instanceof Date ? reference : new Date(reference);
  const diffMs = date.getTime() - referenceDate.getTime();
  const diffMinutes = Math.round(diffMs / (60 * 1000));

  if (Math.abs(diffMinutes) >= 60 * 24 * 7) {
    return dateTimeFormatter.format(date);
  }

  if (Math.abs(diffMinutes) >= 60) {
    const diffHours = Math.round(diffMinutes / 60);
    return relativeTimeFormatter.format(diffHours, 'hour');
  }

  if (Math.abs(diffMinutes) >= 1) {
    return relativeTimeFormatter.format(diffMinutes, 'minute');
  }

  return 'just now';
}

export function formatDuration(seconds, { fallback = '—' } = {}) {
  const numeric = normaliseNumberCandidate(seconds);
  if (numeric === null) return fallback;
  if (numeric < 60) return `${numeric}s`;
  const minutes = Math.floor(numeric / 60);
  const remaining = numeric % 60;
  if (remaining === 0) return `${minutes}m`;
  return `${minutes}m ${remaining}s`;
}

export function getSeverityStyles(severity) {
  switch (severity) {
    case 'critical':
      return 'bg-rose-100 text-rose-700';
    case 'warning':
      return 'bg-amber-100 text-amber-700';
    case 'info':
      return 'bg-sky-100 text-sky-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function cloneDeep(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

export function isDeepEqual(a, b) {
  if (a === b) {
    return true;
  }

  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (error) {
    return a === b;
  }
}

function normaliseString(value, fallback = '') {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function normaliseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildCommunityLeaderboard(
  communities,
  { numberFormatter: numberFn = formatNumber, currencyFormatter: currencyFn = formatCurrency, percentFormatter = formatPercent } = {}
) {
  const list = Array.isArray(communities) ? communities : [];

  const rows = list
    .map((community, index) => {
      const revenueRaw = normaliseNumberCandidate(community.revenue);
      const subscribersRaw = normaliseNumberCandidate(community.subscribers);
      const shareRaw = normaliseNumberCandidate(community.share);
      const growthRaw = normaliseNumberCandidate(community.growthRate ?? community.trend);

      return {
        id: String(community.id ?? index),
        name: normaliseString(community.name, 'Untitled community'),
        revenueDisplay:
          revenueRaw === null
            ? '—'
            : currencyFn(revenueRaw, community.currency ?? 'USD', { maximumFractionDigits: 0, fallback: '—' }),
        revenueRaw: revenueRaw ?? 0,
        subscribersDisplay:
          subscribersRaw === null ? '—' : numberFn(subscribersRaw, { fallback: '—', maximumFractionDigits: 0 }),
        subscribersRaw: subscribersRaw ?? 0,
        shareDisplay: percentFormatter(shareRaw ?? community.share ?? null, { precision: 1, fallback: '—' }),
        shareRaw: shareRaw ?? 0,
        shareProgress: Math.max(0, Math.min(100, shareRaw ?? 0)),
        trendDisplay:
          growthRaw === null
            ? percentFormatter(community.growthRate ?? community.trend ?? null, {
                precision: 1,
                fallback: '—',
                allowSigned: true
              })
            : percentFormatter(growthRaw, { precision: 1, allowSigned: true, fallback: '—' }),
        trendRaw: growthRaw ?? 0,
        cohort: normaliseString(community.cohort, community.type ?? 'General admission')
      };
    })
    .sort((a, b) => b.revenueRaw - a.revenueRaw || b.subscribersRaw - a.subscribersRaw);

  const totalRevenue = rows.reduce((sum, row) => sum + (row.revenueRaw ?? 0), 0);
  const averageShare = rows.length === 0 ? 0 : rows.reduce((sum, row) => sum + (row.shareRaw ?? 0), 0) / rows.length;
  const topTrend = rows.reduce((max, row) => (row.trendRaw > max ? row.trendRaw : max), Number.NEGATIVE_INFINITY);

  return {
    rows,
    summary: {
      totalRevenue: currencyFn(totalRevenue, 'USD', { maximumFractionDigits: 0, fallback: '—' }),
      averageShare: percentFormatter(averageShare, { precision: 1, fallback: '—' }),
      topTrend: topTrend === Number.NEGATIVE_INFINITY ? '—' : percentFormatter(topTrend, { precision: 1, allowSigned: true })
    }
  };
}

export function buildLaunchTimeline(launches, { now = new Date() } = {}) {
  const list = Array.isArray(launches) ? launches : [];
  const reference = now instanceof Date ? now : new Date(now);

  const timeline = {
    overdue: [],
    today: [],
    upcoming: []
  };

  const summary = {
    total: list.length,
    overdue: 0,
    dueToday: 0,
    upcoming: 0
  };

  list.forEach((launch, index) => {
    const startDate = normaliseDate(launch.startAt ?? launch.startsAt ?? null);
    const displayDate = startDate ? formatDateTime(startDate) : 'Date TBC';
    const relative = launch.startIn ?? launch.startsIn ?? (startDate ? formatRelativeTime(startDate, reference) : 'Schedule pending');

    const item = {
      id: String(launch.id ?? index),
      title: normaliseString(launch.title, 'Untitled launch'),
      community: normaliseString(launch.community, 'Independent cohort'),
      startAt: displayDate,
      relative,
      rawDate: startDate,
      callToAction: launch.callToAction ?? null,
      owner: normaliseString(launch.owner, launch.host ?? '')
    };

    if (!startDate) {
      timeline.upcoming.push({ ...item, status: 'unscheduled' });
      summary.upcoming += 1;
      return;
    }

    const dateOnly = new Date(startDate);
    dateOnly.setHours(0, 0, 0, 0);
    const referenceDate = new Date(reference);
    referenceDate.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() < referenceDate.getTime()) {
      timeline.overdue.push({ ...item, status: 'overdue' });
      summary.overdue += 1;
      return;
    }

    if (dateOnly.getTime() === referenceDate.getTime()) {
      timeline.today.push({ ...item, status: 'today' });
      summary.dueToday += 1;
      return;
    }

    timeline.upcoming.push({ ...item, status: 'upcoming' });
    summary.upcoming += 1;
  });

  return { timeline, summary };
}

export function buildToolingViewModel(tools) {
  const source = tools && typeof tools === 'object' ? tools : {};

  const summary = source.summary ?? {};
  const cards = Array.isArray(summary.cards) ? summary.cards : [];
  const meta = summary.meta ?? {};

  const viewSummary = {
    cards: cards.map((card, index) => {
      const value = normaliseNumberCandidate(card.value);
      const helper = normaliseString(card.helper ?? card.description ?? '', '');
      const isCurrency = card.kind === 'currency' || /\$(\s|\d)/.test(String(card.value ?? ''));
      const isPercent = card.kind === 'percent' || (typeof card.value === 'string' && card.value.includes('%'));

      return {
        id: String(card.id ?? index),
        label: normaliseString(card.label, 'Metric'),
        value: isCurrency
          ? formatCurrency(value ?? card.value ?? '—', card.currency ?? 'USD', {
              maximumFractionDigits: 0,
              fallback: '—'
            })
          : isPercent
            ? formatPercent(value ?? card.value ?? null, { precision: 1, fallback: '—' })
            : value === null
              ? '—'
              : formatNumber(value, { fallback: '—', maximumFractionDigits: value > 99 ? 0 : 1 }),
        helper,
        trend: card.trend != null ? formatPercent(card.trend, { allowSigned: true, precision: 1, fallback: null }) : null
      };
    }),
    meta: {
      pipelineValue: meta.pipelineValue
        ? formatCurrency(meta.pipelineValue, meta.pipelineCurrency ?? 'USD', { maximumFractionDigits: 0 })
        : null,
      occupancy: meta.occupancy ? formatPercent(meta.occupancy, { precision: 1, fallback: null }) : null,
      lastAudit: meta.lastAudit ? formatRelativeTime(meta.lastAudit) : null
    }
  };

  const listing = Array.isArray(source.listing) ? source.listing : [];
  const listingView = listing
    .map((tool, index) => {
      const utilisation = normaliseNumberCandidate(tool.utilisation ?? tool.utilization);
      const availableUnits = normaliseNumberCandidate(tool.availableUnits);
      const totalCapacity = normaliseNumberCandidate(tool.totalCapacity);
      const adoptionVelocity = normaliseNumberCandidate(tool.adoptionVelocity);
      const demandLevel = normaliseNumberCandidate(tool.demandLevel ?? tool.demandScore);
      const healthScore = normaliseNumberCandidate(tool.healthScore);
      const rentalContracts = normaliseNumberCandidate(tool.rentalContracts);
      const value = normaliseNumberCandidate(tool.value);

      return {
        id: String(tool.id ?? index),
        name: normaliseString(tool.name, 'Untitled tool'),
        status: normaliseString(tool.status, 'Planned'),
        lifecycleStage: normaliseString(tool.lifecycleStage, 'Unassigned'),
        category: normaliseString(tool.category, 'Platform tooling'),
        owner: normaliseString(tool.owner, 'TBC'),
        ownerEmail: normaliseString(tool.ownerEmail ?? tool.ownerEmailAddress ?? '', ''),
        utilisation: utilisation === null ? '—' : formatPercent(utilisation, { precision: 0, fallback: '—' }),
        availableUnits: availableUnits === null ? '—' : formatNumber(availableUnits, { fallback: '—' }),
        totalCapacity: totalCapacity === null ? '—' : formatNumber(totalCapacity, { fallback: '—' }),
        adoptionVelocity:
          adoptionVelocity === null
            ? '—'
            : formatNumber(adoptionVelocity, { fallback: '—', maximumFractionDigits: 1 }),
        demandLevel:
          demandLevel === null
            ? tool.demandLevel ?? '—'
            : formatPercent(demandLevel, { precision: 0, fallback: '—' }),
        lastAudit: tool.lastAudit ? formatRelativeTime(tool.lastAudit) : '—',
        healthScore:
          healthScore === null
            ? tool.healthScore ?? '—'
            : formatPercent(healthScore, { precision: 0, fallback: '—' }),
        rentalContracts:
          rentalContracts === null ? '—' : formatNumber(rentalContracts, { fallback: '—', maximumFractionDigits: 0 }),
        value: value === null ? '—' : formatCurrency(value, tool.currency ?? 'USD', { maximumFractionDigits: 0 }),
        searchText: [tool.name, tool.status, tool.lifecycleStage, tool.category, tool.owner]
          .map((part) => String(part ?? '').toLowerCase())
          .join(' ')
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const filters = {
    statuses: Array.from(new Set(listingView.map((entry) => entry.status))).filter(Boolean),
    stages: Array.from(new Set(listingView.map((entry) => entry.lifecycleStage))).filter(Boolean)
  };

  const sales = source.sales ?? {};
  const salesMetrics = sales.metrics ?? {};
  const salesPipeline = Array.isArray(sales.pipeline) ? sales.pipeline : [];

  const salesView = {
    metrics: [
      { id: 'pipelineValue', label: 'Pipeline value', value: salesMetrics.pipelineValue, kind: 'currency' },
      { id: 'winRate', label: 'Win rate', value: salesMetrics.winRate, kind: 'percent' },
      { id: 'averageDealSize', label: 'Avg. deal size', value: salesMetrics.averageDealSize, kind: 'currency' },
      { id: 'cycleTime', label: 'Sales cycle', value: salesMetrics.cycleTime },
      { id: 'renewalRate', label: 'Renewal rate', value: salesMetrics.renewalRate, kind: 'percent' }
    ]
      .map((metric) => ({
        ...metric,
        value:
          metric.kind === 'currency'
            ? formatCurrency(metric.value, salesMetrics.currency ?? 'USD', {
                maximumFractionDigits: metric.id === 'averageDealSize' ? 0 : 0,
                fallback: '—'
              })
            : metric.kind === 'percent'
              ? formatPercent(metric.value, { precision: 1, fallback: '—' })
              : metric.value ?? '—'
      }))
      .filter((metric) => metric.value !== '—'),
    pipeline: salesPipeline.map((stage, index) => ({
      id: String(stage.id ?? index),
      stage: normaliseString(stage.stage, 'Stage pending'),
      deals:
        stage.deals === undefined || stage.deals === null
          ? 'No active deals'
          : `${formatNumber(stage.deals, { fallback: '0' })} deals`,
      velocity: stage.velocity ? stage.velocity : 'Velocity TBC',
      value: stage.value ? formatCurrency(stage.value, stage.currency ?? 'USD', { maximumFractionDigits: 0 }) : '—',
      conversion: formatPercent(stage.conversion, { precision: 1, fallback: '—' })
    })),
    forecast: {
      next30d: sales.forecast?.next30d
        ? formatCurrency(sales.forecast.next30d, sales.forecast.currency ?? 'USD', { maximumFractionDigits: 0 })
        : '—',
      committed: sales.forecast?.committed
        ? formatCurrency(sales.forecast.committed, sales.forecast.currency ?? 'USD', { maximumFractionDigits: 0 })
        : '—',
      upside: sales.forecast?.upside
        ? formatCurrency(sales.forecast.upside, sales.forecast.currency ?? 'USD', { maximumFractionDigits: 0 })
        : '—',
      lastUpdated: sales.forecast?.lastUpdated ? formatRelativeTime(sales.forecast.lastUpdated) : null
    }
  };

  const rental = source.rental ?? {};
  const rentalMetrics = rental.metrics ?? {};
  const rentalView = {
    metrics: {
      occupancy: formatPercent(rentalMetrics.occupancy, { precision: 1, fallback: '—' }),
      activeContracts: rentalMetrics.activeContracts
        ? formatNumber(rentalMetrics.activeContracts, { fallback: '—' })
        : '—',
      averageDuration: rentalMetrics.averageDuration ?? '—',
      expiringSoon: rentalMetrics.expiringSoon
        ? formatNumber(rentalMetrics.expiringSoon, { fallback: '—' })
        : '—'
    },
    active: (Array.isArray(rental.active) ? rental.active : []).map((record, index) => ({
      id: String(record.id ?? index),
      tool: normaliseString(record.tool, 'Unnamed tool'),
      lessee: normaliseString(record.lessee, 'Unassigned'),
      value: record.value ? formatCurrency(record.value, record.currency ?? 'USD', { maximumFractionDigits: 0 }) : '—',
      utilisation: formatPercent(record.utilisation, { precision: 0, fallback: '—' }),
      startAt: record.startAt ? formatDateTime(record.startAt) : 'TBC',
      endAt: record.endAt ? formatDateTime(record.endAt) : 'TBC',
      status: normaliseString(record.status, 'Scheduled'),
      remaining: record.remaining ?? '—'
    })),
    utilisation: {
      topPerformers: (rental.utilisation?.topPerformers ?? []).map((entry, index) => ({
        id: String(entry.id ?? index),
        tool: normaliseString(entry.tool, '—'),
        utilisation: formatPercent(entry.utilisation, { precision: 0, fallback: '—' })
      }))
    },
    expiring: (Array.isArray(rental.expiring) ? rental.expiring : []).map((entry, index) => ({
      id: String(entry.id ?? index),
      tool: normaliseString(entry.tool, '—'),
      owner: normaliseString(entry.owner, '—'),
      expiresAt: entry.expiresAt ? formatDateTime(entry.expiresAt) : 'Date TBC',
      remaining: entry.remaining ?? '—'
    }))
  };

  const management = source.management ?? {};
  const managementView = {
    maintenance: (Array.isArray(management.maintenance) ? management.maintenance : []).map((ticket, index) => ({
      id: String(ticket.id ?? index),
      tool: normaliseString(ticket.tool, '—'),
      owner: normaliseString(ticket.owner, '—'),
      severity: normaliseString(ticket.severity, 'Normal'),
      status: normaliseString(ticket.status, 'Scheduled'),
      updated: ticket.updated ? formatRelativeTime(ticket.updated) : '—'
    })),
    audits: (Array.isArray(management.audits) ? management.audits : []).map((audit, index) => ({
      id: String(audit.id ?? index),
      title: normaliseString(audit.title, 'Audit milestone'),
      owner: normaliseString(audit.owner, '—'),
      status: normaliseString(audit.status, 'Planned'),
      dueAt: audit.dueAt ? formatDateTime(audit.dueAt) : 'TBC'
    })),
    governance: {
      policyCoverage: management.governance?.policyCoverage
        ? formatPercent(management.governance.policyCoverage, { precision: 0, fallback: '—' })
        : '—',
      riskLevel: management.governance?.riskLevel ?? '—',
      incidentsYtd: management.governance?.incidentsYtd
        ? formatNumber(management.governance.incidentsYtd, { fallback: '—' })
        : '—',
      mttr: management.governance?.mttr ?? '—',
      escalationPlaybooks: management.governance?.escalationPlaybooks ?? '—'
    }
  };

  const finalisation = source.finalisation ?? {};
  const finalisationView = {
    readinessScore: finalisation.readinessScore
      ? formatPercent(finalisation.readinessScore, { precision: 0, fallback: '—' })
      : '—',
    checklist: (Array.isArray(finalisation.checklist) ? finalisation.checklist : []).map((item, index) => ({
      id: String(item.id ?? index),
      label: normaliseString(item.label, 'Checklist item'),
      owner: normaliseString(item.owner, '—'),
      status: normaliseString(item.status, 'Draft')
    })),
    communications: (Array.isArray(finalisation.communications) ? finalisation.communications : []).map((item, index) => ({
      id: String(item.id ?? index),
      channel: normaliseString(item.channel, 'Channel TBC'),
      audience: normaliseString(item.audience, '—'),
      status: normaliseString(item.status, 'Draft')
    })),
    pipeline: (Array.isArray(finalisation.pipeline) ? finalisation.pipeline : []).map((item, index) => ({
      id: String(item.id ?? index),
      tool: normaliseString(item.tool, '—'),
      owner: normaliseString(item.owner, '—'),
      stage: normaliseString(item.stage, 'Planned'),
      eta: item.eta ? formatRelativeTime(item.eta) : 'TBC'
    }))
  };

  return {
    summary: viewSummary,
    listing: listingView,
    filters,
    sales: salesView,
    rental: rentalView,
    management: managementView,
    finalisation: finalisationView
  };
}
