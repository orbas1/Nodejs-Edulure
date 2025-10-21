import { createHash } from 'node:crypto';

import IntegrationWebhookReceiptModel from '../models/IntegrationWebhookReceiptModel.js';
import logger from '../config/logger.js';

class IntegrationWebhookReceiptService {
  static async recordReceipt({
    provider,
    externalEventId,
    signature,
    rawBody,
    payloadHash,
    receivedAt,
    metadata,
    dedupeTtlSeconds
  }) {
    if (!provider || !externalEventId) {
      throw new Error('Integration webhook receipt requires provider and externalEventId.');
    }

    const normalizedMetadata = metadata && typeof metadata === 'object' ? metadata : {};
    const hash = payloadHash || createHash('sha256').update(rawBody ?? '').digest('hex');
    const recorded = await IntegrationWebhookReceiptModel.recordReceipt({
      provider,
      externalEventId,
      signature,
      payloadHash: hash,
      receivedAt,
      metadata: normalizedMetadata
    });

    if (!recorded.receipt) {
      return { receipt: null, isDuplicate: false };
    }

    const ageSeconds = recorded.receipt.receivedAt
      ? Math.floor((Date.now() - recorded.receipt.receivedAt.getTime()) / 1000)
      : 0;

    const isDuplicate = !recorded.created && (!dedupeTtlSeconds || ageSeconds <= dedupeTtlSeconds);
    if (!recorded.created && isDuplicate) {
      logger.warn(
        {
          provider,
          externalEventId,
          receivedAt: recorded.receipt.receivedAt,
          ageSeconds
        },
        'Duplicate webhook receipt detected'
      );
    }

    return { receipt: recorded.receipt, isDuplicate };
  }

  static async markProcessed(receiptId, { status = 'processed', errorMessage = null } = {}) {
    if (!receiptId) {
      return null;
    }

    return IntegrationWebhookReceiptModel.markProcessed(receiptId, { status, errorMessage });
  }

  static async pruneOlderThan(days = 14) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return IntegrationWebhookReceiptModel.pruneOlderThan(cutoff);
  }

  static async getReceiptSummary(provider, externalEventId) {
    if (!provider || !externalEventId) {
      return null;
    }

    const record = await IntegrationWebhookReceiptModel.findByProviderEvent(provider, externalEventId);
    if (!record) {
      return null;
    }

    return {
      id: record.id,
      provider: record.provider,
      externalEventId: record.externalEventId,
      status: record.status,
      receivedAt: record.receivedAt ? record.receivedAt.toISOString() : null,
      processedAt: record.processedAt ? record.processedAt.toISOString() : null,
      metadata: record.metadata ?? {},
      payloadHash: record.payloadHash
    };
  }
}

export default IntegrationWebhookReceiptService;
