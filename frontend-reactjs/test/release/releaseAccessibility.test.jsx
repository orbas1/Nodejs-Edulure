import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ServiceHealthBanner from '../../src/components/status/ServiceHealthBanner.jsx';

const refreshSpy = vi.fn();
const originalConsoleError = console.error;
const serviceHealthState = {};
const useServiceHealthMock = vi.fn(() => serviceHealthState);
let consoleErrorSpy;

vi.mock('../../src/context/ServiceHealthContext.jsx', () => ({
  useServiceHealth: (...args) => useServiceHealthMock(...args)
}));

expect.extend(toHaveNoViolations);

describe('Release accessibility guardrails', () => {
  beforeEach(() => {
    serviceHealthState.alerts = [
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
      },
      {
        id: 'capability-email',
        type: 'capability',
        level: 'info',
        title: 'Transactional email delays',
        message: 'SES has queued 240 messages for retry, expect 5 minute delays.',
        affectedCapabilities: ['transactional email'],
        status: 'degraded',
        checkedAt: '2024-11-29T16:52:00.000Z'
      }
    ];
    serviceHealthState.lastUpdated = '2024-11-29T17:05:00.000Z';
    serviceHealthState.loading = false;
    serviceHealthState.refresh = refreshSpy;
    refreshSpy.mockClear();
    useServiceHealthMock.mockImplementation(() => serviceHealthState);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((message, ...args) => {
      if (typeof message === 'string' && message.includes('ReactDOMTestUtils.act')) {
        return;
      }
      originalConsoleError.call(console, message, ...args);
    });
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders service health escalations accessibly and keeps interactions keyboard safe', async () => {
    const user = userEvent.setup();
    const { container } = render(<ServiceHealthBanner maxAlerts={2} />);

    const outageAlert = screen.getByRole('alert');
    expect(outageAlert).toHaveTextContent(/realtime api outage/i);
    expect(outageAlert).toHaveAttribute('aria-live', 'assertive');
    expect(within(outageAlert).getByText(/primary realtime cluster unreachable/i)).toBeInTheDocument();

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

  it('announces recency updates and enforces polite status limits when alerts overflow', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2024-11-29T17:10:00.000Z'));

    const { rerender } = render(<ServiceHealthBanner maxAlerts={2} />);

    expect(screen.getByText(/last checked 5 minutes ago/i)).toBeInTheDocument();
    const statusRegions = screen.getAllByRole('status');
    expect(statusRegions).toHaveLength(1);
    expect(within(statusRegions[0]).getByText(/billing reconciliation delays/i)).toBeVisible();
    expect(screen.queryByText(/transactional email delays/i)).not.toBeInTheDocument();

    const refreshButton = screen.getByRole('button', { name: /refresh status/i });
    expect(refreshButton).not.toBeDisabled();

    refreshSpy.mockImplementation(() => {
      serviceHealthState.loading = true;
      rerender(<ServiceHealthBanner maxAlerts={2} />);
    });

    const user = userEvent.setup();
    await user.click(refreshButton);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /refreshing/i })).toBeDisabled();

    serviceHealthState.loading = false;
    serviceHealthState.lastUpdated = '2024-11-29T17:12:00.000Z';
    vi.setSystemTime(new Date('2024-11-29T17:14:00.000Z'));
    rerender(<ServiceHealthBanner maxAlerts={2} />);
    expect(screen.getByRole('button', { name: /refresh status/i })).not.toBeDisabled();
    expect(screen.getByText(/last checked 2 minutes ago/i)).toBeInTheDocument();
  });
});
