import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setQueryMock = vi.fn();
const useGlobalSearchSuggestionsMock = vi.fn();

vi.mock('../../hooks/useGlobalSearchSuggestions.js', () => ({
  __esModule: true,
  default: (...args) => useGlobalSearchSuggestionsMock(...args)
}));

import GlobalSearchBar from '../search/GlobalSearchBar.jsx';

describe('GlobalSearchBar', () => {
  beforeEach(() => {
    setQueryMock.mockReset();
    useGlobalSearchSuggestionsMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders suggestions and notifies when an item is selected', async () => {
    useGlobalSearchSuggestionsMock.mockReturnValue({
      query: 'design',
      setQuery: setQueryMock,
      suggestions: [
        {
          entity: 'courses',
          id: 'course-1',
          title: 'Design Systems 101',
          subtitle: 'Course',
          tags: ['design'],
          previewMedia: null,
          highlight: null
        }
      ],
      loading: false,
      error: null,
      savedSearches: [],
      savedSearchLoading: false,
      savedSearchError: null,
      isAuthenticated: true
    });

    const handleSubmit = vi.fn();
    const handleSuggestionSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <GlobalSearchBar
        onSubmit={handleSubmit}
        onSuggestionSelect={handleSuggestionSelect}
        placeholder="Search"
      />
    );

    const input = screen.getByRole('searchbox');
    await act(async () => {
      await user.click(input);
    });

    const optionButton = await screen.findByRole('option', { name: /design systems/i });
    await act(async () => {
      await user.click(optionButton);
    });

    expect(handleSuggestionSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'course-1', kind: 'suggestion' })
    );
    expect(handleSubmit).toHaveBeenCalledWith('Design Systems 101', null);
  });

  it('surfaces saved searches when no query is entered', async () => {
    useGlobalSearchSuggestionsMock.mockReturnValue({
      query: '',
      setQuery: setQueryMock,
      suggestions: [],
      loading: false,
      error: null,
      savedSearches: [{ id: 1, name: 'Pinned design', query: 'design', isPinned: true }],
      savedSearchLoading: false,
      savedSearchError: null,
      isAuthenticated: true
    });

    const handleSubmit = vi.fn();
    const handleSuggestionSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <GlobalSearchBar
        onSubmit={handleSubmit}
        onSuggestionSelect={handleSuggestionSelect}
        placeholder="Search"
      />
    );

    const input = screen.getByRole('searchbox');
    await act(async () => {
      await user.click(input);
    });

    const savedButton = await screen.findByText('Pinned design');
    await act(async () => {
      await user.click(savedButton);
    });

    expect(handleSuggestionSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, kind: 'saved' })
    );
    expect(handleSubmit).toHaveBeenCalledWith('design', null);
  });
});
