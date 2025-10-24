import { describe, expect, it } from 'vitest';

import { __testables } from '../../src/models/SupportTicketModel.js';

const { parseJson, serialiseJson, toIso, buildKnowledgeSummary, mapCase } = __testables;

describe('SupportTicketModel helpers', () => {
  it('parses json payloads with safe fallbacks', () => {
    expect(parseJson('{"note":"Escalated"}', {})).toEqual({ note: 'Escalated' });
    expect(parseJson('[{"id":"crumb-1"}]', [])).toEqual([{ id: 'crumb-1' }]);
    expect(parseJson('invalid json', { ok: true })).toEqual({ ok: true });
    expect(parseJson(null, [])).toEqual([]);
  });

  it('serialises json payloads consistently', () => {
    expect(serialiseJson({ label: 'Created' })).toEqual('{"label":"Created"}');
    expect(serialiseJson([{ id: 'kb-1' }])).toEqual('[{"id":"kb-1"}]');
    expect(serialiseJson('invalid json')).toBeNull();
    expect(serialiseJson(undefined)).toBeNull();
  });

  it('normalises values to ISO timestamps', () => {
    const fixed = new Date('2024-01-01T10:00:00.000Z');
    expect(toIso(fixed)).toBe('2024-01-01T10:00:00.000Z');
    expect(toIso('2024-02-02T12:30:00Z')).toBe('2024-02-02T12:30:00.000Z');
    expect(toIso('not a date')).toBeNull();
    expect(toIso(null)).toBeNull();
  });

  it('builds knowledge summaries with fallback metadata', () => {
    const suggestions = [
      {
        id: 'kb-1',
        title: 'Reset your password',
        category: 'Account',
        stale: false,
        updatedAt: '2024-03-15T09:30:00Z'
      },
      {
        id: 'kb-2',
        title: 'Invoice troubleshooting',
        category: 'Billing',
        stale: true,
        updatedAt: '2024-04-01T18:00:00Z'
      }
    ];

    const summary = buildKnowledgeSummary(suggestions, {
      query: 'billing invoice',
      fromCache: true,
      source: 'support.dashboard'
    });

    expect(summary.query).toBe('billing invoice');
    expect(summary.articleCount).toBe(2);
    expect(summary.staleCount).toBe(1);
    expect(summary.categories).toEqual(['Account', 'Billing']);
    expect(summary.fromCache).toBe(true);
    expect(summary.source).toBe('support.dashboard');
    expect(summary.lastUpdatedAt).toBe('2024-04-01T18:00:00.000Z');
    expect(new Date(summary.generatedAt).toString()).not.toBe('Invalid Date');
  });

  it('maps cases with normalised knowledge metadata', () => {
    const now = '2024-04-05T12:00:00.000Z';
    const row = {
      id: 'case-1',
      reference: 'SUP-1234',
      subject: 'Need help with billing',
      category: 'Billing',
      priority: 'high',
      status: 'open',
      channel: 'Portal',
      satisfaction: null,
      owner: null,
      last_agent: null,
      knowledge_suggestions: JSON.stringify([
        {
          id: 'kb-1',
          title: 'Billing overview',
          category: 'Billing',
          updatedAt: '2024-04-02T08:00:00Z',
          stale: false
        }
      ]),
      metadata: JSON.stringify({
        knowledgeBase: {
          query: 'billing overview',
          source: 'support.portal',
          fromCache: false
        }
      }),
      escalation_breadcrumbs: '[]',
      ai_summary: null,
      follow_up_due_at: now,
      ai_summary_generated_at: now,
      created_at: now,
      updated_at: now
    };

    const mapped = mapCase(row, []);
    expect(mapped.knowledgeSuggestions).toHaveLength(1);
    expect(mapped.metadata.knowledgeBase.articleCount).toBe(1);
    expect(mapped.metadata.knowledgeBase.lastUpdatedAt).toBe('2024-04-02T08:00:00.000Z');
    expect(mapped.metadata.knowledge_base).toBeUndefined();
    expect(mapped.knowledgeBaseSummary.articleCount).toBe(1);
  });
});
