import { describe, expect, it } from 'vitest';

import PaymentIntentStatusTransitionModel from '../src/models/PaymentIntentStatusTransitionModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('PaymentIntentStatusTransitionModel', () => {
  it('records and lists transitions with normalised metadata', async () => {
    const connection = createMockConnection({ payment_intent_status_transitions: [] });

    const recorded = await PaymentIntentStatusTransitionModel.recordTransition(
      {
        paymentIntentId: 44,
        fromStatus: 'processing',
        toStatus: 'SUCCEEDED',
        changedBy: 9,
        reason: 'automatic capture',
        metadata: { actor: 'system' }
      },
      connection
    );

    expect(recorded.paymentIntentId).toBe(44);
    expect(recorded.fromStatus).toBe('processing');
    expect(recorded.toStatus).toBe('succeeded');
    expect(recorded.metadata).toEqual({ actor: 'system' });

    const listed = await PaymentIntentStatusTransitionModel.listForIntent(44, {}, connection);
    expect(listed).toHaveLength(1);
    expect(listed[0].toStatus).toBe('succeeded');
  });
});
