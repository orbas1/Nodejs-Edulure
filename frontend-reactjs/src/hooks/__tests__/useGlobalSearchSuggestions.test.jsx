import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    session: { tokens: { accessToken: 'token-abc' } },
    isAuthenticated: true
  })
}));

vi.mock('../../api/explorerApi.js', () => ({
  fetchExplorerSuggestions: vi.fn(),
  listSavedSearches: vi.fn()
}));

describe('useGlobalSearchSuggestions', () => {
  beforeEach(async () => {
    const { fetchExplorerSuggestions, listSavedSearches } = await import('../../api/explorerApi.js');
    fetchExplorerSuggestions.mockResolvedValue({
      data: {
        items: [
          { id: 'course-1', entity: 'courses', title: 'Design Systems 101', tags: ['design'], previewMedia: null }
        ]
      }
    });
    listSavedSearches.mockResolvedValue({
      data: [
        { id: 1, name: 'Pinned design', query: 'design', isPinned: true },
        { id: 2, name: 'Draft', query: 'draft', isPinned: false }
      ]
    });
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('fetches suggestions once the minimum length is reached', async () => {
    const { default: useGlobalSearchSuggestions } = await import('../useGlobalSearchSuggestions.js');
    const { fetchExplorerSuggestions, listSavedSearches } = await import('../../api/explorerApi.js');

    const { result } = renderHook(() => useGlobalSearchSuggestions({ debounceMs: 0 }));

    await waitFor(() => expect(listSavedSearches).toHaveBeenCalled());

    await act(async () => {
      result.current.setQuery('design');
    });

    await waitFor(() =>
      expect(fetchExplorerSuggestions).toHaveBeenCalledWith(
        { query: 'design', entityTypes: undefined, limit: 8 },
        expect.objectContaining({ token: 'token-abc' })
      )
    );

    await waitFor(() => expect(result.current.suggestions).toHaveLength(1));
    expect(result.current.savedSearches).toEqual([
      { id: 1, name: 'Pinned design', query: 'design', isPinned: true }
    ]);
  });

  it('reuses cached suggestions for repeated queries', async () => {
    const { default: useGlobalSearchSuggestions } = await import('../useGlobalSearchSuggestions.js');
    const { fetchExplorerSuggestions } = await import('../../api/explorerApi.js');

    const { result } = renderHook(() => useGlobalSearchSuggestions({ debounceMs: 0 }));

    await act(async () => {
      result.current.setQuery('design');
    });
    await waitFor(() => expect(fetchExplorerSuggestions).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.setQuery('design ');
    });
    await waitFor(() => expect(fetchExplorerSuggestions).toHaveBeenCalledTimes(1));
  });
});
