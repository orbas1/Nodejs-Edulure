import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { axe, toHaveNoViolations } from 'jest-axe';

import ServiceHealthBanner from '../../src/components/status/ServiceHealthBanner.jsx';

const refreshSpy = vi.fn();
const originalConsoleError = console.error;
let consoleErrorSpy;

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
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((message, ...args) => {
      if (typeof message === 'string' && message.includes('ReactDOMTestUtils.act')) {
        return;
      }
      originalConsoleError.call(console, message, ...args);
    });
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    vi.clearAllMocks();
  });

  it('renders service health escalations accessibly and keeps interactions keyboard safe', async () => {
    const user = userEvent.setup();
    const { container } = render(<ServiceHealthBanner maxAlerts={2} />);

    const outageAlert = screen.getByRole('alert');
    expect(outageAlert).toHaveTextContent('Realtime API outage');
    expect(outageAlert).toHaveAttribute('aria-live', 'assertive');

    const capabilityStatuses = screen.getAllByRole('status');
    expect(capabilityStatuses).toHaveLength(1);
    expect(capabilityStatuses[0]).toHaveAttribute('aria-live', 'polite');
    expect(within(capabilityStatuses[0]).getByText(/billing reconciliation delays/i)).toBeInTheDocument();

    const refreshButton = screen.getByRole('button', { name: /refresh status/i });
    await user.click(refreshButton);
    expect(refreshSpy).toHaveBeenCalledTimes(1);

    refreshButton.focus();
    expect(refreshButton).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(refreshSpy).toHaveBeenCalledTimes(2);

    let accessibilityScan;
    await act(async () => {
      accessibilityScan = await axe(container, {
        rules: {
          region: { enabled: false }
        }
      });
    });
    expect(accessibilityScan).toHaveNoViolations();
  });
});
