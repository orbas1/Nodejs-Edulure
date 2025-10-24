import { describe, expect, it } from 'vitest';

import { __testables } from '../../src/repositories/LearnerSupportRepository.js';

const {
  parseJson,
  normaliseAttachmentInput,
  normaliseListOptions,
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
      escalation_breadcrumbs:
        '[{"id":"crumb-1","actor":"learner","label":"Ticket created","at":"2024-01-01T00:00:00.000Z"},' +
        '{"label":"Escalated","note":"Routed to ops","at":"2024-01-01T02:00:00.000Z"}]',
      knowledge_suggestions: '[{"id":"kb-1","title":"Reset your billing cycle","minutes":4}]',
      ai_summary: 'Learner reported “Billing help”. Priority: high.',
      follow_up_due_at: '2024-01-02T06:00:00.000Z',
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
    expect(normalised.aiSummary).toBe('Learner reported “Billing help”. Priority: high.');
    expect(normalised.followUpDueAt).toBe('2024-01-02T06:00:00.000Z');
    expect(normalised.knowledgeSuggestions).toEqual([
      {
        id: 'kb-1',
        title: 'Reset your billing cycle',
        minutes: 4
      }
    ]);
    expect(normalised.escalationBreadcrumbs).toEqual([
      {
        id: 'crumb-1',
        actor: 'learner',
        label: 'Ticket created',
        note: null,
        at: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'crumb-2024-01-01T02:00:00.000Z',
        actor: 'system',
        label: 'Escalated',
        note: 'Routed to ops',
        at: '2024-01-01T02:00:00.000Z'
      }
    ]);

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
    expect(parseJson('[{"id":1}]', [])).toEqual([{ id: 1 }]);
    expect(parseJson('{"ok":true}', {})).toEqual({ ok: true });
    expect(parseJson('invalid', {})).toEqual({});
    expect(parseJson('', [])).toEqual([]);
  });

  it('normalises list options safely', () => {
    expect(normaliseListOptions({ limit: '999', status: ' Open ' })).toEqual({ limit: 200, status: 'open' });
    expect(normaliseListOptions({ limit: 'NaN' })).toEqual({ limit: 50, status: undefined });
    expect(normaliseListOptions({ limit: 10, status: '' })).toEqual({ limit: 10, status: undefined });
  });
});
