import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, afterEach } from 'vitest';

import GlobalSearchBar from '../GlobalSearchBar.jsx';
import { AuthContext } from '../../../context/AuthContext.jsx';
import { getExplorerSearchSuggestions } from '../../../api/explorerApi.js';

vi.mock('../../../api/explorerApi.js', () => ({
  getExplorerSearchSuggestions: vi.fn()
}));

describe('GlobalSearchBar', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches suggestions on focus and submits selected item', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    getExplorerSearchSuggestions.mockResolvedValueOnce({
      data: {
        savedSearches: [
          { id: 1, name: 'Pinned automation', query: 'automation', entityTypes: ['courses'], isPinned: true }
        ],
        trendingQueries: [{ query: 'growth', searches: 12 }],
        previewDigest: {
          courses: [
            { entityId: 'course-1', title: 'Automation Playbook', thumbnailUrl: 'https://cdn.example.com/course.jpg' }
          ]
        }
      }
    });

    render(
      <AuthContext.Provider value={{ session: { tokens: { accessToken: 'token-abc' } } }}>
        <GlobalSearchBar onSubmit={onSubmit} />
      </AuthContext.Provider>
    );

    const input = screen.getByRole('searchbox');
    await user.click(input);

    await waitFor(() => expect(getExplorerSearchSuggestions).toHaveBeenCalled());

    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('automation', expect.objectContaining({ type: 'saved' }));
  });
});
