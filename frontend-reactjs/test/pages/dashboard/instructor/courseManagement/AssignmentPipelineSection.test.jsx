import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AssignmentPipelineSection from '../../../../../src/pages/dashboard/instructor/courseManagement/AssignmentPipelineSection.jsx';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AssignmentPipelineSection', () => {
  it('renders summary metrics and dispatches open events', () => {
    const assignments = {
      summary: {
        total: 3,
        dueThisWeek: 2,
        requiresReview: 1
      },
      queues: {
        upcoming: [
          {
            id: 'assignment-1',
            title: 'Automation audit',
            courseTitle: 'Design Ops Mastery',
            owner: 'Curriculum',
            dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        ],
        review: [
          {
            id: 'assignment-2',
            title: 'Compliance workshop',
            courseTitle: 'Risk Foundations',
            owner: 'Quality Team'
          }
        ],
        automation: [
          {
            id: 'assignment-3',
            title: 'Async checkpoint',
            courseTitle: 'Leadership Lab',
            mode: 'auto-grading'
          }
        ]
      }
    };

    const listener = vi.fn();
    window.addEventListener('edulure:assignment-open', listener);

    render(<AssignmentPipelineSection assignments={assignments} />);

    expect(screen.getByText('Total assignments').parentElement).toHaveTextContent('3');
    expect(screen.getByText('Due this week').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Needs review').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Automation coverage')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Open brief/i }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.assignmentId).toBe('assignment-1');

    window.removeEventListener('edulure:assignment-open', listener);
  });

  it('offers empty-state messaging when queues have no entries', () => {
    const assignments = {
      summary: { total: 0, dueThisWeek: 0, requiresReview: 0 },
      queues: { upcoming: [], review: [], automation: [] }
    };

    render(<AssignmentPipelineSection assignments={assignments} />);

    expect(screen.getByText('No assignments awaiting manual review.')).toBeInTheDocument();
    expect(screen.getByText('No automation workflows configured yet.')).toBeInTheDocument();
  });
});
