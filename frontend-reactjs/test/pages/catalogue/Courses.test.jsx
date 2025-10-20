import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Courses from '../../../src/pages/Courses.jsx';

const useAuthMock = vi.fn();
const listPublicCoursesMock = vi.fn();
const searchExplorerMock = vi.fn();

vi.mock('../../../src/context/AuthContext.jsx', () => ({
  useAuth: () => useAuthMock()
}));

vi.mock('../../../src/api/catalogueApi.js', () => ({
  listPublicCourses: (...args) => listPublicCoursesMock(...args)
}));

vi.mock('../../../src/api/explorerApi.js', () => ({
  searchExplorer: (...args) => searchExplorerMock(...args)
}));

vi.mock('../../../src/api/adminControlApi.js', () => ({
  default: {
    listCourses: vi.fn(),
    deleteCourse: vi.fn(),
    createCourse: vi.fn(),
    updateCourse: vi.fn()
  }
}));

vi.mock('../../../src/components/search/ExplorerSearchSection.jsx', () => ({
  default: () => <div data-testid="explorer-search" />
}));

vi.mock('../../../src/components/forms/FormStepper.jsx', () => ({
  default: ({ steps, currentStep, onSelect }) => (
    <div data-testid="form-stepper">
      {steps.map((step) => (
        <button key={step.id} type="button" onClick={() => onSelect?.(step.id)}>
          {step.title}
        </button>
      ))}
      <span>Current: {currentStep}</span>
    </div>
  )
}));

describe('Courses page catalogue fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ session: null, isAuthenticated: false });
    listPublicCoursesMock.mockImplementation(() => Promise.resolve({ data: [] }));
  });

  it('falls back to public course highlights when explorer access is unavailable', async () => {
    listPublicCoursesMock.mockImplementation(({ params }) => {
      if (params?.limit === 6) {
        return Promise.resolve({
          data: [
            {
              id: 'fallback-course',
              title: 'Fallback Analytics Accelerator',
              summary: 'Signal amplification for operators.',
              level: 'advanced',
              deliveryFormat: 'cohort',
              priceAmount: 0,
              priceCurrency: 'USD',
              skills: ['analytics']
            }
          ]
        });
      }
      if (params?.limit === 8) {
        return Promise.resolve({
          data: [
            {
              id: 'catalogue-course',
              title: 'Public Product Strategy',
              summary: 'New launch',
              level: 'beginner',
              deliveryFormat: 'self_paced',
              priceAmount: 120,
              priceCurrency: 'USD'
            }
          ]
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(<Courses />);

    await waitFor(() => {
      const limits = listPublicCoursesMock.mock.calls.map((call) => call[0]?.params?.limit);
      expect(limits).toContain(6);
      expect(limits).toContain(8);
    });

    expect(await screen.findByText('Fallback Analytics Accelerator')).toBeInTheDocument();
    expect(await screen.findByText('Public Product Strategy')).toBeInTheDocument();
    expect(searchExplorerMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Limited results shown/i)).not.toBeInTheDocument();
  });
});
