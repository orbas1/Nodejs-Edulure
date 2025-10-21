import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LearnerEbooks from '../LearnerEbooks.jsx';

const useLearnerDashboardSectionMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());
const listMarketplaceEbooksMock = vi.hoisted(() => vi.fn());
const resumeEbookMock = vi.hoisted(() => vi.fn());
const shareEbookHighlightMock = vi.hoisted(() => vi.fn());
const createLearnerLibraryEntryMock = vi.hoisted(() => vi.fn());
const updateLearnerLibraryEntryMock = vi.hoisted(() => vi.fn());
const deleteLearnerLibraryEntryMock = vi.hoisted(() => vi.fn());

vi.mock('../../../hooks/useLearnerDashboard.js', () => ({
  useLearnerDashboardSection: useLearnerDashboardSectionMock
}));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: useAuthMock
}));

vi.mock('../../../api/ebookApi.js', () => ({
  createEbookPurchaseIntent: vi.fn(),
  listMarketplaceEbooks: listMarketplaceEbooksMock
}));

vi.mock('../../../api/learnerDashboardApi.js', () => ({
  resumeEbook: resumeEbookMock,
  shareEbookHighlight: shareEbookHighlightMock,
  createLearnerLibraryEntry: createLearnerLibraryEntryMock,
  updateLearnerLibraryEntry: updateLearnerLibraryEntryMock,
  deleteLearnerLibraryEntry: deleteLearnerLibraryEntryMock
}));

describe('<LearnerEbooks />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMarketplaceEbooksMock.mockResolvedValue([]);
    shareEbookHighlightMock.mockResolvedValue({ message: 'Highlight shared with your selected contacts.' });
    resumeEbookMock.mockResolvedValue({ message: 'E-book resumed' });
    createLearnerLibraryEntryMock.mockResolvedValue({});
    updateLearnerLibraryEntryMock.mockResolvedValue({});
    deleteLearnerLibraryEntryMock.mockResolvedValue({});
    useLearnerDashboardSectionMock.mockReturnValue({
      isLearner: true,
      section: {
        library: [
          {
            id: 'ebook-1',
            title: 'Design Systems Handbook',
            format: 'Guide',
            progress: 42,
            lastOpened: '2024-05-10',
            author: 'Una Kravets',
            tags: ['design', 'systems'],
            url: 'https://example.com/design-systems'
          },
          {
            id: 'ebook-2',
            title: 'Growth Experiments',
            format: 'Playbook',
            progress: 18,
            lastOpened: '2024-04-01',
            author: 'Kai Growth',
            tags: ['growth', 'experiments']
          }
        ],
        recommendations: []
      },
      refresh: vi.fn(),
      loading: false,
      error: null
    });
    useAuthMock.mockReturnValue({ session: { tokens: { accessToken: 'token-789' } } });
  });

  it('filters library entries by search query and selected format', async () => {
    const user = userEvent.setup();
    render(<LearnerEbooks />);

    await user.type(screen.getByLabelText(/search library/i), 'design');
    await user.selectOptions(screen.getByLabelText(/format filter/i), 'guide');

    await waitFor(() => {
      expect(screen.getByText('Design Systems Handbook')).toBeInTheDocument();
      expect(screen.queryByText('Growth Experiments')).not.toBeInTheDocument();
    });
  });

  it('validates and submits the highlight sharing workflow', async () => {
    const user = userEvent.setup();
    render(<LearnerEbooks />);

    const shareButtons = screen.getAllByRole('button', { name: /share highlight/i });
    await user.click(shareButtons[0]);

    const snippetInput = screen.getByLabelText(/highlight snippet/i);
    const recipientsInput = screen.getByLabelText(/email recipients/i);

    await user.type(snippetInput, 'Too short');
    await user.click(screen.getByRole('button', { name: /publish highlight/i }));

    await waitFor(() => {
      expect(screen.getByText(/share at least a short excerpt/i)).toBeInTheDocument();
    });

    await user.clear(snippetInput);
    await user.type(snippetInput, 'Design systems align teams and scale quality.');
    await user.type(recipientsInput, 'mentor@example.com');

    await user.click(screen.getByRole('button', { name: /publish highlight/i }));

    await waitFor(() => {
      expect(shareEbookHighlightMock).toHaveBeenCalledWith({
        token: 'token-789',
        ebookId: 'ebook-1',
        payload: expect.objectContaining({
          snippet: 'Design systems align teams and scale quality.',
          recipients: ['mentor@example.com'],
          shareWithCommunity: true
        })
      });
      expect(screen.getByRole('status')).toHaveTextContent(/highlight shared/i);
    });

    expect(screen.queryByLabelText(/highlight snippet/i)).not.toBeInTheDocument();
  });

  it('renders an access restriction when the viewer is not a learner', () => {
    useLearnerDashboardSectionMock.mockReturnValueOnce({
      isLearner: false,
      section: null,
      refresh: vi.fn(),
      loading: false,
      error: null
    });

    render(<LearnerEbooks />);

    expect(screen.getByText(/Learner Learnspace required/i)).toBeInTheDocument();
  });
});
