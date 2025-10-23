import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CourseCard from '../../../src/components/course/CourseCard.jsx';

describe('CourseCard', () => {
  it('renders upsell badges with formatted pricing and link metadata', () => {
    const handlePrimary = vi.fn();
    render(
      <CourseCard
        course={{
          title: 'Automation Masterclass',
          subtitle: 'Advanced cohort',
          description: 'Launch automation playbooks.',
          thumbnailUrl: null,
          instructor: 'Kai Watanabe',
          level: 'Advanced',
          deliveryFormat: 'Cohort',
          tags: ['automation'],
          rating: 4.8,
          ratingCount: 187,
          duration: '12h',
          memberCount: '421',
          price: 1299,
          currency: 'USD',
          highlights: ['Live simulations'],
          upsellBadges: [
            {
              productCode: 'ops-masterclass-tutor-support',
              label: 'Tutor concierge',
              description: 'Weekly escalation pods',
              priceCents: 49900,
              currency: 'USD',
              tone: 'emerald',
              href: 'https://commerce.edulure.test/addons/tutor'
            }
          ]
        }}
        primaryActionLabel="View course"
        onPrimaryAction={handlePrimary}
      />
    );

    expect(screen.getByText('Bundles & support')).toBeInTheDocument();
    const upsellLink = screen.getByRole('link', { name: /Tutor concierge/i });
    expect(upsellLink).toHaveAttribute('href', 'https://commerce.edulure.test/addons/tutor');
    expect(screen.getByText(/\$49\.90/)).toBeInTheDocument();
    expect(screen.getByText('Weekly escalation pods')).toBeInTheDocument();
  });
});
