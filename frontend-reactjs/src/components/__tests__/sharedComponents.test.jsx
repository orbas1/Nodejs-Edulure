import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import AdminStats from '../AdminStats.jsx';
import AuthCard from '../AuthCard.jsx';
import FormField from '../FormField.jsx';
import SearchBar from '../SearchBar.jsx';
import SkewedMenu from '../SkewedMenu.jsx';
import SocialSignOn from '../SocialSignOn.jsx';

describe('AdminStats', () => {
  it('shows placeholder when no metrics are provided', () => {
    render(<AdminStats metrics={[]} />);
    expect(screen.getByText(/performance metrics will appear here/i)).toBeInTheDocument();
  });

  it('formats numeric values into compact notation', () => {
    const metrics = [
      { id: 'enrollments', label: 'Enrollments', value: 12450, change: '+12%', trend: 'up' }
    ];
    render(<AdminStats metrics={metrics} />);
    expect(screen.getByText(/12\.5k/i)).toBeInTheDocument();
  });
});

describe('AuthCard', () => {
  it('renders custom highlights when provided', () => {
    const highlights = ['Fast onboarding', 'Guided compliance checks'];
    render(
      <AuthCard title="Join Edulure" subtitle="Create your operator account" highlights={highlights}>
        <div>Form content</div>
      </AuthCard>
    );

    expect(screen.getByText(/fast onboarding/i)).toBeInTheDocument();
    expect(screen.getByText(/guided compliance checks/i)).toBeInTheDocument();
  });
});

describe('FormField', () => {
  it('renders helper content and forwards props to the input', () => {
    render(
      <FormField label="Email" name="email" placeholder="name@example.com" helper={<span>Required</span>} />
    );

    const input = screen.getByPlaceholderText(/name@example.com/i);
    expect(input).toBeInTheDocument();
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });
});

describe('SearchBar', () => {
  it('calls onSubmit with the entered value', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<SearchBar onSubmit={handleSubmit} />);

    const input = screen.getByRole('searchbox');
    await user.type(input, 'analytics');
    await user.keyboard('{Enter}');

    expect(handleSubmit).toHaveBeenCalledWith('analytics', expect.any(Object));
  });
});

describe('SkewedMenu', () => {
  it('falls back to default items for unknown states', () => {
    render(<SkewedMenu activeState="unknown" activeItem="Communities" />);
    expect(screen.getByRole('button', { name: /communities/i })).toHaveAttribute('class', expect.stringContaining('bg-primary'));
  });
});

describe('SocialSignOn', () => {
  it('notifies parent when a provider is selected', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(<SocialSignOn onSelect={handleSelect} />);

    await user.click(screen.getByRole('button', { name: /sign in with google/i }));
    expect(handleSelect).toHaveBeenCalledWith('google');
  });
});
