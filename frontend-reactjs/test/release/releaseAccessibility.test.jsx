import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';

import ServiceHealthBanner from '../../src/components/status/ServiceHealthBanner.jsx';

const refreshSpy = vi.fn();

vi.mock('../../src/context/ServiceHealthContext.jsx', () => ({
  useServiceHealth: () => ({
    alerts: [
      {
        id: 'service-api',
        type: 'service',
        level: 'critical',
        title: 'Realtime API outage',
        message: 'Primary realtime cluster unreachable in us-east-1.',
        affectedCapabilities: ['in-app chat', 'live classrooms'],
        status: 'outage',
        checkedAt: '2024-11-29T17:00:00.000Z'
      },
      {
        id: 'capability-billing',
        type: 'capability',
        level: 'warning',
        title: 'Billing reconciliation delays',
        message: 'Stripe payout acknowledgements running 12 minutes behind.',
        affectedCapabilities: ['payout approvals'],
        status: 'degraded',
        checkedAt: '2024-11-29T16:55:00.000Z'
      }
    ],
    lastUpdated: '2024-11-29T17:05:00.000Z',
    loading: false,
    refresh: refreshSpy
  })
}));

expect.extend(toHaveNoViolations);

describe('Release accessibility guardrails', () => {

  beforeEach(() => {
    refreshSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders service health escalations accessibly and keeps interactions keyboard safe', async () => {
    const { container } = render(<ServiceHealthBanner maxAlerts={2} />);

    const outageAlert = screen.getByRole('alert');
    expect(outageAlert).toHaveTextContent('Realtime API outage');
    expect(outageAlert).toHaveAttribute('aria-live', 'assertive');

    const refreshButton = screen.getByRole('button', { name: /refresh status/i });
    fireEvent.click(refreshButton);
    expect(refreshSpy).toHaveBeenCalledTimes(1);

    const accessibilityScan = await axe(container, {
      rules: {
        region: { enabled: false }
      }
    });
    expect(accessibilityScan).toHaveNoViolations();
  });
});
