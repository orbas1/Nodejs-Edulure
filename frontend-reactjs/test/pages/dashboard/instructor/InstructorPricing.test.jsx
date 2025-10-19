import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InstructorPricing from '../../../../src/pages/dashboard/InstructorPricing.jsx';

let contextValue;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => contextValue
  };
});

describe('InstructorPricing', () => {
  const refresh = vi.fn();
  const exportPricing = vi.fn().mockResolvedValue({ summary: 'Export scheduled' });

  beforeEach(() => {
    refresh.mockClear();
    exportPricing.mockClear();
    contextValue = {
      dashboard: {
        pricing: {
          offers: [
            { id: 'offer-1', name: 'Cohort A', price: '£399', status: 'Live', conversion: '12%', learners: 42 }
          ],
          subscriptions: [],
          sessions: [],
          insights: []
        },
        analytics: { revenueStreams: [] }
      },
      refresh,
      instructorOrchestration: {
        exportPricing
      }
    };
  });

  it('handles pricing export with pending state', async () => {
    render(<InstructorPricing />);

    const exportButton = screen.getByRole('button', { name: /Export finance report/i });
    fireEvent.click(exportButton);

    expect(exportButton).toBeDisabled();
    await waitFor(() => expect(exportPricing).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.getByText(/Pricing export scheduled/i)).toBeInTheDocument();
  });
});
