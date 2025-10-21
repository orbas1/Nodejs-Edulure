import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import InstructorProductionSection from '../../../../../src/pages/dashboard/instructor/sections/InstructorProductionSection.jsx';
import InstructorProfileSection from '../../../../../src/pages/dashboard/instructor/sections/InstructorProfileSection.jsx';
import InstructorRevenueSection from '../../../../../src/pages/dashboard/instructor/sections/InstructorRevenueSection.jsx';

describe('Instructor dashboard sections', () => {
  const originalOpen = global.open;

  it('renders production tasks and opens workspace when available', () => {
    global.open = vi.fn();
    render(
      <InstructorProductionSection
        production={[
          { id: 1, owner: 'Ava Cole', status: 'Filming', asset: 'Module 1', workspaceUrl: 'https://workspace.test' }
        ]}
      />
    );

    const button = screen.getByRole('button', { name: /open learnspace/i });
    fireEvent.click(button);
    expect(global.open).toHaveBeenCalledWith('https://workspace.test', '_blank', 'noopener');
    global.open = originalOpen;
  });

  it('falls back to helper text when no production tasks', () => {
    render(<InstructorProductionSection production={[]} />);
    expect(screen.getByText(/assign production tasks/i)).toBeInTheDocument();
  });

  it('disables workspace action for unsafe urls', () => {
    render(
      <InstructorProductionSection
        production={[{ id: 2, owner: 'Kai', status: 'Editing', asset: 'Module 2', workspaceUrl: 'javascript:alert(1)' }]}
      />
    );

    expect(screen.getByRole('button', { name: /open learnspace/i })).toBeDisabled();
  });

  it('displays profile information and stats', () => {
    render(
      <InstructorProfileSection
        profile={{ name: 'Jordan Blake', verification: { status: 'verified' } }}
        stats={[
          { label: 'Cohorts', value: '3', change: '12%', trend: 'up' },
          { label: 'Feedback', value: '98%', change: '2%', trend: 'down' }
        ]}
      />
    );

    expect(screen.getByText(/jordan blake/i)).toBeInTheDocument();
    expect(screen.getAllByText(/cohorts/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/98%/)).toBeInTheDocument();
  });

  it('renders revenue slices with percentages', () => {
    render(
      <InstructorRevenueSection
        revenueSlices={[
          { name: 'Courses', value: '$12k', percent: 60 },
          { name: 'Consulting', value: '$8k', percent: 40 }
        ]}
      />
    );

    expect(screen.getByText(/courses/i)).toBeInTheDocument();
    expect(screen.getAllByText(/share of revenue/i)).toHaveLength(2);
  });
});
