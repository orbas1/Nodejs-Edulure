import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FeedCard from '../../src/components/FeedCard.jsx';

describe('FeedCard', () => {
  const basePost = {
    id: 7,
    title: 'Weekly ritual',
    body: 'Ship wins and call out blockers.',
    publishedAt: new Date().toISOString(),
    tags: ['rituals'],
    community: { id: 1, name: 'Automation Guild' },
    author: { id: 4, name: 'Avery Chen', role: 'Moderator', avatarUrl: '' },
    stats: { reactions: 4, comments: 1 },
    moderation: { state: 'clean' },
    permissions: { canModerate: true, canRemove: true }
  };

  it('calls handlers when moderation actions are used', () => {
    const handleModerate = vi.fn();
    const handleRemove = vi.fn();

    render(
      <FeedCard
        post={basePost}
        onModerate={handleModerate}
        onRemove={handleRemove}
        actionState={{ isProcessing: false, error: null }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /suppress/i }));
    expect(handleModerate).toHaveBeenCalledWith(basePost, 'suppress');

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(handleRemove).toHaveBeenCalledWith(basePost);
  });
});
