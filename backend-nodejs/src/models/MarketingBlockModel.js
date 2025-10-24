import db from '../config/database.js';

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function normaliseArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value;
  }
  return fallback;
}

function mapRecord(record) {
  if (!record) {
    return null;
  }

  const metadata = parseJson(record.metadata, {});
  const payload = parseJson(record.payload, {});
  const fallbackSurfaces = Array.isArray(metadata.surfaces) ? metadata.surfaces : [];
  const surfaces = parseJson(record.surfaces, fallbackSurfaces);
  const payloadItems = normaliseArray(payload.items, metadata.items ?? metadata.pillars ?? metadata.cards ?? []);
  const payloadMetrics = normaliseArray(payload.metrics, metadata.metrics ?? metadata.stats ?? []);
  const payloadActions = normaliseArray(payload.actions, metadata.actions ?? []);

  return {
    id: record.id,
    slug: record.slug,
    blockType: record.block_type,
    eyebrow: record.eyebrow ?? null,
    title: record.title,
    subtitle: record.subtitle ?? null,
    statusLabel: record.status_label ?? null,
    chips: parseJson(record.chips, []),
    media: parseJson(record.media, {}),
    primaryCta: parseJson(record.primary_cta, {}),
    secondaryCta: parseJson(record.secondary_cta, {}),
    tertiaryCta: parseJson(record.tertiary_cta, {}),
    metadata,
    payload,
    surfaces,
    items: payloadItems,
    metrics: payloadMetrics,
    actions: payloadActions,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class MarketingBlockModel {
  static async list({ types } = {}, connection = db) {
    const query = connection('marketing_blocks').select('*').orderBy('id', 'asc');
    if (Array.isArray(types) && types.length > 0) {
      query.whereIn('block_type', types);
    }
    const rows = await query;
    return rows.map((row) => mapRecord(row)).filter(Boolean);
  }

  static async findBySlug(slug, connection = db) {
    if (!slug) {
      return null;
    }
    const record = await connection('marketing_blocks').where({ slug }).first();
    return mapRecord(record);
  }

  static async upsert(block, connection = db) {
    if (!block?.slug) {
      throw new Error('Marketing block slug is required for upsert');
    }
    const surfacesInput = Array.isArray(block.surfaces)
      ? block.surfaces
      : Array.isArray(block.metadata?.surfaces)
        ? block.metadata.surfaces
        : [];
    const rawPayload = block.payload ?? null;
    const derivedPayload =
      rawPayload ?? (block.items || block.metrics
        ? {
            ...(block.items ? { items: block.items } : {}),
            ...(block.metrics ? { metrics: block.metrics } : {})
          }
        : {});

    const payload = {
      block_type: block.blockType ?? block.block_type ?? 'generic',
      eyebrow: block.eyebrow ?? null,
      title: block.title,
      subtitle: block.subtitle ?? null,
      status_label: block.statusLabel ?? block.status_label ?? null,
      chips: JSON.stringify(block.chips ?? []),
      media: JSON.stringify(block.media ?? {}),
      primary_cta: JSON.stringify(block.primaryCta ?? block.primary_cta ?? {}),
      secondary_cta: JSON.stringify(block.secondaryCta ?? block.secondary_cta ?? {}),
      tertiary_cta: JSON.stringify(block.tertiaryCta ?? block.tertiary_cta ?? {}),
      metadata: JSON.stringify(block.metadata ?? {}),
      payload: JSON.stringify(derivedPayload ?? {}),
      surfaces: JSON.stringify(surfacesInput)
    };
    const existing = await this.findBySlug(block.slug, connection);
    if (existing) {
      await connection('marketing_blocks')
        .where({ slug: block.slug })
        .update({ ...payload, updated_at: connection.fn.now() });
      return this.findBySlug(block.slug, connection);
    }
    await connection('marketing_blocks').insert({ slug: block.slug, ...payload });
    return this.findBySlug(block.slug, connection);
  }
}
