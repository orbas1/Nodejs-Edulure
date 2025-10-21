import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { LanguageProvider } from '../../../context/LanguageContext.jsx';
import LanguageSelector from '../LanguageSelector.jsx';
import HeaderMegaMenu from '../HeaderMegaMenu.jsx';
import MobileMegaMenu from '../MobileMegaMenu.jsx';
import UserMenu from '../UserMenu.jsx';

function renderWithRouter(ui) {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={["/dashboard/learner"]}>{ui}</MemoryRouter>
    </LanguageProvider>
  );
}

describe('Navigation menus', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('lets users change their language preference', async () => {
    const user = userEvent.setup();
    renderWithRouter(<LanguageSelector />);

    await user.click(screen.getByRole('button', { name: /language/i }));
    await user.click(screen.getByRole('option', { name: /français/i }));

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('fr');
    });
  });

  it('renders a desktop mega menu with quick actions', async () => {
    const user = userEvent.setup();
    const item = {
      id: 'products-desktop',
      label: 'Products',
      heading: 'Ship learning experiences',
      description: 'Tools that keep your operators in flow.',
      matches: ['/dashboard/learner'],
      sections: [
        {
          id: 'programs',
          title: 'Programs',
          caption: 'Launch-ready stacks',
          items: [
            { id: 'cohorts', name: 'Cohort studio', description: 'Stack templates quickly.', to: '/programs/cohorts' }
          ]
        }
      ],
      quickActions: [
        { id: 'new-cohort', label: 'New cohort', description: 'Spin up a cohort', to: '/dashboard/learner/programs/new' }
      ]
    };

    renderWithRouter(<HeaderMegaMenu item={item} />);

    await user.click(screen.getByRole('button', { name: /products/i }));

    expect(
      await screen.findByRole('link', { name: /cohort studio/i })
    ).toHaveAttribute('href', '/programs/cohorts');
    expect(
      await screen.findByRole('link', { name: /new cohort/i })
    ).toHaveAttribute('href', '/dashboard/learner/programs/new');
  });

  it('renders a mobile mega menu list that respects navigation callbacks', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const item = {
      id: 'products-mobile',
      label: 'Products',
      sections: [
        {
          id: 'programs',
          title: 'Programs',
          items: [
            { id: 'cohorts', name: 'Cohort studio', description: 'Stack templates quickly.', to: '/programs/cohorts' }
          ]
        }
      ],
      quickActions: [
        { id: 'cta', label: 'New cohort', description: 'Spin up a cohort', to: '/programs/new' }
      ]
    };

    renderWithRouter(<MobileMegaMenu item={item} onNavigate={onNavigate} />);

    await user.click(screen.getByRole('button', { name: /products/i }));
    await user.click(screen.getByRole('link', { name: /cohort studio/i }));

    expect(onNavigate).toHaveBeenCalled();
  });

  it('shows user menu actions for navigation and logout', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onLogout = vi.fn();

    renderWithRouter(
      <UserMenu
        onNavigate={onNavigate}
        onLogout={onLogout}
        session={{ user: { firstName: 'Jamie', lastName: 'Lee', email: 'jamie@example.com', role: 'admin' } }}
      />
    );

    await user.click(screen.getByRole('button', { name: /jamie lee/i }));
    await user.click(screen.getByRole('menuitem', { name: /workspace dashboard/i }));
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/admin');

    await user.click(screen.getByRole('button', { name: /jamie lee/i }));
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }));
    expect(onLogout).toHaveBeenCalled();
  });
});
