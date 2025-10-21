import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordReceiptMock = vi.hoisted(() => vi.fn());
const markProcessedMock = vi.hoisted(() => vi.fn());
const pruneMock = vi.hoisted(() => vi.fn());
const findByProviderEventMock = vi.hoisted(() => vi.fn());

const warnMock = vi.hoisted(() => vi.fn());

vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: warnMock,
    child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }))
  }
}));

vi.mock('../src/models/IntegrationWebhookReceiptModel.js', () => ({
  default: {
    recordReceipt: recordReceiptMock,
    markProcessed: markProcessedMock,
    pruneOlderThan: pruneMock,
    findByProviderEvent: findByProviderEventMock
  }
}));

import IntegrationWebhookReceiptService from '../src/services/IntegrationWebhookReceiptService.js';

describe('IntegrationWebhookReceiptService', () => {
  const now = new Date('2025-02-25T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    warnMock.mockClear();
    recordReceiptMock.mockReset();
    markProcessedMock.mockReset();
    pruneMock.mockReset();
    findByProviderEventMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records a new receipt and derives payload hash when missing', async () => {
    recordReceiptMock.mockResolvedValueOnce({
      created: true,
      receipt: { id: 10, provider: 'stripe', receivedAt: now, payloadHash: 'abc' }
    });

    const result = await IntegrationWebhookReceiptService.recordReceipt({
      provider: 'stripe',
      externalEventId: 'evt_1',
      signature: 'sig',
      rawBody: '{"id":"evt_1"}'
    });

    expect(result).toEqual({ receipt: expect.objectContaining({ id: 10 }), isDuplicate: false });
    expect(recordReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'stripe', externalEventId: 'evt_1', payloadHash: expect.any(String) })
    );
  });

  it('flags duplicate receipts inside the dedupe window', async () => {
    const receivedAt = new Date(now.getTime() - 3_000);
    recordReceiptMock.mockResolvedValueOnce({
      created: false,
      receipt: { id: 11, provider: 'stripe', externalEventId: 'evt_1', receivedAt }
    });

    const result = await IntegrationWebhookReceiptService.recordReceipt({
      provider: 'stripe',
      externalEventId: 'evt_1',
      signature: 'sig',
      rawBody: '',
      dedupeTtlSeconds: 10
    });

    expect(result.isDuplicate).toBe(true);
    expect(warnMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'stripe', externalEventId: 'evt_1', ageSeconds: expect.any(Number) }),
      'Duplicate webhook receipt detected'
    );
  });

  it('returns receipt summary with ISO timestamps', async () => {
    findByProviderEventMock.mockResolvedValueOnce({
      id: 5,
      provider: 'stripe',
      externalEventId: 'evt_2',
      status: 'processed',
      receivedAt: new Date('2025-02-24T11:00:00.000Z'),
      processedAt: new Date('2025-02-24T11:05:00.000Z'),
      metadata: { retries: 1 },
      payloadHash: 'hash'
    });

    const summary = await IntegrationWebhookReceiptService.getReceiptSummary('stripe', 'evt_2');

    expect(summary).toEqual({
      id: 5,
      provider: 'stripe',
      externalEventId: 'evt_2',
      status: 'processed',
      receivedAt: '2025-02-24T11:00:00.000Z',
      processedAt: '2025-02-24T11:05:00.000Z',
      metadata: { retries: 1 },
      payloadHash: 'hash'
    });
  });

  it('marks receipts as processed using the model', async () => {
    markProcessedMock.mockResolvedValueOnce({ id: 7, status: 'processed' });
    const response = await IntegrationWebhookReceiptService.markProcessed(7, { status: 'processed' });
    expect(markProcessedMock).toHaveBeenCalledWith(7, { status: 'processed', errorMessage: null });
    expect(response).toEqual({ id: 7, status: 'processed' });
  });
});
