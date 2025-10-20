import { randomUUID } from 'node:crypto';

import db from '../config/database.js';
import ContentAssetModel from '../models/ContentAssetModel.js';
import EbookModel from '../models/EbookModel.js';
import PaymentIntentModel from '../models/PaymentIntentModel.js';
import PaymentService from './PaymentService.js';
import { formatCurrency } from './DashboardService.js';

async function ensureUniqueSlug(title, connection = db) {
  const base = title ?? randomUUID();
  const slugBase = base
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 200);

  let suffix = 0;
  while (suffix < Number.MAX_SAFE_INTEGER) {
    const candidate = suffix === 0 ? slugBase || randomUUID() : `${slugBase}-${suffix}`.slice(0, 220);
    const existing = await connection('ebooks').select('id').where({ slug: candidate }).first();
    if (!existing) {
      return candidate;
    }
    suffix += 1;
  }

  throw new Error('Unable to generate a unique ebook slug');
}

function normaliseArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => Boolean(item)).map((item) => String(item).trim());
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function serialiseEbookToApi(ebook, { downloads = 0, readers = 0, purchases = 0, revenueCents = 0 } = {}) {
  if (!ebook) return null;
  return {
    id: ebook.publicId,
    assetId: ebook.assetId,
    title: ebook.title,
    slug: ebook.slug,
    subtitle: ebook.subtitle,
    description: ebook.description,
    price: {
      currency: ebook.priceCurrency,
      amountCents: Number(ebook.priceAmount ?? 0),
      formatted: formatCurrency(ebook.priceAmount ?? 0, ebook.priceCurrency ?? 'USD')
    },
    readingTimeMinutes: ebook.readingTimeMinutes,
    authors: ebook.authors,
    tags: ebook.tags,
    categories: ebook.categories,
    languages: ebook.languages,
    isbn: ebook.isbn,
    status: ebook.status,
    isPublic: Boolean(ebook.isPublic),
    releaseAt: ebook.releaseAt,
    metadata: ebook.metadata,
    analytics: {
      downloads,
      readers,
      purchases,
      revenueCents,
      revenueFormatted: formatCurrency(revenueCents, ebook.priceCurrency ?? 'USD')
    },
    rating: {
      average: Number(ebook.ratingAverage ?? 0),
      count: Number(ebook.ratingCount ?? 0)
    },
    updatedAt: ebook.updatedAt,
    createdAt: ebook.createdAt
  };
}

function aggregateRevenueByCurrency(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const currency = row.currency ?? 'USD';
    const amount = Number(row.grossCents ?? 0);
    map.set(currency, (map.get(currency) ?? 0) + amount);
  });
  return Array.from(map.entries()).map(([currency, amountCents]) => ({
    currency,
    amountCents,
    formatted: formatCurrency(amountCents, currency)
  }));
}

export default class EbookService {
  static async createListing(userId, payload) {
    return db.transaction(async (trx) => {
      const asset = await ContentAssetModel.findByPublicId(payload.assetId, trx);
      if (!asset) {
        const error = new Error('Content asset not found');
        error.status = 404;
        throw error;
      }

      if (asset.type !== 'ebook') {
        const error = new Error('Only ebook assets can be published as listings');
        error.status = 422;
        throw error;
      }

      if (Number(asset.createdBy) !== Number(userId)) {
        const error = new Error('You do not own this asset');
        error.status = 403;
        throw error;
      }

      const existing = await trx('ebooks').where({ asset_id: asset.id }).first();
      if (existing) {
        const error = new Error('An ebook listing already exists for this asset');
        error.status = 409;
        throw error;
      }

      const slug = payload.slug ? payload.slug : await ensureUniqueSlug(payload.title, trx);
      const ebook = await EbookModel.create(
        {
          publicId: randomUUID(),
          assetId: asset.id,
          title: payload.title,
          slug,
          subtitle: payload.subtitle,
          description: payload.description,
          authors: normaliseArray(payload.authors),
          tags: normaliseArray(payload.tags),
          categories: normaliseArray(payload.categories),
          languages: normaliseArray(payload.languages).length
            ? normaliseArray(payload.languages)
            : ['en'],
          isbn: payload.isbn,
          readingTimeMinutes: payload.readingTimeMinutes ?? 0,
          priceCurrency: (payload.priceCurrency ?? 'USD').toUpperCase(),
          priceAmount: payload.priceAmount ?? 0,
          metadata: payload.metadata ?? {},
          status: payload.status ?? 'draft',
          isPublic: payload.isPublic ?? false,
          releaseAt: payload.releaseAt ?? null
        },
        trx
      );

      return serialiseEbookToApi(ebook, { downloads: 0, readers: 0, purchases: 0, revenueCents: 0 });
    });
  }

  static async updateListing(userId, ebookPublicId, payload) {
    return db.transaction(async (trx) => {
      const ebook = await EbookModel.findByPublicId(ebookPublicId, trx);
      if (!ebook) {
        const error = new Error('Ebook not found');
        error.status = 404;
        throw error;
      }

      const asset = await ContentAssetModel.findById(ebook.assetId, trx);
      if (!asset || Number(asset.createdBy) !== Number(userId)) {
        const error = new Error('You do not have access to modify this ebook');
        error.status = 403;
        throw error;
      }

      const updates = {
        title: payload.title ?? ebook.title,
        subtitle: payload.subtitle ?? ebook.subtitle,
        description: payload.description ?? ebook.description,
        authors: payload.authors ? normaliseArray(payload.authors) : undefined,
        tags: payload.tags ? normaliseArray(payload.tags) : undefined,
        categories: payload.categories ? normaliseArray(payload.categories) : undefined,
        languages: payload.languages ? normaliseArray(payload.languages) : undefined,
        isbn: payload.isbn,
        readingTimeMinutes: payload.readingTimeMinutes,
        priceCurrency: payload.priceCurrency ? payload.priceCurrency.toUpperCase() : undefined,
        priceAmount: payload.priceAmount,
        metadata: payload.metadata ? { ...ebook.metadata, ...payload.metadata } : undefined,
        status: payload.status,
        isPublic: payload.isPublic,
        releaseAt: payload.releaseAt
      };

      const updated = await EbookModel.updateById(ebook.id, updates, trx);
      return serialiseEbookToApi(updated);
    });
  }

  static async setPublicationState(userId, ebookPublicId, { status, isPublic, releaseAt }) {
    return db.transaction(async (trx) => {
      const ebook = await EbookModel.findByPublicId(ebookPublicId, trx);
      if (!ebook) {
        const error = new Error('Ebook not found');
        error.status = 404;
        throw error;
      }

      const asset = await ContentAssetModel.findById(ebook.assetId, trx);
      if (!asset || Number(asset.createdBy) !== Number(userId)) {
        const error = new Error('You do not have access to modify this ebook');
        error.status = 403;
        throw error;
      }

      const payload = {};
      if (status) payload.status = status;
      if (typeof isPublic === 'boolean') payload.isPublic = isPublic;
      if (releaseAt !== undefined) payload.releaseAt = releaseAt;

      const updated = await EbookModel.updateById(ebook.id, payload, trx);
      return serialiseEbookToApi(updated);
    });
  }

  static async listInstructorCatalogue(userId, options = {}) {
    const ebooks = await EbookModel.listByCreator(userId, options, db);
    if (!ebooks.length) {
      return {
        catalogue: [],
        metrics: {
          totalTitles: 0,
          publishedTitles: 0,
          draftTitles: 0,
          revenueByCurrency: [],
          totalDownloads: 0,
          totalReaders: 0
        },
        recentPurchases: []
      };
    }

    const assetIds = ebooks.map((ebook) => ebook.assetId);
    const ebookPublicIds = ebooks.map((ebook) => ebook.publicId);

    const [downloadRows, readerRows, purchaseRows, recentPurchaseRows] = await Promise.all([
      db('content_asset_events')
        .select('asset_id as assetId')
        .count({ total: '*' })
        .whereIn('asset_id', assetIds)
        .andWhere('event_type', 'download')
        .groupBy('asset_id'),
      db('ebook_read_progress')
        .select('asset_id as assetId')
        .count({ total: '*' })
        .whereIn('asset_id', assetIds)
        .groupBy('asset_id'),
      db('payment_intents')
        .select('entity_id as ebookPublicId', 'currency')
        .sum({ grossCents: db.raw('amount_total - amount_refunded') })
        .count({ purchaseCount: '*' })
        .whereIn('entity_id', ebookPublicIds)
        .andWhere('entity_type', 'ebook')
        .andWhere('status', 'succeeded')
        .groupBy('entity_id', 'currency'),
      db('payment_intents as pi')
        .select(
          'pi.entity_id as ebookPublicId',
          'pi.currency',
          'pi.amount_total as amountTotal',
          'pi.amount_refunded as amountRefunded',
          'pi.captured_at as capturedAt',
          'pi.created_at as createdAt'
        )
        .whereIn('pi.entity_id', ebookPublicIds)
        .andWhere('pi.entity_type', 'ebook')
        .andWhere('pi.status', 'succeeded')
        .orderBy('pi.captured_at', 'desc')
        .limit(10)
    ]);

    const downloadMap = new Map(downloadRows.map((row) => [Number(row.assetId), Number(row.total ?? 0)]));
    const readerMap = new Map(readerRows.map((row) => [Number(row.assetId), Number(row.total ?? 0)]));
    const purchaseMap = new Map();
    purchaseRows.forEach((row) => {
      const key = row.ebookPublicId;
      const entry = purchaseMap.get(key) ?? { purchases: 0, revenueCents: 0, currency: row.currency ?? 'USD' };
      entry.purchases += Number(row.purchaseCount ?? 0);
      entry.revenueCents += Number(row.grossCents ?? 0);
      purchaseMap.set(key, entry);
    });

    const catalogue = ebooks.map((ebook) => {
      const downloads = downloadMap.get(Number(ebook.assetId)) ?? 0;
      const readers = readerMap.get(Number(ebook.assetId)) ?? 0;
      const purchaseStats = purchaseMap.get(ebook.publicId) ?? { purchases: 0, revenueCents: 0, currency: ebook.priceCurrency };
      return serialiseEbookToApi(ebook, {
        downloads,
        readers,
        purchases: purchaseStats.purchases,
        revenueCents: purchaseStats.revenueCents
      });
    });

    const revenueByCurrency = aggregateRevenueByCurrency(purchaseRows);
    const totalDownloads = catalogue.reduce((sum, ebook) => sum + (ebook.analytics.downloads ?? 0), 0);
    const totalReaders = catalogue.reduce((sum, ebook) => sum + (ebook.analytics.readers ?? 0), 0);
    const publishedTitles = catalogue.filter((ebook) => ebook.status === 'published').length;
    const draftTitles = catalogue.filter((ebook) => ebook.status === 'draft').length;

    const recentPurchases = recentPurchaseRows.map((row) => ({
      ebookPublicId: row.ebookPublicId,
      amountCents: Number(row.amountTotal ?? 0) - Number(row.amountRefunded ?? 0),
      currency: row.currency ?? 'USD',
      capturedAt: row.capturedAt ?? row.createdAt,
      formatted: formatCurrency(Number(row.amountTotal ?? 0) - Number(row.amountRefunded ?? 0), row.currency ?? 'USD')
    }));

    return {
      catalogue,
      metrics: {
        totalTitles: catalogue.length,
        publishedTitles,
        draftTitles,
        revenueByCurrency,
        totalDownloads,
        totalReaders
      },
      recentPurchases
    };
  }

  static async listMarketplace(options = {}) {
    const normalized = { ...options };
    if (normalized.minPrice !== undefined) normalized.minPrice = Math.max(0, normalized.minPrice);
    if (normalized.maxPrice !== undefined) normalized.maxPrice = Math.max(0, normalized.maxPrice);

    const ebooks = await EbookModel.listMarketplace(normalized, db);
    if (!ebooks.length) {
      return [];
    }

    const assetIds = ebooks.map((ebook) => ebook.assetId);
    const [downloadRows, readerRows, purchaseRows] = await Promise.all([
      db('content_asset_events')
        .select('asset_id as assetId')
        .count({ total: '*' })
        .whereIn('asset_id', assetIds)
        .andWhere('event_type', 'download')
        .groupBy('asset_id'),
      db('ebook_read_progress')
        .select('asset_id as assetId')
        .count({ total: '*' })
        .whereIn('asset_id', assetIds)
        .groupBy('asset_id'),
      db('payment_intents')
        .select('entity_id as ebookPublicId')
        .count({ purchaseCount: '*' })
        .whereIn('entity_id', ebooks.map((ebook) => ebook.publicId))
        .andWhere('entity_type', 'ebook')
        .andWhere('status', 'succeeded')
        .groupBy('entity_id')
    ]);

    const downloadMap = new Map(downloadRows.map((row) => [Number(row.assetId), Number(row.total ?? 0)]));
    const readerMap = new Map(readerRows.map((row) => [Number(row.assetId), Number(row.total ?? 0)]));
    const purchaseMap = new Map(purchaseRows.map((row) => [row.ebookPublicId, Number(row.purchaseCount ?? 0)]));

    return ebooks.map((ebook) =>
      serialiseEbookToApi(ebook, {
        downloads: downloadMap.get(Number(ebook.assetId)) ?? 0,
        readers: readerMap.get(Number(ebook.assetId)) ?? 0,
        purchases: purchaseMap.get(ebook.publicId) ?? 0,
        revenueCents: 0
      })
    );
  }

  static async getEbookDetail(slug) {
    const ebook = await EbookModel.findBySlug(slug, db);
    if (!ebook) {
      const error = new Error('Ebook not found');
      error.status = 404;
      throw error;
    }

    const [downloadCount, readerCount] = await Promise.all([
      db('content_asset_events')
        .count({ total: '*' })
        .where({ asset_id: ebook.assetId, event_type: 'download' })
        .first(),
      db('ebook_read_progress')
        .count({ total: '*' })
        .where({ asset_id: ebook.assetId })
        .first()
    ]);

    return serialiseEbookToApi(ebook, {
      downloads: Number(downloadCount?.total ?? 0),
      readers: Number(readerCount?.total ?? 0),
      purchases: 0,
      revenueCents: 0
    });
  }

  static async createPurchaseIntent(userId, ebookPublicId, payload) {
    const ebook = await EbookModel.findByPublicId(ebookPublicId, db);
    if (!ebook) {
      const error = new Error('Ebook not found');
      error.status = 404;
      throw error;
    }

    if (ebook.status !== 'published' || !ebook.isPublic) {
      const error = new Error('Ebook is not available for purchase');
      error.status = 409;
      throw error;
    }

    if ((ebook.priceAmount ?? 0) <= 0) {
      const error = new Error('This ebook is currently free to access');
      error.status = 409;
      throw error;
    }

    const asset = await ContentAssetModel.findById(ebook.assetId, db);
    if (!asset) {
      const error = new Error('Associated asset is missing');
      error.status = 500;
      throw error;
    }

    const provider = payload.provider?.toLowerCase();
    const request = {
      userId,
      provider,
      currency: ebook.priceCurrency,
      items: [
        {
          id: ebook.publicId,
          name: ebook.title,
          description: ebook.subtitle ?? ebook.description ?? undefined,
          unitAmount: Number(ebook.priceAmount ?? 0),
          quantity: payload.quantity ?? 1,
          metadata: {
            ebookId: ebook.publicId,
            assetId: asset.publicId,
            sellerId: asset.createdBy,
            quantity: payload.quantity ?? 1
          }
        }
      ],
      couponCode: payload.couponCode,
      metadata: {
        ebookId: ebook.publicId,
        ebookTitle: ebook.title,
        assetId: asset.publicId,
        sellerId: asset.createdBy,
        quantity: payload.quantity ?? 1
      },
      entity: {
        id: ebook.publicId,
        type: 'ebook',
        name: ebook.title,
        description: ebook.subtitle ?? ebook.description ?? undefined
      },
      receiptEmail: payload.receiptEmail,
      tax: payload.tax
    };

    if (provider === 'paypal') {
      request.paypal = {
        returnUrl: payload.returnUrl,
        cancelUrl: payload.cancelUrl,
        brandName: payload.brandName ?? 'Edulure Ebooks'
      };
    }

    const payment = await PaymentService.createPaymentIntent(request);
    const intent = await PaymentIntentModel.findByPublicId(payment.paymentId);
    return {
      payment,
      intent: intent ? PaymentService.toApiIntent(intent) : null
    };
  }
}
