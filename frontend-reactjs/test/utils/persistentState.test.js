import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deletePersistentState,
  loadPersistentState,
  savePersistentState,
  updatePersistentState
} from '../../src/utils/persistentState.js';

describe('persistentState utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('returns fallback when storage empty', () => {
    const fallback = loadPersistentState('missing', () => ({ feature: true }));
    expect(fallback).toEqual({ feature: true });
  });

  it('reads and writes values to localStorage', () => {
    savePersistentState('session', { token: 'abc' });
    expect(JSON.parse(window.localStorage.getItem('session'))).toEqual({ token: 'abc' });
    expect(loadPersistentState('session', null)).toEqual({ token: 'abc' });
  });

  it('handles parse errors gracefully', () => {
    window.localStorage.setItem('broken', '{bad json');
    const fallback = loadPersistentState('broken', { ok: true });
    expect(fallback).toEqual({ ok: true });
    expect(console.warn).toHaveBeenCalled();
  });

  it('removes values when requested', () => {
    savePersistentState('to-remove', { data: true });
    deletePersistentState('to-remove');
    expect(window.localStorage.getItem('to-remove')).toBeNull();
  });

  it('updates values using updater function', () => {
    savePersistentState('counter', { value: 1 });
    const result = updatePersistentState('counter', (current) => ({ value: current.value + 1 }));
    expect(result).toEqual({ value: 2 });
    expect(loadPersistentState('counter', null)).toEqual({ value: 2 });
  });
});
