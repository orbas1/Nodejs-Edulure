import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FeedCard from '../../src/components/FeedCard.jsx';

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

describe('FeedCard', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('renders core post details with safe fallbacks', () => {
    render(
      <FeedCard
        post={{
          ...basePost,
          title: null,
          tags: null,
          stats: {},
          publishedAt: null,
          body: 'Signals shipped for launch.'
        }}
      />
    );

    expect(screen.getByText('Automation Guild')).toBeInTheDocument();
    expect(screen.getByText('Signals shipped for launch.')).toBeInTheDocument();
    expect(screen.getByText('Just now')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2);
    expect(screen.queryByText(/#rituals/i)).not.toBeInTheDocument();
  });

  it('toggles moderation actions based on post state', () => {
    const handleModerate = vi.fn();
    render(
      <FeedCard
        post={{
          ...basePost,
          moderation: { state: 'suppressed' }
        }}
        onModerate={handleModerate}
      />
    );

    const restoreButton = screen.getByRole('button', { name: /restore/i });
    fireEvent.click(restoreButton);
    expect(handleModerate).toHaveBeenCalledWith(
      expect.objectContaining({ id: basePost.id }),
      'restore'
    );
  });

  it('disables controls while processing and surfaces action errors', () => {
    const handleModerate = vi.fn();
    const handleRemove = vi.fn();
    render(
      <FeedCard
        post={basePost}
        onModerate={handleModerate}
        onRemove={handleRemove}
        actionState={{ isProcessing: true, error: 'Failed to update' }}
      />
    );

    expect(screen.getByRole('button', { name: /updating…/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /removing…/i })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to update');
    fireEvent.click(screen.getByRole('button', { name: /updating…/i }));
    expect(handleModerate).not.toHaveBeenCalled();
  });

  it('hides privileged moderation controls without RBAC permissions', () => {
    render(
      <FeedCard
        post={{
          ...basePost,
          permissions: { canModerate: false, canRemove: false }
        }}
      />
    );

    expect(screen.queryByRole('button', { name: /suppress/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });
});
