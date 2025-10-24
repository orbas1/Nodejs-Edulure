import deepMerge from '../../utils/deepMerge.js';

const TYPE_ACCENT_FALLBACK = {
  course: 'indigo-500',
  ebook: 'emerald-500',
  community: 'amber-500',
  ads_asset: 'rose-500'
};

const ACCENT_LIBRARY = {
  'indigo-500': {
    accent: '#6366f1',
    onAccent: '#ffffff',
    gradient: ['#6366f1', '#8b5cf6'],
    badge: '#4338ca',
    ring: '#c7d2fe'
  },
  'emerald-500': {
    accent: '#10b981',
    onAccent: '#042f2e',
    gradient: ['#10b981', '#34d399'],
    badge: '#047857',
    ring: '#a7f3d0'
  },
  'amber-500': {
    accent: '#f59e0b',
    onAccent: '#0f172a',
    gradient: ['#f59e0b', '#f97316'],
    badge: '#b45309',
    ring: '#fde68a'
  },
  'rose-500': {
    accent: '#f43f5e',
    onAccent: '#ffffff',
    gradient: ['#f43f5e', '#fb7185'],
    badge: '#be123c',
    ring: '#fecdd3'
  },
  default: {
    accent: '#3b82f6',
    onAccent: '#ffffff',
    gradient: ['#3b82f6', '#60a5fa'],
    badge: '#1d4ed8',
    ring: '#bfdbfe'
  }
};

const DEFAULT_LAYOUT_BREAKPOINTS = {
  base: { columns: 1, gap: 16, maxWidth: 720 },
  md: { columns: 2, gap: 20, maxWidth: 1040 },
  lg: { columns: 3, gap: 24, maxWidth: 1440 }
};

const LAYOUT_DENSITY_MAP = new Map([
  ['compact', { padding: 12, stackSpacing: 12 }],
  ['comfortable', { padding: 16, stackSpacing: 16 }],
  ['spacious', { padding: 20, stackSpacing: 20 }]
]);

function ensurePlainObject(value, fallback = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...fallback };
  }
  return { ...fallback, ...value };
}

function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function normaliseAccent(type, value) {
  const candidate = typeof value === 'string' && value.trim().length ? value.trim().toLowerCase() : null;
  if (candidate && ACCENT_LIBRARY[candidate]) {
    return candidate;
  }
  const fallback = TYPE_ACCENT_FALLBACK[type] ?? null;
  if (fallback && ACCENT_LIBRARY[fallback]) {
    return fallback;
  }
  return 'default';
}

function resolveAccentPalette(accentKey) {
  const palette = ACCENT_LIBRARY[accentKey] ?? ACCENT_LIBRARY.default;
  return {
    accentColor: palette.accent,
    onAccent: palette.onAccent,
    gradient: palette.gradient,
    badge: palette.badge,
    ring: palette.ring
  };
}

function normaliseGallery(entries) {
  const list = ensureArray(entries).map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    const id = typeof entry.id === 'string' && entry.id.trim().length ? entry.id.trim() : `gallery-${index}`;
    const type = typeof entry.type === 'string' && entry.type.trim().length ? entry.type.trim() : 'image';
    const url = typeof entry.url === 'string' && entry.url.trim().length ? entry.url.trim() : null;
    const caption = typeof entry.caption === 'string' && entry.caption.trim().length ? entry.caption.trim() : null;
    const order = Number.isFinite(Number(entry.order)) ? Number(entry.order) : index;
    const focalPoint = ensurePlainObject(entry.focalPoint ?? entry.focal_point ?? {}, {});
    return {
      id,
      type,
      url,
      caption,
      order,
      focalPoint: {
        x: Number.isFinite(Number(focalPoint.x)) ? Number(focalPoint.x) : null,
        y: Number.isFinite(Number(focalPoint.y)) ? Number(focalPoint.y) : null
      }
    };
  });

  return list.filter((item) => item && item.url);
}

function normaliseQuickActions(actions) {
  return ensureArray(actions)
    .map((action, index) => {
      if (!action) {
        return null;
      }
      const id = typeof action.id === 'string' && action.id.trim().length ? action.id.trim() : `action-${index}`;
      const label = typeof action.label === 'string' && action.label.trim().length ? action.label.trim() : null;
      const href = typeof action.href === 'string' && action.href.trim().length ? action.href.trim() : null;
      const intent = typeof action.intent === 'string' && action.intent.trim().length ? action.intent.trim() : 'secondary';
      const icon = typeof action.icon === 'string' && action.icon.trim().length ? action.icon.trim() : null;
      if (!label) {
        return null;
      }
      return {
        id,
        label,
        href,
        intent,
        icon
      };
    })
    .filter(Boolean);
}

function normaliseComplianceNotes(notes) {
  return ensureArray(notes)
    .map((note, index) => {
      if (!note) return null;
      const type = typeof note.type === 'string' && note.type.trim().length ? note.type.trim().toLowerCase() : 'policy';
      const message = typeof note.message === 'string' && note.message.trim().length ? note.message.trim() : null;
      if (!message) return null;
      return {
        id: note.id ?? `compliance-${index}`,
        type,
        message,
        updatedAt: toIso(note.updatedAt ?? note.updated_at ?? null)
      };
    })
    .filter(Boolean);
}

function normaliseBreakpointConfig(config, fallback) {
  const source = ensurePlainObject(config, fallback);
  return {
    columns: Number.isFinite(Number(source.columns)) ? Math.max(1, Number(source.columns)) : fallback.columns,
    gap: Number.isFinite(Number(source.gap)) ? Math.max(0, Number(source.gap)) : fallback.gap,
    maxWidth: Number.isFinite(Number(source.maxWidth)) ? Math.max(320, Number(source.maxWidth)) : fallback.maxWidth
  };
}

function normaliseLayout(layout) {
  const base = ensurePlainObject(layout);
  const density = typeof base.density === 'string' && LAYOUT_DENSITY_MAP.has(base.density)
    ? base.density
    : 'comfortable';
  const densityTokens = LAYOUT_DENSITY_MAP.get(density) ?? LAYOUT_DENSITY_MAP.get('comfortable');

  const gridBreakpoints = ensurePlainObject(base.grid?.breakpoints);
  const resolvedBreakpoints = {
    base: normaliseBreakpointConfig(gridBreakpoints.base, DEFAULT_LAYOUT_BREAKPOINTS.base),
    md: normaliseBreakpointConfig(gridBreakpoints.md, DEFAULT_LAYOUT_BREAKPOINTS.md),
    lg: normaliseBreakpointConfig(gridBreakpoints.lg, DEFAULT_LAYOUT_BREAKPOINTS.lg)
  };

  const hero = ensurePlainObject(base.hero, {
    showVideo: false,
    alignment: 'start',
    layout: 'split'
  });

  const sidebar = ensurePlainObject(base.sidebar, {
    placement: 'end',
    width: 'md'
  });

  const gallery = ensurePlainObject(base.gallery, {
    style: 'masonry',
    ratio: '16:9'
  });

  return {
    density,
    tokens: densityTokens,
    grid: {
      breakpoints: resolvedBreakpoints
    },
    hero,
    sidebar,
    gallery
  };
}

function buildLayoutDescriptors(layout) {
  if (!layout) {
    return [];
  }
  const { grid, density, hero, sidebar } = layout;
  const descriptors = [];

  if (grid?.breakpoints) {
    descriptors.push({
      id: 'grid',
      label: 'Responsive grid',
      summary: `${grid.breakpoints.base.columns} column base · ${grid.breakpoints.lg.columns} column desktop`,
      badges: [`gap ${grid.breakpoints.base.gap}px`, `${density} density`]
    });
  }

  if (hero) {
    descriptors.push({
      id: 'hero',
      label: 'Hero layout',
      summary: `${hero.layout === 'split' ? 'Split layout' : 'Stacked content'} with ${hero.alignment} alignment`,
      badges: hero.showVideo ? ['video enabled'] : ['static']
    });
  }

  if (sidebar) {
    descriptors.push({
      id: 'sidebar',
      label: 'Sidebar rail',
      summary: `${sidebar.placement === 'start' ? 'Leading' : 'Trailing'} rail (${sidebar.width})`,
      badges: ['resource anchors']
    });
  }

  return descriptors;
}

function normaliseIngestionMetadata(ingestion) {
  const base = ensurePlainObject(ingestion);
  const stage = typeof base.stage === 'string' && base.stage.trim().length ? base.stage.trim() : 'pending';
  const attempts = Number.isFinite(Number(base.attempts)) ? Math.max(0, Number(base.attempts)) : 0;
  const retryAt = toIso(base.retryAt ?? base.retry_at ?? null);
  const completedAt = toIso(base.completedAt ?? base.completed_at ?? null);
  const lastError = typeof base.lastError === 'string' && base.lastError.trim().length ? base.lastError.trim() : null;
  const jobId = typeof base.jobId === 'string' && base.jobId.trim().length ? base.jobId.trim() : null;

  return {
    stage,
    attempts,
    retryAt,
    completedAt,
    lastError,
    jobId,
    updatedAt: toIso(base.updatedAt ?? base.updated_at ?? Date.now())
  };
}

function normaliseRenditions(renditions) {
  return ensureArray(renditions)
    .map((rendition) => {
      if (!rendition || typeof rendition !== 'object') {
        return null;
      }
      const type = typeof rendition.type === 'string' && rendition.type.trim().length ? rendition.type.trim() : null;
      const key = typeof rendition.storageKey === 'string' && rendition.storageKey.trim().length
        ? rendition.storageKey.trim()
        : typeof rendition.key === 'string' && rendition.key.trim().length
          ? rendition.key.trim()
          : null;
      const bucket = typeof rendition.storageBucket === 'string' && rendition.storageBucket.trim().length
        ? rendition.storageBucket.trim()
        : typeof rendition.bucket === 'string' && rendition.bucket.trim().length
          ? rendition.bucket.trim()
          : null;
      if (!type || !key) {
        return null;
      }
      const sizeBytes = Number.isFinite(Number(rendition.sizeBytes)) ? Number(rendition.sizeBytes) : null;
      const checksum = typeof rendition.checksum === 'string' && rendition.checksum.trim().length
        ? rendition.checksum.trim()
        : null;
      const publicUrl = typeof rendition.publicUrl === 'string' && rendition.publicUrl.trim().length
        ? rendition.publicUrl.trim()
        : typeof rendition.metadata?.publicUrl === 'string' && rendition.metadata.publicUrl.trim().length
          ? rendition.metadata.publicUrl.trim()
          : null;

      return {
        type,
        storageKey: key,
        storageBucket: bucket,
        sizeBytes,
        checksum,
        publicUrl,
        metadata: ensurePlainObject(rendition.metadata)
      };
    })
    .filter(Boolean);
}

export function normaliseCreationMetadata(metadata = {}, { type } = {}) {
  const source = ensurePlainObject(metadata);
  const accentKey = normaliseAccent(type, source.accentColor ?? source.theme?.accentColor);
  const palette = resolveAccentPalette(accentKey);

  const layout = normaliseLayout(source.layout);
  const layoutDescriptors = buildLayoutDescriptors(layout);

  const baseTheme = ensurePlainObject(source.theme);
  const theme = deepMerge(
    {
      accentColor: accentKey,
      surface: baseTheme.surface ?? 'white',
      onAccent: palette.onAccent,
      gradient: palette.gradient,
      badge: palette.badge,
      ring: palette.ring
    },
    baseTheme
  );

  return {
    ...source,
    theme,
    accentColor: accentKey,
    palette,
    layout,
    layoutDescriptors,
    gallery: normaliseGallery(source.gallery ?? source.mediaGallery),
    quickActions: normaliseQuickActions(source.quickActions),
    complianceNotes: normaliseComplianceNotes(source.complianceNotes)
  };
}

export function normaliseAssetMetadata(metadata = {}, options = {}) {
  const source = ensurePlainObject(metadata);
  const { ingestion, renditions, mediaGallery, ...rest } = source;

  const creationMetadata = normaliseCreationMetadata({ ...rest, gallery: rest.gallery ?? mediaGallery }, options);

  return {
    ...creationMetadata,
    ingestion: normaliseIngestionMetadata(ingestion),
    renditions: normaliseRenditions(renditions)
  };
}

export default {
  normaliseCreationMetadata,
  normaliseAssetMetadata
};
