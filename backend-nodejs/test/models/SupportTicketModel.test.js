import { describe, expect, it } from 'vitest';

import { __testables } from '../../src/models/SupportTicketModel.js';

const { parseJson, serialiseJson, toIso } = __testables;

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
});
