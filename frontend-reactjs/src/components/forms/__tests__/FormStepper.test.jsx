import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FormStepper from '../FormStepper.jsx';

describe('FormStepper', () => {
  const steps = [
    { id: 'details', title: 'Details', description: 'Tell us about the launch' },
    { id: 'pricing', title: 'Pricing', description: 'Set your tuition vibes' },
    { id: 'publish', title: 'Publish', description: 'Double-check the experience' }
  ];

  it('highlights the active step and keeps completed steps marked', () => {
    render(<FormStepper steps={steps} currentStep="pricing" />);

    const activeButton = screen.getByRole('button', { name: /pricing step 2/i });
    expect(activeButton).toHaveAttribute('aria-current', 'step');

    const completedButton = screen.getByRole('button', { name: /details step 1/i });
    expect(completedButton).not.toHaveAttribute('aria-current');
    expect(completedButton.querySelector('svg')).toBeTruthy();

    const pendingButton = screen.getByRole('button', { name: /publish step 3/i });
    expect(pendingButton).not.toHaveAttribute('aria-current');
    expect(pendingButton.querySelector('svg')).toBeNull();
  });

  it('notifies when a step is selected', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<FormStepper steps={steps} currentStep="details" onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /publish step 3/i }));
    expect(onSelect).toHaveBeenCalledWith('publish');
  });
});
