import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import BlockEditor from '../BlockEditor.jsx';

describe('BlockEditor', () => {
  it('renders placeholder and allows adding a heading block', async () => {
    const handleChange = vi.fn();
    render(<BlockEditor value={[]} onChange={handleChange} />);

    expect(screen.getByText(/No blocks yet/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Add heading/i }));

    expect(handleChange).toHaveBeenCalled();
    const nextBlocks = handleChange.mock.calls.at(-1)[0];
    expect(Array.isArray(nextBlocks)).toBe(true);
    expect(nextBlocks).toHaveLength(1);
    expect(nextBlocks[0].type).toBe('heading');
  });

  it('allows editing paragraph copy', async () => {
    const handleChange = vi.fn();
    render(
      <BlockEditor value={[{ id: '1', type: 'paragraph', data: { text: 'Hello' } }]} onChange={handleChange} />
    );

    const textarea = screen.getByLabelText(/Paragraph copy/i);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Updated copy');

    const lastCall = handleChange.mock.calls.at(-1);
    expect(lastCall).toBeTruthy();
    expect(lastCall[0][0].data.text).toBe('Updated copy');
  });

  it('invokes change handler when removing a block', async () => {
    const handleChange = vi.fn();
    render(
      <BlockEditor value={[{ id: 'block-1', type: 'heading', data: { text: 'Title', level: 2 } }]} onChange={handleChange} />
    );

    await userEvent.click(screen.getByRole('button', { name: /Remove block/i }));

    const lastCall = handleChange.mock.calls.at(-1);
    expect(lastCall).toBeTruthy();
    expect(lastCall[0]).toEqual([]);
  });
});
