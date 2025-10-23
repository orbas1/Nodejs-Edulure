import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

import CalendarEventDialog from '../../src/components/calendar/CalendarEventDialog.jsx';
import PricingTierDialog from '../../src/pages/dashboard/instructor/pricing/PricingTierDialog.jsx';

describe('Dialog accessibility', () => {
  it('CalendarEventDialog meets axe guidelines when open', async () => {
    const { container } = render(
      <CalendarEventDialog
        isOpen
        mode="create"
        initialData={{}}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('PricingTierDialog meets axe guidelines when open', async () => {
    const { container } = render(
      <PricingTierDialog
        isOpen
        mode="create"
        tier={null}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
