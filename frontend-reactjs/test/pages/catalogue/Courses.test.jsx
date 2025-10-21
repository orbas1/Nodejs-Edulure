import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Courses from '../../../src/pages/Courses.jsx';

const useAuthMock = vi.fn();
const listPublicCoursesMock = vi.fn();
const searchExplorerMock = vi.fn();
const createPaymentIntentMock = vi.fn();
const adminControlApiMock = {
  listCourses: vi.fn(),
  deleteCourse: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn()
};

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
  default: adminControlApiMock
}));

vi.mock('../../../src/api/paymentsApi.js', () => ({
  createPaymentIntent: (...args) => createPaymentIntentMock(...args)
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
    createPaymentIntentMock.mockReset();
    Object.values(adminControlApiMock).forEach((mockFn) => mockFn.mockReset?.());
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

  it('surfaces highlight error messaging when the fallback catalogue fails', async () => {
    listPublicCoursesMock.mockImplementation(({ params }) => {
      if (params?.limit === 6) {
        return Promise.reject(new Error('Highlights offline'));
      }
      return Promise.resolve({ data: [] });
    });

    render(<Courses />);

    expect(await screen.findByText('Highlights offline')).toBeInTheDocument();
  });

  it('creates payment intents from the admin checkout drawer', async () => {
    useAuthMock.mockReturnValue({
      session: {
        tokens: { accessToken: 'token' },
        user: { role: 'admin', email: 'ops@edulure.com' }
      },
      isAuthenticated: true
    });
    searchExplorerMock.mockResolvedValue({
      success: true,
      data: {
        results: {
          courses: {
            hits: [
              {
                id: 'course-1',
                title: 'Ops Mastery',
                price: { formatted: '$199' },
                raw: { level: 'advanced', deliveryFormat: 'cohort', skills: ['ops'] }
              }
            ]
          }
        }
      }
    });
    listPublicCoursesMock.mockResolvedValue({ data: [] });
    adminControlApiMock.listCourses.mockResolvedValue({ data: [] });
    createPaymentIntentMock.mockResolvedValue({ paymentId: 'pi_123', clientSecret: 'secret_456' });

    const user = userEvent.setup();
    render(<Courses />);

    const purchaseButton = await screen.findByRole('button', { name: /Purchase cohort/i });
    await user.click(purchaseButton);

    const submitButton = await screen.findByRole('button', { name: /Generate payment intent/i });
    await user.click(submitButton);

    await waitFor(() => expect(createPaymentIntentMock).toHaveBeenCalledTimes(1));
    const payload = createPaymentIntentMock.mock.calls[0][0];
    expect(payload.token).toBe('token');
    expect(payload.payload.items[0]).toMatchObject({ name: 'Ops Mastery', metadata: { courseId: 'course-1' } });
    expect(await screen.findByText(/Checkout ready/i)).toBeInTheDocument();
  });
});
