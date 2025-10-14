import { randomUUID, createHmac } from 'node:crypto';

import db from '../config/database.js';
import { env } from '../config/env.js';
import AssetConversionOutputModel from '../models/AssetConversionOutputModel.js';
import AssetIngestionJobModel from '../models/AssetIngestionJobModel.js';
import ContentAssetEventModel from '../models/ContentAssetEventModel.js';
import ContentAssetModel from '../models/ContentAssetModel.js';
import ContentAuditLogModel from '../models/ContentAuditLogModel.js';
import EbookProgressModel from '../models/EbookProgressModel.js';
import antivirusService from './AntivirusService.js';
import storageService from './StorageService.js';

const DRM_SIGNATURE_SECRET = env.security.drmSignatureSecret;

function buildStoragePrefix(asset) {
  return `content/${asset.type}/${asset.publicId}`;
}

function buildViewerWatermark(asset, user) {
  const payload = `${asset.publicId}:${user.id}:${Date.now()}`;
  return createHmac('sha256', DRM_SIGNATURE_SECRET).update(payload).digest('base64url');
}

function trimToNull(value, maxLength) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return typeof maxLength === 'number' ? trimmed.slice(0, maxLength) : trimmed;
}

function sanitiseHttpsUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch (_error) {
    return null;
  }
}

function normaliseStringCollection(values, { maxItems, maxLength }) {
  const seen = new Set();
  const result = [];
  for (const value of values ?? []) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const truncated = typeof maxLength === 'number' ? trimmed.slice(0, maxLength) : trimmed;
    const fingerprint = truncated.toLocaleLowerCase();
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    result.push(truncated);
    if (typeof maxItems === 'number' && result.length >= maxItems) break;
  }
  return result;
}

function normaliseGalleryEntries(entries) {
  const items = [];
  for (const entry of entries ?? []) {
    const url = sanitiseHttpsUrl(entry?.url);
    if (!url) continue;
    const caption = trimToNull(entry?.caption, 160);
    const kind = entry?.kind === 'video' ? 'video' : 'image';
    items.push({ url, caption, kind });
    if (items.length >= 8) break;
  }
  return items;
}

export default class AssetService {
  static async createUploadSession({ type, filename, mimeType, size, checksum, userId, visibility = 'workspace' }) {
    const prefix = `uploads/${type}/${userId}`;
    const storageKey = storageService.generateStorageKey(prefix, filename);

    return db.transaction(async (trx) => {
      const upload = await storageService.createUploadUrl({
        key: storageKey,
        contentType: mimeType,
        contentLength: size,
        visibility,
        bucket: env.storage.uploadsBucket
      });

      const asset = await ContentAssetModel.create(
        {
          type,
          originalFilename: filename,
          storageKey: storageKey,
          storageBucket: upload.bucket,
          status: 'uploading',
          visibility,
          checksum: checksum ?? null,
          sizeBytes: size ?? null,
          mimeType: mimeType,
          createdBy: userId,
          metadata: {
            ingestion: {
              stage: 'awaiting-confirmation'
            }
          }
        },
        trx
      );

      await ContentAuditLogModel.record(
        {
          assetId: asset.id,
          event: 'asset.upload_session.created',
          performedBy: userId,
          payload: { filename, mimeType, size }
        },
        trx
      );

      return {
        asset,
        upload
      };
    });
  }

  static async confirmUpload(publicId, { checksum, metadata }, actor) {
    return db.transaction(async (trx) => {
      const asset = await ContentAssetModel.findByPublicId(publicId, trx);
      if (!asset) {
        const error = new Error('Asset not found');
        error.status = 404;
        throw error;
      }
      if (asset.createdBy !== actor.id && actor.role !== 'admin') {
        const error = new Error('You cannot modify this asset');
        error.status = 403;
        throw error;
      }
      if (!['uploading', 'draft', 'failed'].includes(asset.status)) {
        const error = new Error('Asset is already processed');
        error.status = 409;
        throw error;
      }

      const objectHead = await storageService.headObject({
        bucket: asset.storageBucket,
        key: asset.storageKey
      });

      const scanResult = await antivirusService.scanObject({
        bucket: asset.storageBucket,
        key: asset.storageKey,
        sizeBytes: Number(objectHead?.ContentLength ?? asset.sizeBytes ?? 0),
        metadata: objectHead?.Metadata ?? {},
        assetId: asset.id,
        userId: actor.id,
        mimeType: asset.mimeType ?? objectHead?.ContentType ?? undefined
      });

      const antivirusMetadata = {
        status: scanResult.status,
        scannedAt: scanResult.scannedAt,
        engine: scanResult.engine,
        signature: scanResult.signature,
        reason: scanResult.reason,
        bytesScanned: scanResult.bytesScanned,
        durationSeconds: scanResult.durationSeconds,
        cacheHit: Boolean(scanResult.cached)
      };

      await ContentAuditLogModel.record(
        {
          assetId: asset.id,
          event: 'asset.antivirus.scan',
          performedBy: actor.id,
          payload: antivirusMetadata
        },
        trx
      );

      if (scanResult.status === 'infected') {
        const quarantineBucket = env.antivirus?.quarantineBucket ?? env.storage.privateBucket;
        const quarantineKey = `${buildStoragePrefix(asset)}/quarantine-${randomUUID()}`;
        const { bucket: quarantinedBucket, key: quarantinedKey } = await storageService.copyObject({
          sourceBucket: asset.storageBucket,
          sourceKey: asset.storageKey,
          destinationBucket: quarantineBucket,
          destinationKey: quarantineKey
        });

        await storageService.deleteObject({ bucket: asset.storageBucket, key: asset.storageKey });

        const quarantinedMetadata = {
          ...(asset.metadata ?? {}),
          ingestion: {
            stage: 'quarantined',
            quarantinedAt: new Date().toISOString()
          },
          antivirus: {
            ...antivirusMetadata,
            quarantineLocation: {
              bucket: quarantinedBucket,
              key: quarantinedKey
            }
          }
        };

        await ContentAssetModel.patchById(
          asset.id,
          {
            status: 'quarantined',
            storageBucket: quarantinedBucket,
            storageKey: quarantinedKey,
            checksum: checksum ?? asset.checksum,
            metadata: quarantinedMetadata
          },
          trx
        );

        await ContentAssetEventModel.record(
          {
            assetId: asset.id,
            userId: actor.id,
            eventType: 'antivirus_detected',
            metadata: {
              signature: scanResult.signature,
              reason: scanResult.reason,
              bytesScanned: scanResult.bytesScanned
            }
          },
          trx
        );

        await ContentAuditLogModel.record(
          {
            assetId: asset.id,
            event: 'asset.antivirus.quarantined',
            performedBy: actor.id,
            payload: {
              signature: scanResult.signature,
              quarantineBucket: quarantinedBucket,
              quarantineKey: quarantinedKey
            }
          },
          trx
        );

        const violation = new Error('Upload blocked: malware detected in the uploaded file.');
        violation.status = 422;
        violation.code = 'ANTIVIRUS_DETECTED';
        violation.details = [scanResult.signature ?? 'malicious content detected'];
        throw violation;
      }

      const targetKey = `${buildStoragePrefix(asset)}/source-${randomUUID()}`;
      const { bucket: destinationBucket, key: destinationKey } = await storageService.copyObject({
        sourceBucket: asset.storageBucket,
        sourceKey: asset.storageKey,
        destinationBucket: env.storage.privateBucket,
        destinationKey: targetKey
      });

      await storageService.deleteObject({ bucket: asset.storageBucket, key: asset.storageKey });

      const updatedAsset = await ContentAssetModel.patchById(
        asset.id,
        {
          status: 'uploaded',
          storageBucket: destinationBucket,
          storageKey: destinationKey,
          checksum: checksum ?? asset.checksum,
          metadata: {
            ...(asset.metadata ?? {}),
            uploadConfirmedAt: new Date().toISOString(),
            ingestion: {
              stage: 'queued',
              queuedAt: new Date().toISOString()
            },
            antivirus: antivirusMetadata,
            custom: metadata ?? {}
          }
        },
        trx
      );

      await ContentAssetEventModel.record(
        {
          assetId: asset.id,
          userId: actor.id,
          eventType: 'antivirus_clean',
          metadata: {
            status: scanResult.status,
            bytesScanned: scanResult.bytesScanned,
            durationSeconds: scanResult.durationSeconds
          }
        },
        trx
      );

      await ContentAuditLogModel.record(
        {
          assetId: asset.id,
          event: 'asset.upload.confirmed',
          performedBy: actor.id,
          payload: {
            checksum: checksum ?? asset.checksum,
            antivirus: antivirusMetadata
          }
        },
        trx
      );

      const requiresIngestion = updatedAsset.type === 'powerpoint' || updatedAsset.type === 'ebook';
      if (requiresIngestion) {
        const jobType = updatedAsset.type === 'powerpoint' ? 'powerpoint-conversion' : 'ebook-normalisation';
        await AssetIngestionJobModel.create(
          {
            assetId: updatedAsset.id,
            jobType,
            status: 'pending'
          },
          trx
        );
        await ContentAssetModel.markStatus(updatedAsset.id, 'processing', trx);
      } else {
        await ContentAssetModel.markStatus(updatedAsset.id, 'ready', trx);
      }

      return ContentAssetModel.findById(updatedAsset.id, trx);
    });
  }

  static async listAssets({ userId, role, page = 1, pageSize = 20, status, type }) {
    const offset = (page - 1) * pageSize;
    const isElevated = role === 'admin' || role === 'instructor';
    const assets = await ContentAssetModel.list({
      createdBy: role === 'admin' ? undefined : isElevated ? userId : undefined,
      status: status ?? (isElevated ? undefined : 'ready'),
      visibility: role === 'admin' ? undefined : isElevated ? undefined : 'public',
      type,
      limit: pageSize,
      offset
    });
    const enriched = await Promise.all(
      assets.map(async (asset) => ({
        ...asset,
        outputs: await AssetConversionOutputModel.listByAsset(asset.id)
      }))
    );
    return {
      data: enriched,
      pagination: {
        page,
        pageSize,
        hasMore: enriched.length === pageSize
      }
    };
  }

  static async getAsset(publicId) {
    const asset = await ContentAssetModel.findByPublicId(publicId);
    if (!asset) {
      const error = new Error('Asset not found');
      error.status = 404;
      throw error;
    }
    const outputs = await AssetConversionOutputModel.listByAsset(asset.id);
    const auditTrail = await ContentAuditLogModel.listForAsset(asset.id);
    return { ...asset, outputs, auditTrail };
  }

  static async issueViewerToken(publicId, actor) {
    const asset = await ContentAssetModel.findByPublicId(publicId);
    if (!asset) {
      const error = new Error('Asset not found');
      error.status = 404;
      throw error;
    }
    const isOwner = asset.createdBy === actor.id;
    if (asset.visibility === 'private' && !isOwner && actor.role !== 'admin') {
      const error = new Error('You do not have access to this asset');
      error.status = 403;
      throw error;
    }
    if (asset.visibility === 'workspace' && actor.role === 'user') {
      const error = new Error('This asset is restricted to workspace members');
      error.status = 403;
      throw error;
    }
    if (!['ready', 'published'].includes(asset.status)) {
      const error = new Error('Asset is not ready for viewing');
      error.status = 409;
      throw error;
    }

    const analyticsEvent = asset.type === 'ebook' ? 'ebook.view' : 'powerpoint.view';
    await ContentAssetEventModel.record({
      assetId: asset.id,
      userId: actor.id,
      eventType: 'view',
      metadata: { actorRole: actor.role, event: analyticsEvent }
    });

    let outputKey = asset.storageKey;
    let outputBucket = asset.storageBucket;
    let contentType = asset.mimeType;
    if (asset.type === 'powerpoint') {
      const pdfOutput = await AssetConversionOutputModel.findByAssetAndFormat(asset.id, 'pdf');
      if (!pdfOutput) {
        const error = new Error('Converted PowerPoint asset missing. Please reprocess.');
        error.status = 409;
        throw error;
      }
      outputKey = pdfOutput.storageKey;
      outputBucket = pdfOutput.storageBucket;
      contentType = 'application/pdf';
    }

    if (asset.type === 'ebook') {
      const downloads = await ContentAssetEventModel.countDownloadsForUser(asset.id, actor.id);
      if (downloads >= env.drm.downloadLimit) {
        const error = new Error('Download limit reached for this ebook. Contact support for assistance.');
        error.status = 429;
        throw error;
      }
    }

    const signed = await storageService.createDownloadUrl({
      key: outputKey,
      bucket: outputBucket,
      responseContentDisposition: `inline; filename="${asset.originalFilename}"`
    });

    const watermark = buildViewerWatermark(asset, actor);

    return {
      url: signed.url,
      expiresAt: signed.expiresAt,
      watermark,
      contentType,
      asset: {
        id: asset.publicId,
        type: asset.type,
        title: asset.metadata?.title ?? asset.originalFilename,
        visibility: asset.visibility
      }
    };
  }

  static async updateMetadata(publicId, payload, actor) {
    return db.transaction(async (trx) => {
      const asset = await ContentAssetModel.findByPublicId(publicId, trx);
      if (!asset) {
        const error = new Error('Asset not found');
        error.status = 404;
        throw error;
      }

      const isOwner = asset.createdBy === actor.id;
      if (!isOwner && actor.role !== 'admin') {
        const error = new Error('You cannot update this material');
        error.status = 403;
        throw error;
      }

      const existingMetadata = typeof asset.metadata === 'object' && asset.metadata
        ? { ...asset.metadata }
        : {};
      const existingCustom = typeof existingMetadata.custom === 'object' && existingMetadata.custom
        ? { ...existingMetadata.custom }
        : {};
      const updatedCustom = { ...existingCustom };
      const updatedFields = [];
      const eventMetadata = {};

      if (payload.title !== undefined) {
        updatedCustom.title = trimToNull(payload.title, 140);
        updatedFields.push('title');
      }
      if (payload.description !== undefined) {
        updatedCustom.description = trimToNull(payload.description, 1500);
        updatedFields.push('description');
      }

      if (payload.categories !== undefined) {
        const categories = normaliseStringCollection(payload.categories, { maxItems: 12, maxLength: 40 });
        updatedCustom.categories = categories;
        eventMetadata.categories = categories;
        updatedFields.push('categories');
      }

      if (payload.tags !== undefined) {
        const tags = normaliseStringCollection(payload.tags, { maxItems: 24, maxLength: 32 });
        updatedCustom.tags = tags;
        eventMetadata.tags = tags;
        updatedFields.push('tags');
      }

      const existingMedia = typeof existingCustom.media === 'object' && existingCustom.media
        ? { ...existingCustom.media }
        : {};

      if (payload.coverImage !== undefined || payload.gallery !== undefined) {
        const media = { ...existingMedia };
        if (payload.coverImage !== undefined) {
          const coverUrl = sanitiseHttpsUrl(payload.coverImage?.url);
          const coverAlt = trimToNull(payload.coverImage?.alt, 120);
          media.coverImage = coverUrl
            ? {
                url: coverUrl,
                alt: coverAlt
              }
            : null;
        }

        if (payload.gallery !== undefined) {
          media.gallery = normaliseGalleryEntries(payload.gallery);
        }

        updatedCustom.media = media;
        updatedFields.push('media');
      }

      if (payload.showcase !== undefined) {
        const existingShowcase = typeof existingCustom.showcase === 'object' && existingCustom.showcase
          ? { ...existingCustom.showcase }
          : {};
        const showcase = { ...existingShowcase };

        const headline = trimToNull(payload.showcase?.headline, 120);
        if (payload.showcase?.headline !== undefined) {
          showcase.headline = headline;
        }
        const subheadline = trimToNull(payload.showcase?.subheadline, 200);
        if (payload.showcase?.subheadline !== undefined) {
          showcase.subheadline = subheadline;
        }
        const videoUrl = sanitiseHttpsUrl(payload.showcase?.videoUrl);
        if (payload.showcase?.videoUrl !== undefined) {
          showcase.videoUrl = videoUrl;
        }
        const videoPosterUrl = sanitiseHttpsUrl(payload.showcase?.videoPosterUrl);
        if (payload.showcase?.videoPosterUrl !== undefined) {
          showcase.videoPosterUrl = videoPosterUrl;
        }

        const callToActionLabel = trimToNull(payload.showcase?.callToActionLabel, 40);
        const callToActionUrl = sanitiseHttpsUrl(payload.showcase?.callToActionUrl);
        if (payload.showcase?.callToActionLabel !== undefined || payload.showcase?.callToActionUrl !== undefined) {
          if (callToActionLabel || callToActionUrl) {
            showcase.callToAction = {
              label: callToActionLabel,
              url: callToActionUrl
            };
          } else {
            showcase.callToAction = null;
          }
        }

        const badge = trimToNull(payload.showcase?.badge, 32);
        if (payload.showcase?.badge !== undefined) {
          showcase.badge = badge;
        }

        updatedCustom.showcase = showcase;
        updatedFields.push('showcase');
      }

      if (payload.featureFlags !== undefined) {
        const flags = typeof existingCustom.featureFlags === 'object' && existingCustom.featureFlags
          ? { ...existingCustom.featureFlags }
          : {};
        if (payload.featureFlags.showcasePinned !== undefined) {
          flags.showcasePinned = Boolean(payload.featureFlags.showcasePinned);
          eventMetadata.showcasePinned = flags.showcasePinned;
        }
        updatedCustom.featureFlags = flags;
        updatedFields.push('featureFlags');
      }

      updatedCustom.lastUpdatedAt = new Date().toISOString();
      updatedCustom.lastUpdatedBy = actor.id;

      const newMetadata = {
        ...existingMetadata,
        custom: updatedCustom
      };

      const patchPayload = { metadata: newMetadata };
      if (payload.visibility && payload.visibility !== asset.visibility) {
        patchPayload.visibility = payload.visibility;
        eventMetadata.visibility = payload.visibility;
        updatedFields.push('visibility');
      }

      const updatedAsset = await ContentAssetModel.patchById(asset.id, patchPayload, trx);

      await ContentAssetEventModel.record(
        {
          assetId: asset.id,
          userId: actor.id,
          eventType: 'metadata_updated',
          metadata: {
            updatedFields,
            ...eventMetadata
          }
        },
        trx
      );

      await ContentAuditLogModel.record(
        {
          assetId: asset.id,
          event: 'asset.metadata.updated',
          performedBy: actor.id,
          payload: {
            updatedFields,
            metadata: newMetadata
          }
        },
        trx
      );

      return updatedAsset;
    });
  }

  static async recordEvent(publicId, eventType, metadata, actor) {
    const asset = await ContentAssetModel.findByPublicId(publicId);
    if (!asset) {
      const error = new Error('Asset not found');
      error.status = 404;
      throw error;
    }

    if (eventType === 'download' && asset.type === 'ebook') {
      const downloads = await ContentAssetEventModel.countDownloadsForUser(asset.id, actor.id);
      if (downloads >= env.drm.downloadLimit) {
        const error = new Error('Download limit reached for this ebook.');
        error.status = 429;
        throw error;
      }
    }

    await ContentAssetEventModel.record({
      assetId: asset.id,
      userId: actor?.id,
      eventType,
      metadata: {
        ...metadata,
        actorRole: actor?.role
      }
    });
  }

  static async updateProgress(publicId, actor, progress) {
    const asset = await ContentAssetModel.findByPublicId(publicId);
    if (!asset) {
      const error = new Error('Asset not found');
      error.status = 404;
      throw error;
    }
    if (asset.type !== 'ebook') {
      const error = new Error('Progress tracking is only available for ebooks');
      error.status = 422;
      throw error;
    }

    await EbookProgressModel.upsert(
      {
        assetId: asset.id,
        userId: actor.id,
        progressPercent: progress.progressPercent,
        lastLocation: progress.lastLocation,
        timeSpentSeconds: progress.timeSpentSeconds
      },
      db
    );

    await ContentAssetEventModel.record({
      assetId: asset.id,
      userId: actor.id,
      eventType: 'progress',
      metadata: { progressPercent: progress.progressPercent }
    });
  }

  static async getProgress(publicId, actor) {
    const asset = await ContentAssetModel.findByPublicId(publicId);
    if (!asset) {
      const error = new Error('Asset not found');
      error.status = 404;
      throw error;
    }
    if (asset.type !== 'ebook') {
      const error = new Error('Progress tracking is only available for ebooks');
      error.status = 422;
      throw error;
    }
    const progress = await EbookProgressModel.findByAssetAndUser(asset.id, actor.id);
    return progress ?? { progressPercent: 0, lastLocation: null, timeSpentSeconds: 0 };
  }

  static async analytics(publicId) {
    const asset = await ContentAssetModel.findByPublicId(publicId);
    if (!asset) {
      const error = new Error('Asset not found');
      error.status = 404;
      throw error;
    }
    const [events, outputs, progressSummary] = await Promise.all([
      ContentAssetEventModel.aggregateByEvent(asset.id),
      AssetConversionOutputModel.listByAsset(asset.id),
      asset.type === 'ebook'
        ? db('ebook_read_progress')
            .where({ asset_id: asset.id })
            .count({ readers: '*' })
            .avg({ averageProgress: 'progress_percent' })
            .first()
        : Promise.resolve(null)
    ]);
    const progressEvents = await ContentAssetEventModel.latestForAsset(asset.id, 100);
    return {
      asset,
      events,
      outputs,
      recentActivity: progressEvents,
      progressSummary: progressSummary
        ? {
            readers: Number(progressSummary.readers ?? 0),
            averageProgress: Number(progressSummary.averageProgress ?? 0)
          }
        : null
    };
  }
}
