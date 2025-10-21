import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FeedSponsoredCard from '../../src/components/FeedSponsoredCard.jsx';

const baseAd = {
  placementId: 'pl_test',
  headline: 'Scale with Edulure',
  description: 'Amplify your GTM motions.',
  advertiser: 'Edulure Partner',
  objective: 'Awareness',
  ctaUrl: 'https://partners.edulure.com/launch',
  disclosure: 'Sponsored by Edulure',
  position: 3
};

describe('FeedSponsoredCard', () => {
  it('renders core ad metadata and CTA attributes', () => {
    render(<FeedSponsoredCard ad={baseAd} />);

    expect(screen.getByText(baseAd.headline)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Visit partners.edulure.com/i });
    expect(cta).toHaveAttribute('href', baseAd.ctaUrl);
    expect(cta).toHaveAttribute('target', '_blank');
    expect(cta).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/Ad slot #3/i)).toBeInTheDocument();
  });

  it('hides management controls when RBAC does not allow', () => {
    render(<FeedSponsoredCard ad={baseAd} canManage={false} />);
    expect(screen.queryByRole('button', { name: /hide placement/i })).not.toBeInTheDocument();
  });

  it('respects invalid URLs and default disclosures gracefully', () => {
    render(
      <FeedSponsoredCard
        ad={{
          ...baseAd,
          ctaUrl: null,
          description: undefined,
          disclosure: undefined,
          advertiser: undefined
        }}
      />
    );

    expect(screen.queryByRole('link', { name: /Visit/i })).not.toBeInTheDocument();
    expect(screen.getByText('Discover how operators are scaling with Edulure Ads.')).toBeInTheDocument();
    expect(screen.getByText('Edulure Ads')).toBeInTheDocument();
    expect(screen.getByText('Edulure Partner')).toBeInTheDocument();
  });

  it('allows operators to manage inventory with safe guards', () => {
    const handleDismiss = vi.fn();
    const { rerender } = render(<FeedSponsoredCard ad={baseAd} canManage onDismiss={handleDismiss} />);

    const manageButton = screen.getByRole('button', { name: /hide placement/i });
    fireEvent.click(manageButton);
    expect(handleDismiss).toHaveBeenCalledTimes(1);

    rerender(<FeedSponsoredCard ad={baseAd} canManage onDismiss={handleDismiss} isProcessing />);
    const disabledButton = screen.getByRole('button', { name: /updating…/i });
    expect(disabledButton).toBeDisabled();
    fireEvent.click(disabledButton);
    expect(handleDismiss).toHaveBeenCalledTimes(1);

    rerender(
      <FeedSponsoredCard ad={{ ...baseAd, ctaUrl: 'not-a-url' }} canManage onDismiss={handleDismiss} />
    );
    expect(screen.getByRole('link', { name: /Visit not-a-url/i })).toHaveAttribute('href', 'not-a-url');
  });

  it('normalises advertiser destinations for brand-safe messaging', () => {
    render(<FeedSponsoredCard ad={{ ...baseAd, ctaUrl: 'https://www.example.com/offer' }} />);

    expect(screen.getByRole('link', { name: /Visit example.com/i })).toHaveAttribute(
      'href',
      'https://www.example.com/offer'
    );
  });
});
