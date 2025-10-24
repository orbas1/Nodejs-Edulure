import { randomUUID } from 'node:crypto';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

import db from '../config/database.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import AssetConversionOutputModel from '../models/AssetConversionOutputModel.js';
import AssetIngestionJobModel from '../models/AssetIngestionJobModel.js';
import ContentAssetModel from '../models/ContentAssetModel.js';
import ContentAuditLogModel from '../models/ContentAuditLogModel.js';
import storageService from './StorageService.js';
import IntegrationProviderService from './IntegrationProviderService.js';
import { normaliseAssetMetadata } from './serializers/creationAssetSerializer.js';

const POLL_INTERVAL_MS = 15000;
const MAX_RETRY_ATTEMPTS = Number(env.assets?.ingestion?.maxAttempts ?? 5);
const BASE_RETRY_DELAY_MS = Number(env.assets?.ingestion?.retryDelayMs ?? 30000);
const MAX_RETRY_DELAY_MS = Number(env.assets?.ingestion?.retryMaxDelayMs ?? 10 * 60 * 1000);

function calculateRetryDelayMs(attempt) {
  const exponent = Math.max(0, attempt - 1);
  const base = Number.isFinite(BASE_RETRY_DELAY_MS) && BASE_RETRY_DELAY_MS > 0 ? BASE_RETRY_DELAY_MS : 30000;
  const maxDelay = Number.isFinite(MAX_RETRY_DELAY_MS) && MAX_RETRY_DELAY_MS > 0 ? MAX_RETRY_DELAY_MS : 10 * 60 * 1000;
  const withoutJitter = Math.min(base * 2 ** exponent, maxDelay);
  const jitter = 0.75 + Math.random() * 0.5;
  return Math.round(withoutJitter * jitter);
}

class AssetIngestionService {
  constructor() {
    this.interval = null;
    this.cloudConvert = IntegrationProviderService.getCloudConvertClient();
  }

  start() {
    if (this.interval) return;
    this.poll().catch((error) => logger.error({ err: error }, 'Initial asset ingestion poll failed'));
    this.interval = setInterval(() => {
      this.poll().catch((error) => logger.error({ err: error }, 'Asset ingestion poll failed'));
    }, POLL_INTERVAL_MS);
    logger.info('Asset ingestion service started');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async poll() {
    const jobs = await db.transaction(async (trx) => {
      const candidates = await AssetIngestionJobModel.takeNextPending(3, trx);
      for (const job of candidates) {
        await AssetIngestionJobModel.markProcessing(job.id, trx);
      }
      return candidates;
    });

    for (const job of jobs) {
      let asset = null;
      try {
        asset = await ContentAssetModel.findById(job.assetId);
        if (!asset) {
          throw new Error(`Asset ${job.assetId} not found for job ${job.id}`);
        }
        if (job.jobType === 'powerpoint-conversion') {
          await this.processPowerpoint(job, asset);
        } else if (job.jobType === 'ebook-normalisation') {
          await this.processEbook(job, asset);
        } else {
          throw new Error(`Unsupported job type ${job.jobType}`);
        }
        await AssetIngestionJobModel.markCompleted(job.id, { processedAt: new Date().toISOString() });
        await ContentAssetModel.markStatus(asset.id, 'ready');
      } catch (error) {
        logger.error({ err: error, jobId: job.id }, 'Failed to process ingestion job');
        const attempts = Number(job.attempts ?? 0) + 1;
        if (attempts >= MAX_RETRY_ATTEMPTS) {
          await AssetIngestionJobModel.markFailed(job.id, error.message);
          await ContentAssetModel.markStatus(job.assetId, 'failed');
        } else {
          const delayMs = calculateRetryDelayMs(attempts);
          const retryAt = new Date(Date.now() + delayMs);
          await AssetIngestionJobModel.scheduleRetry(job.id, {
            lastError: error.message,
            retryAt,
            attempts
          });

          if (asset) {
            const metadata = normaliseAssetMetadata(
              {
                ...(asset.metadata ?? {}),
                ingestion: {
                  ...(asset.metadata?.ingestion ?? {}),
                  stage: 'retrying',
                  attempts,
                  retryAt: retryAt.toISOString(),
                  lastError: error.message
                }
              },
              { type: asset.type }
            );
            await ContentAssetModel.patchById(asset.id, {
              metadata
            });
          }

          logger.info(
            {
              jobId: job.id,
              assetId: job.assetId,
              attempts,
              retryAt: retryAt.toISOString()
            },
            'Scheduled asset ingestion retry'
          );
        }
      }
    }
  }

  async processPowerpoint(job, asset) {
    if (!this.cloudConvert || !this.cloudConvert.isConfigured()) {
      throw new Error('CloudConvert API key is not configured. Cannot process PowerPoint.');
    }
    const sourceSigned = await storageService.createDownloadUrl({
      key: asset.storageKey,
      bucket: asset.storageBucket,
      responseContentDisposition: `attachment; filename="${asset.originalFilename}"`
    });

    const ccJob = await this.cloudConvert.createJob({
      tasks: {
        importSource: {
          operation: 'import/url',
          url: sourceSigned.url
        },
        convertPdf: {
          operation: 'convert',
          input: 'importSource',
          input_format: 'pptx',
          output_format: 'pdf',
          filename: `${asset.publicId}.pdf`
        },
        convertThumbnail: {
          operation: 'convert',
          input: 'importSource',
          input_format: 'pptx',
          output_format: 'png',
          filename: `${asset.publicId}-preview`,
          page_range: '1',
          engine: 'office'
        }
      }
    });

    const completed = await this.cloudConvert.waitForJob(ccJob.id);
    const pdfTask = completed.tasks.find((task) => task.name === 'convertPdf');
    const previewTask = completed.tasks.find((task) => task.name === 'convertThumbnail');
    let previewMetadata = null;

    if (!pdfTask?.result?.files?.length) {
      throw new Error('CloudConvert PDF conversion did not return any files.');
    }

    const pdfFile = pdfTask.result.files[0];
    const pdfResponse = await fetch(pdfFile.url);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download converted PDF: ${pdfResponse.statusText}`);
    }
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    const pdfKey = `${buildPowerpointPrefix(asset)}/renditions/${randomUUID()}.pdf`;
    const pdfUpload = await storageService.uploadBuffer({
      bucket: env.storage.privateBucket,
      key: pdfKey,
      body: pdfBuffer,
      contentType: 'application/pdf'
    });
    await AssetConversionOutputModel.upsert(asset.id, 'pdf', {
      storageKey: pdfKey,
      storageBucket: pdfUpload.bucket,
      checksum: pdfUpload.checksum,
      sizeBytes: pdfBuffer.length,
      metadata: {
        pageCount: pdfTask.result.files.length,
        sourceTaskId: pdfTask.id
      }
    });

    if (previewTask?.result?.files?.length) {
      const previewFile = previewTask.result.files[0];
      const previewResponse = await fetch(previewFile.url);
      if (previewResponse.ok) {
        const previewBuffer = Buffer.from(await previewResponse.arrayBuffer());
        const previewKey = `${buildPowerpointPrefix(asset)}/thumbnail-${Date.now()}.png`;
        await storageService.uploadBuffer({
          bucket: env.storage.publicBucket,
          key: previewKey,
          body: previewBuffer,
          contentType: 'image/png',
          visibility: 'public'
        });
        await AssetConversionOutputModel.upsert(asset.id, 'thumbnail', {
          storageKey: previewKey,
          storageBucket: env.storage.publicBucket,
          checksum: null,
          sizeBytes: previewBuffer.length,
          metadata: {
            publicUrl: storageService.buildPublicUrl({ bucket: env.storage.publicBucket, key: previewKey })
          }
        });
        previewMetadata = {
          key: previewKey,
          url: storageService.buildPublicUrl({ bucket: env.storage.publicBucket, key: previewKey })
        };
      }
    }

    const metadata = normaliseAssetMetadata(
      {
        ...(asset.metadata ?? {}),
        powerpoint: {
          pageCount: pdfTask.result.files.length,
          thumbnail: previewMetadata
        },
        ingestion: {
          stage: 'completed',
          completedAt: new Date().toISOString(),
          jobId: job.id
        }
      },
      { type: asset.type }
    );

    await ContentAssetModel.patchById(asset.id, {
      metadata
    });

    await ContentAuditLogModel.record({
      assetId: asset.id,
      event: 'asset.powerpoint.processed',
      performedBy: asset.createdBy,
      payload: {
        cloudConvertJob: ccJob.id,
        processedAt: new Date().toISOString()
      }
    });
  }

  async processEbook(job, asset) {
    const source = await storageService.downloadToBuffer({
      key: asset.storageKey,
      bucket: asset.storageBucket
    });
    const zip = new AdmZip(source.buffer);
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
    const containerXml = zip.readAsText('META-INF/container.xml');
    const container = parser.parse(containerXml);
    const opfPath = container?.container?.rootfiles?.rootfile?.['full-path'];
    if (!opfPath) {
      throw new Error('Invalid EPUB: missing OPF path');
    }
    const opfContent = zip.readAsText(opfPath);
    const opf = parser.parse(opfContent);
    const metadata = opf?.package?.metadata ?? {};
    const manifestItems = Array.isArray(opf?.package?.manifest?.item)
      ? opf.package.manifest.item
      : [opf?.package?.manifest?.item].filter(Boolean);
    const spineItems = Array.isArray(opf?.package?.spine?.itemref)
      ? opf.package.spine.itemref
      : [opf?.package?.spine?.itemref].filter(Boolean);

    const manifest = manifestItems.map((item) => ({
      id: item.id,
      href: item.href,
      mediaType: item['media-type'],
      properties: item.properties ?? null
    }));
    const readingOrder = spineItems
      .map((item) => manifest.find((manifestItem) => manifestItem.id === item.idref))
      .filter(Boolean);

    const manifestKey = `${buildEbookPrefix(asset)}/manifest-${Date.now()}.json`;
    const manifestBuffer = Buffer.from(
      JSON.stringify(
        {
          metadata: {
            title: metadata['dc:title'] ?? asset.originalFilename,
            creator: metadata['dc:creator'] ?? null,
            language: metadata['dc:language'] ?? null,
            subject: metadata['dc:subject'] ?? null
          },
          manifest,
          spine: readingOrder
        },
        null,
        2
      )
    );

    await storageService.uploadBuffer({
      bucket: env.storage.privateBucket,
      key: manifestKey,
      body: manifestBuffer,
      contentType: 'application/json'
    });

    await AssetConversionOutputModel.upsert(asset.id, 'manifest', {
      storageKey: manifestKey,
      storageBucket: env.storage.privateBucket,
      checksum: null,
      sizeBytes: manifestBuffer.length,
      metadata: {
        chapterCount: readingOrder.length,
        language: metadata['dc:language'] ?? null
      }
    });

    const coverItem = manifestItems.find((item) => (item.properties ?? '').includes('cover-image'));
    if (coverItem) {
      const coverEntry = zip.getEntry(resolveManifestPath(opfPath, coverItem.href));
      if (coverEntry) {
        const coverBuffer = coverEntry.getData();
        const coverKey = `${buildEbookPrefix(asset)}/cover-${Date.now()}.jpg`;
        await storageService.uploadBuffer({
          bucket: env.storage.publicBucket,
          key: coverKey,
          body: coverBuffer,
          contentType: coverItem['media-type'] ?? 'image/jpeg',
          visibility: 'public'
        });
        await AssetConversionOutputModel.upsert(asset.id, 'cover', {
          storageKey: coverKey,
          storageBucket: env.storage.publicBucket,
          checksum: null,
          sizeBytes: coverBuffer.length,
          metadata: {
            publicUrl: storageService.buildPublicUrl({ bucket: env.storage.publicBucket, key: coverKey })
          }
        });
      }
    }

    const metadataPatch = normaliseAssetMetadata(
      {
        ...(asset.metadata ?? {}),
        ebook: {
          title: metadata['dc:title'] ?? asset.originalFilename,
          author: metadata['dc:creator'] ?? null,
          language: metadata['dc:language'] ?? null,
          chapterCount: readingOrder.length,
          manifestKey
        },
        ingestion: {
          stage: 'completed',
          completedAt: new Date().toISOString(),
          jobId: job.id
        }
      },
      { type: asset.type }
    );

    await ContentAssetModel.patchById(asset.id, {
      metadata: metadataPatch
    });

    await ContentAuditLogModel.record({
      assetId: asset.id,
      event: 'asset.ebook.normalised',
      performedBy: asset.createdBy,
      payload: {
        manifestKey,
        processedAt: new Date().toISOString()
      }
    });
  }
}

function buildPowerpointPrefix(asset) {
  return `content/${asset.type}/${asset.publicId}`;
}

function buildEbookPrefix(asset) {
  return `content/${asset.type}/${asset.publicId}`;
}

function resolveManifestPath(opfPath, href) {
  const basePath = opfPath.split('/').slice(0, -1).join('/');
  if (!basePath) return href;
  return `${basePath}/${href}`;
}

const assetIngestionService = new AssetIngestionService();

export default assetIngestionService;
