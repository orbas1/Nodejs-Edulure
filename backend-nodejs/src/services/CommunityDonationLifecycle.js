import db from '../config/database.js';
import CommunityDonationModel from '../models/CommunityDonationModel.js';
import DomainEventModel from '../models/DomainEventModel.js';

function normaliseAmount(value) {
  if (!Number.isFinite(Number(value))) {
    return 0;
  }
  return Number(value);
}

export async function onPaymentSucceeded(intent, connection = db) {
  if (intent.entityType !== 'community_live_donation') {
    return;
  }

  const donation = await CommunityDonationModel.findByPaymentIntent(intent.id, connection);
  if (!donation) {
    return;
  }

  const capturedAt = intent.capturedAt ?? new Date().toISOString();
  await CommunityDonationModel.updateById(
    donation.id,
    {
      status: 'succeeded',
      amountCents: normaliseAmount(intent.amountTotal ?? donation.amountCents),
      currency: intent.currency ?? donation.currency,
      capturedAt,
      metadata: {
        ...donation.metadata,
        latestIntentPublicId: intent.publicId
      }
    },
    connection
  );

  await DomainEventModel.record(
    {
      entityType: 'community_donation',
      entityId: String(donation.id),
      eventType: 'community.donation.completed',
      payload: {
        communityId: donation.communityId,
        paymentIntentId: intent.id,
        amountCents: normaliseAmount(intent.amountTotal ?? donation.amountCents),
        currency: intent.currency ?? donation.currency,
        capturedAt
      },
      performedBy: donation.userId ?? null
    },
    connection
  );
}

export async function onPaymentFailed(intent, connection = db) {
  if (intent.entityType !== 'community_live_donation') {
    return;
  }

  const donation = await CommunityDonationModel.findByPaymentIntent(intent.id, connection);
  if (!donation) {
    return;
  }

  await CommunityDonationModel.updateById(
    donation.id,
    {
      status: 'failed',
      metadata: {
        ...donation.metadata,
        failure: {
          code: intent.failureCode ?? null,
          message: intent.failureMessage ?? null,
          occurredAt: new Date().toISOString()
        }
      }
    },
    connection
  );

  await DomainEventModel.record(
    {
      entityType: 'community_donation',
      entityId: String(donation.id),
      eventType: 'community.donation.failed',
      payload: {
        communityId: donation.communityId,
        paymentIntentId: intent.id,
        failureCode: intent.failureCode ?? null,
        failureMessage: intent.failureMessage ?? null
      },
      performedBy: donation.userId ?? null
    },
    connection
  );
}

export async function onPaymentRefunded(intent, amount, connection = db) {
  if (intent.entityType !== 'community_live_donation') {
    return;
  }

  const donation = await CommunityDonationModel.findByPaymentIntent(intent.id, connection);
  if (!donation) {
    return;
  }

  const metadata = {
    ...donation.metadata,
    lastRefund: {
      amountCents: normaliseAmount(amount),
      occurredAt: new Date().toISOString()
    }
  };

  await CommunityDonationModel.updateById(
    donation.id,
    {
      status: 'refunded',
      metadata
    },
    connection
  );

  await DomainEventModel.record(
    {
      entityType: 'community_donation',
      entityId: String(donation.id),
      eventType: 'community.donation.refunded',
      payload: {
        communityId: donation.communityId,
        paymentIntentId: intent.id,
        amountCents: normaliseAmount(amount)
      },
      performedBy: donation.userId ?? null
    },
    connection
  );
}
