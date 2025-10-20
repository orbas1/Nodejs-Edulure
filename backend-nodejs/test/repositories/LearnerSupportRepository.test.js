import { describe, expect, it } from 'vitest';

import { __testables } from '../../src/repositories/LearnerSupportRepository.js';

const {
  safeParseJsonColumn,
  normaliseAttachmentInput,
  serialiseAttachments,
  serialiseMetadata,
  mapMessage,
  mapCase
} = __testables;

describe('LearnerSupportRepository helpers', () => {
  it('normalises case and message rows from the database', () => {
    const caseRow = {
      id: 42,
      reference: 'SUP-TEST',
      subject: 'Billing help',
      category: 'Billing',
      priority: 'high',
      status: 'open',
      channel: 'Portal',
      satisfaction: null,
      owner: 'agent-1',
      last_agent: 'agent-1',
      metadata: '{"previousTicket":"SUP-001"}',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z'
    };

    const messages = [
      {
        id: 99,
        author: 'learner',
        body: 'Can you help me?',
        attachments: '[{"id":"att-1","name":"invoice.pdf","size":128}]',
        created_at: '2024-01-01T05:00:00.000Z'
      }
    ];

    const normalised = mapCase(caseRow, messages);

    expect(normalised.metadata).toEqual({ previousTicket: 'SUP-001' });
    expect(normalised.messages).toHaveLength(1);
    expect(normalised.messages[0]).toMatchObject({
      id: 99,
      author: 'learner',
      body: 'Can you help me?'
    });
    expect(normalised.messages[0].attachments).toEqual([
      { id: 'att-1', name: 'invoice.pdf', size: 128, url: null, type: null }
    ]);
  });

  it('serialises metadata consistently', () => {
    expect(serialiseMetadata({ key: 'value' })).toEqual('{"key":"value"}');
    expect(serialiseMetadata(' {"key":"value"} ')).toEqual('{"key":"value"}');
    expect(serialiseMetadata('invalid-json')).toEqual('{}');
    expect(serialiseMetadata(undefined)).toBeNull();
    expect(serialiseMetadata(null)).toBeNull();
  });

  it('serialises attachments consistently', () => {
    const attachments = serialiseAttachments([
      { id: 'one', name: 'file.txt', size: 100, url: 'https://cdn.example/file.txt', type: 'text/plain' }
    ]);
    expect(attachments).toBe('[{"id":"one","name":"file.txt","size":100,"url":"https://cdn.example/file.txt","type":"text/plain"}]');
    expect(serialiseAttachments([])).toBe('[]');
    expect(serialiseAttachments(null)).toBe('[]');
  });

  it('normalises attachment input before storage', () => {
    const result = normaliseAttachmentInput([
      { id: 'att-1', filename: 'doc.pdf', bytes: '256', href: 'https://cdn/doc.pdf', mimeType: 'application/pdf' }
    ]);
    expect(result[0]).toMatchObject({
      id: 'att-1',
      name: 'doc.pdf',
      size: 256,
      url: 'https://cdn/doc.pdf',
      type: 'application/pdf'
    });
  });

  it('mapMessage uses safe parsing defaults', () => {
    const message = mapMessage({
      id: 1,
      author: 'support',
      body: 'Resolved',
      attachments: 'not-json',
      created_at: '2024-01-03T00:00:00.000Z'
    });
    expect(message.attachments).toEqual([]);
  });

  it('safeParseJsonColumn falls back when invalid', () => {
    expect(safeParseJsonColumn('[{"id":1}]', [])).toEqual([{ id: 1 }]);
    expect(safeParseJsonColumn('{"ok":true}', {})).toEqual({ ok: true });
    expect(safeParseJsonColumn('invalid', {})).toEqual({});
    expect(safeParseJsonColumn('', [])).toEqual([]);
  });
});
