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

  it('supports currency formatting and loading skeleton', () => {
    const metrics = [
      { id: 'revenue', label: 'Revenue', value: 185000, format: 'currency', currency: 'USD' }
    ];

    const { rerender } = render(<AdminStats isLoading metrics={metrics} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');

    rerender(<AdminStats metrics={metrics} />);
    expect(screen.getByText(/\$185,000/)).toBeInTheDocument();
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

  it('derives support copy from support email when no footnote provided', () => {
    render(
      <AuthCard
        title="Login"
        subtitle="Enter your credentials"
        supportEmail="help@edulure.com"
      >
        <div>Form</div>
      </AuthCard>
    );

    expect(screen.getByText(/help@edulure.com/i)).toBeInTheDocument();
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

  it('surfaces error text and links accessibility attributes', () => {
    render(
      <FormField label="Workspace" name="workspace" error="Workspace slug is taken" />
    );

    expect(screen.getByText(/workspace slug is taken/i)).toBeInTheDocument();
    const input = screen.getByLabelText(/workspace/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
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

  it('clears the field when the clear button is pressed', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const handleClear = vi.fn();

    render(
      <SearchBar value="reports" onChange={handleChange} allowClear onClear={handleClear} />
    );

    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(handleChange).toHaveBeenCalledWith('', null);
    expect(handleClear).toHaveBeenCalled();
  });
});

describe('SkewedMenu', () => {
  it('falls back to default items for unknown states', () => {
    render(<SkewedMenu activeState="unknown" activeItem="Communities" />);
    expect(screen.getByRole('button', { name: /communities/i })).toHaveAttribute('class', expect.stringContaining('bg-primary'));
  });

  it('supports custom item lists', () => {
    const items = ['Overview', 'Teams'];
    const handleSelect = vi.fn();
    render(
      <SkewedMenu activeState="all" items={items} activeItem="Teams" onSelect={handleSelect} />
    );

    const teamsButton = screen.getByRole('button', { name: /teams/i });
    expect(teamsButton).toHaveAttribute('aria-pressed', 'true');
    teamsButton.click();
    expect(handleSelect).toHaveBeenCalledWith('Teams');
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

  it('respects disabled providers when custom list is supplied', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const providers = [
      {
        id: 'okta',
        label: 'Sign in with Okta',
        buttonClass: 'bg-slate-900 text-white',
        icon: <span>O</span>,
        disabled: true
      }
    ];

    render(<SocialSignOn onSelect={handleSelect} providers={providers} />);
    const oktaButton = screen.getByRole('button', { name: /sign in with okta/i });
    await user.click(oktaButton);

    expect(handleSelect).not.toHaveBeenCalled();
    expect(oktaButton).toBeDisabled();
  });
});
