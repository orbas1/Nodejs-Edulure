import { describe, expect, it } from 'vitest';

import DirectMessageModel from '../src/models/DirectMessageModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('DirectMessageModel', () => {
  it('normalises message type and status during lifecycle updates', async () => {
    const connection = createMockConnection({ direct_messages: [] });

    const created = await DirectMessageModel.create(
      {
        threadId: 3,
        senderId: 4,
        body: 'Hey there',
        messageType: ' SYSTEM ',
        status: 'Delivered??'
      },
      connection
    );

    expect(created.messageType).toBe('system');
    expect(created.status).toBe('sent');

    const delivered = await DirectMessageModel.markDelivered(created.id, new Date('2024-01-02T00:00:00Z'), connection);
    expect(delivered.status).toBe('delivered');

    const read = await DirectMessageModel.markRead(created.id, new Date('2024-01-03T00:00:00Z'), connection);
    expect(read.status).toBe('read');
  });
});
