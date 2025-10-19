import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FeedSponsoredCard from '../../src/components/FeedSponsoredCard.jsx';

describe('FeedSponsoredCard', () => {
  it('shows management controls when allowed', () => {
    const handleDismiss = vi.fn();
    render(
      <FeedSponsoredCard
        ad={{ placementId: 'pl_test', headline: 'Scale with Edulure', ctaUrl: 'https://edulure.com' }}
        canManage
        onDismiss={handleDismiss}
        isProcessing={false}
      />
    );

    const button = screen.getByRole('button', { name: /hide placement/i });
    fireEvent.click(button);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});
