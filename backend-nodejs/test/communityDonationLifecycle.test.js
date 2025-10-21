import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { onPaymentFailed, onPaymentRefunded, onPaymentSucceeded } from '../src/services/CommunityDonationLifecycle.js';

const communityDonationModelMock = vi.hoisted(() => ({
  findByPaymentIntent: vi.fn(),
  updateById: vi.fn()
}));

const domainEventModelMock = vi.hoisted(() => ({
  record: vi.fn()
}));

vi.mock('../src/models/CommunityDonationModel.js', () => ({
  default: communityDonationModelMock
}));

vi.mock('../src/models/DomainEventModel.js', () => ({
  default: domainEventModelMock
}));

vi.mock('../src/config/database.js', () => ({
  default: 'mockConnection'
}));

const baseIntent = {
  id: 501,
  publicId: 'pi_donation',
  entityType: 'community_live_donation',
  amountTotal: 5500,
  currency: 'usd'
};

const baseDonation = {
  id: 88,
  communityId: 17,
  userId: 42,
  status: 'pending',
  amountCents: 5500,
  currency: 'usd',
  metadata: { source: 'live_event' }
};

describe('CommunityDonationLifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-04-01T12:00:00Z'));
    communityDonationModelMock.findByPaymentIntent.mockReset();
    communityDonationModelMock.updateById.mockReset();
    domainEventModelMock.record.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks donation as succeeded and emits event', async () => {
    communityDonationModelMock.findByPaymentIntent.mockResolvedValue(baseDonation);

    await onPaymentSucceeded({ ...baseIntent, capturedAt: '2024-03-31T10:00:00Z' });

    expect(communityDonationModelMock.updateById).toHaveBeenCalledWith(
      baseDonation.id,
      expect.objectContaining({
        status: 'succeeded',
        amountCents: 5500,
        capturedAt: '2024-03-31T10:00:00Z',
        metadata: expect.objectContaining({ latestIntentPublicId: baseIntent.publicId })
      }),
      'mockConnection'
    );

    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'community_donation',
        eventType: 'community.donation.completed',
        payload: expect.objectContaining({ amountCents: 5500, currency: 'usd' })
      }),
      'mockConnection'
    );
  });

  it('records failure details when payment fails', async () => {
    communityDonationModelMock.findByPaymentIntent.mockResolvedValue(baseDonation);

    await onPaymentFailed({ ...baseIntent, failureCode: 'card_declined', failureMessage: 'Card declined' });

    expect(communityDonationModelMock.updateById).toHaveBeenCalledWith(
      baseDonation.id,
      expect.objectContaining({
        status: 'failed',
        metadata: expect.objectContaining({
          failure: expect.objectContaining({
            code: 'card_declined',
            message: 'Card declined',
            occurredAt: '2024-04-01T12:00:00.000Z'
          })
        })
      }),
      'mockConnection'
    );

    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'community_donation',
        eventType: 'community.donation.failed',
        payload: expect.objectContaining({ failureCode: 'card_declined' })
      }),
      'mockConnection'
    );
  });

  it('marks donation as refunded', async () => {
    communityDonationModelMock.findByPaymentIntent.mockResolvedValue(baseDonation);

    await onPaymentRefunded(baseIntent, '1200');

    expect(communityDonationModelMock.updateById).toHaveBeenCalledWith(
      baseDonation.id,
      expect.objectContaining({
        status: 'refunded',
        metadata: expect.objectContaining({
          lastRefund: expect.objectContaining({
            amountCents: 1200,
            occurredAt: '2024-04-01T12:00:00.000Z'
          })
        })
      }),
      'mockConnection'
    );

    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'community_donation',
        eventType: 'community.donation.refunded',
        payload: expect.objectContaining({ amountCents: 1200 })
      }),
      'mockConnection'
    );
  });

  it('ignores non-donation intents', async () => {
    await onPaymentSucceeded({ ...baseIntent, entityType: 'course_sale' });
    await onPaymentFailed({ ...baseIntent, entityType: 'course_sale' });
    await onPaymentRefunded({ ...baseIntent, entityType: 'course_sale' }, 1000);

    expect(communityDonationModelMock.findByPaymentIntent).not.toHaveBeenCalled();
    expect(communityDonationModelMock.updateById).not.toHaveBeenCalled();
    expect(domainEventModelMock.record).not.toHaveBeenCalled();
  });
});
