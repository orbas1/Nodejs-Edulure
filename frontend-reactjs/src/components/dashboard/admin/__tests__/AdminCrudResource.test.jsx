import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AdminCrudResource from '../AdminCrudResource.jsx';

const baseFields = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'status', label: 'Status', type: 'select', options: [{ value: 'draft', label: 'Draft' }] }
];

const baseColumns = [
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' }
];

describe('AdminCrudResource', () => {
  const listRequest = vi.fn();
  const createRequest = vi.fn();
  const updateRequest = vi.fn();
  const deleteRequest = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    listRequest.mockReset();
    createRequest.mockReset();
    updateRequest.mockReset();
    deleteRequest.mockReset();
    listRequest.mockResolvedValue({
      data: [
        { id: 1, title: 'Creator Ops', status: 'draft' },
        { id: 2, title: 'Studio Updates', status: 'draft' }
      ],
      meta: { pagination: { page: 1, totalPages: 1, total: 2 } }
    });
    createRequest.mockResolvedValue({});
    updateRequest.mockResolvedValue({});
    deleteRequest.mockResolvedValue({});
  });

  function renderResource(overrides = {}) {
    return render(
      <AdminCrudResource
        token="token-123"
        title="Operations"
        entityName="playbook"
        listRequest={listRequest}
        createRequest={createRequest}
        updateRequest={updateRequest}
        deleteRequest={deleteRequest}
        fields={baseFields}
        columns={baseColumns}
        {...overrides}
      />
    );
  }

  it('loads items and renders results with filters', async () => {
    renderResource({ statusOptions: [{ value: 'draft', label: 'Draft' }] });

    await waitFor(() => expect(listRequest).toHaveBeenCalled());
    expect(screen.getByText('Creator Ops')).toBeInTheDocument();

    const filter = screen.getByRole('combobox');
    await userEvent.selectOptions(filter, 'draft');

    await waitFor(() => {
      expect(listRequest).toHaveBeenCalledTimes(2);
      const lastCall = listRequest.mock.calls.at(-1)[0];
      expect(lastCall.params).toMatchObject({ status: 'draft' });
    });
  });

  it('allows creating a record with validation applied', async () => {
    renderResource();
    await waitFor(() => expect(listRequest).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /new playbook/i }));
    await userEvent.type(screen.getByLabelText(/title/i), 'Launch Runbook');
    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'draft');

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(createRequest).toHaveBeenCalledWith({
        token: 'token-123',
        payload: { title: 'Launch Runbook', status: 'draft' },
        context: {}
      });
    });
  });

  it('deletes a record when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderResource();

    await waitFor(() => expect(screen.getByText('Creator Ops')).toBeInTheDocument());

    const card = screen.getByText('Creator Ops').closest('li');
    await userEvent.click(within(card).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(deleteRequest).toHaveBeenCalledWith({ token: 'token-123', id: 1, context: {} });
    });
  });
});
