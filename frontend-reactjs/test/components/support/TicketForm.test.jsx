import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import TicketForm from '../../../src/components/support/TicketForm.jsx';

const originalCrypto = globalThis.crypto;

const searchSupportKnowledgeBaseMock = vi.fn();

vi.mock('../../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ session: { tokens: { accessToken: 'token-123' } } })
}));

vi.mock('../../../src/api/learnerDashboardApi.js', () => ({
  searchSupportKnowledgeBase: searchSupportKnowledgeBaseMock
}));

describe('TicketForm', () => {
  beforeAll(() => {
    vi.stubGlobal('crypto', {
      ...(originalCrypto ?? {}),
      randomUUID: vi.fn(() => 'uuid-test')
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    if (originalCrypto) {
      globalThis.crypto = originalCrypto;
    } else {
      delete globalThis.crypto;
    }
  });

  beforeEach(() => {
    searchSupportKnowledgeBaseMock.mockReset();
  });

  it('submits ticket details with knowledge suggestions', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const onClose = vi.fn();
    searchSupportKnowledgeBaseMock.mockResolvedValue({
      data: {
        articles: [
          {
            id: 'kb-1',
            title: 'Reset classroom session',
            excerpt: 'Step-by-step fix',
            minutes: 5
          }
        ]
      }
    });

    render(
      <TicketForm
        open
        onClose={onClose}
        onSubmit={onSubmit}
        serviceWindow="24/7"
        firstResponseMinutes={30}
        categoryOptions={['General', 'Live classroom']}
        priorityOptions={[
          { value: 'urgent', label: 'Urgent — service outage' },
          { value: 'normal', label: 'Normal — needs response soon' }
        ]}
        defaultCategory="Live classroom"
        defaultPriority="urgent"
      />
    );

    fireEvent.change(screen.getByLabelText(/subject/i), {
      target: { value: 'Live classroom frozen' }
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    fireEvent.change(screen.getByLabelText(/describe the issue/i), {
      target: { value: 'Learners cannot join, freezing at 95%.' }
    });

    await waitFor(() => expect(searchSupportKnowledgeBaseMock).toHaveBeenCalledWith({
      token: 'token-123',
      query: expect.stringContaining('Live classroom frozen'),
      category: 'Live classroom',
      limit: 5,
      signal: expect.any(AbortSignal)
    }));

    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Live classroom frozen',
        category: 'Live classroom',
        priority: 'urgent',
        knowledgeSuggestions: [
          expect.objectContaining({ id: 'kb-1', title: 'Reset classroom session' })
        ]
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('surfaces validation errors when description is missing', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    searchSupportKnowledgeBaseMock.mockResolvedValue({ data: { articles: [] } });

    render(
      <TicketForm
        open
        onSubmit={onSubmit}
        serviceWindow="Weekdays"
        firstResponseMinutes={45}
        categoryOptions={['General']}
        priorityOptions={[{ value: 'normal', label: 'Normal' }]}
      />
    );

    fireEvent.change(screen.getByLabelText(/subject/i), {
      target: { value: 'Need help' }
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }));

    expect(await screen.findByText(/add a subject and description/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('resets state when reopened', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    searchSupportKnowledgeBaseMock.mockResolvedValue({ data: { articles: [] } });

    const { rerender } = render(
      <TicketForm
        open
        onSubmit={onSubmit}
        categoryOptions={['General']}
        priorityOptions={[{ value: 'normal', label: 'Normal' }]}
      />
    );

    fireEvent.change(screen.getByLabelText(/subject/i), {
      target: { value: 'Original subject' }
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByLabelText(/describe the issue/i), {
      target: { value: 'Original description' }
    });

    rerender(
      <TicketForm
        open={false}
        onSubmit={onSubmit}
        categoryOptions={['General']}
        priorityOptions={[{ value: 'normal', label: 'Normal' }]}
      />
    );

    rerender(
      <TicketForm
        open
        onSubmit={onSubmit}
        categoryOptions={['General']}
        priorityOptions={[{ value: 'normal', label: 'Normal' }]}
      />
    );

    expect(screen.getByLabelText(/subject/i)).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByLabelText(/describe the issue/i)).toHaveValue('');
  });
});
