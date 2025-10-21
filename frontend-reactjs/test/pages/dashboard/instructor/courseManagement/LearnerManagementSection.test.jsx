import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LearnerManagementSection from '../../../../../src/pages/dashboard/instructor/courseManagement/LearnerManagementSection.jsx';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LearnerManagementSection', () => {
  it('summarises roster and emits intervention events', () => {
    const learners = {
      roster: [
        {
          id: 'enr-1',
          learnerId: 'user-1',
          name: 'Alex Rivers',
          courseId: 'course-1',
          courseTitle: 'Design Ops Mastery',
          status: 'active',
          progressPercent: 42,
          cohort: 'Q1',
          riskLevel: 'high',
          lastActivityAt: new Date().toISOString(),
          nextLesson: 'Module 3 · Systems audit'
        },
        {
          id: 'enr-2',
          learnerId: 'user-2',
          name: 'Morgan Hart',
          courseId: 'course-1',
          courseTitle: 'Design Ops Mastery',
          status: 'completed',
          progressPercent: 100,
          cohort: 'Q1',
          riskLevel: 'low',
          lastActivityAt: new Date().toISOString(),
          nextLesson: null
        }
      ],
      riskAlerts: [
        {
          id: 'enr-1',
          learnerId: 'user-1',
          name: 'Alex Rivers',
          courseTitle: 'Design Ops Mastery',
          cohort: 'Q1',
          progressPercent: 42,
          riskLevel: 'high',
          lastActivityAt: new Date().toISOString(),
          lastLocation: 'Module 2 checkpoint',
          notes: ['Reached out for support']
        }
      ]
    };

    const listener = vi.fn();
    window.addEventListener('edulure:learner-intervention', listener);

    render(<LearnerManagementSection learners={learners} />);

    expect(screen.getByText('Total roster').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Active learners').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Avg. progress').parentElement).toHaveTextContent('71%');
    expect(screen.getByText('High priority alerts')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Schedule intervention/i }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.learnerId).toBe('user-1');

    window.removeEventListener('edulure:learner-intervention', listener);
  });

  it('renders nothing when no learners or alerts exist', () => {
    const { container } = render(<LearnerManagementSection learners={{ roster: [], riskAlerts: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
