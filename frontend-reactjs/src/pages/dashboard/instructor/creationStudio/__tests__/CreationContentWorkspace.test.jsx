import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CreationContentWorkspace from '../CreationContentWorkspace.jsx';

const baseProject = {
  title: 'AI Course Launchpad',
  status: 'draft',
  complianceNotes: []
};

describe('CreationContentWorkspace', () => {
  it('disables save button when not dirty and triggers save when dirty', async () => {
    const handleSave = vi.fn();
    const { rerender } = render(
      <CreationContentWorkspace
        project={baseProject}
        blocks={[]}
        onBlocksChange={() => {}}
        onSave={handleSave}
        saving={false}
        dirty={false}
        saveError={null}
        lastSavedAt={null}
        checklist={[]}
        checklistLoading={false}
        checklistError={null}
        onToggleTask={() => {}}
        checklistPending={[]}
        monetisationGuidance={[]}
        earnings={null}
        earningsLoading={false}
        earningsError={null}
      />
    );

    expect(screen.getByRole('button', { name: /Save draft/i })).toBeDisabled();

    rerender(
      <CreationContentWorkspace
        project={baseProject}
        blocks={[]}
        onBlocksChange={() => {}}
        onSave={handleSave}
        saving={false}
        dirty
        saveError={null}
        lastSavedAt={null}
        checklist={[]}
        checklistLoading={false}
        checklistError={null}
        onToggleTask={() => {}}
        checklistPending={[]}
        monetisationGuidance={[]}
        earnings={null}
        earningsLoading={false}
        earningsError={null}
      />
    );

    const activeSaveButton = screen.getByRole('button', { name: /Save draft/i });
    expect(activeSaveButton).not.toBeDisabled();
    await userEvent.click(activeSaveButton);
    expect(handleSave).toHaveBeenCalled();
  });

  it('renders checklist tasks and monetisation guidance', async () => {
    const handleToggle = vi.fn();
    render(
      <CreationContentWorkspace
        project={{ ...baseProject, complianceNotes: [{ type: 'policy', message: 'Add privacy disclaimer' }] }}
        blocks={[]}
        onBlocksChange={() => {}}
        onSave={() => {}}
        saving={false}
        dirty
        saveError={null}
        lastSavedAt={null}
        checklist={[{ id: 'task-1', label: 'Upload teaser video', completed: false }]}
        checklistLoading={false}
        checklistError={null}
        onToggleTask={handleToggle}
        checklistPending={[]}
        monetisationGuidance={['Bundle with coaching add-on']}
        earnings={{ grossCents: 0, netCents: 0, currency: 'USD', changePercentage: 0, bookings: 0, topProducts: [] }}
        earningsLoading={false}
        earningsError={null}
      />
    );

    expect(screen.getByText(/Upload teaser video/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Mark task complete/i }));
    expect(handleToggle).toHaveBeenCalledWith('task-1', true);
    expect(screen.getByText(/Bundle with coaching add-on/i)).toBeInTheDocument();
  });
});
