import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import StatsBar from '../../../src/components/StatsBar.jsx';
import TopBar from '../../../src/components/TopBar.jsx';
import CalendarEventDialog from '../../../src/components/calendar/CalendarEventDialog.jsx';
import CommunityCrudManager from '../../../src/components/community/CommunityCrudManager.jsx';
import { LanguageProvider } from '../../../src/context/LanguageContext.jsx';

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn()
}));

const { adminControlApiMock } = vi.hoisted(() => ({
  adminControlApiMock: {
    listCommunities: vi.fn(),
    createCommunity: vi.fn(),
    updateCommunity: vi.fn(),
    deleteCommunity: vi.fn()
  }
}));

vi.mock('../../../src/context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('../../../src/api/adminControlApi.js', () => ({
  __esModule: true,
  default: adminControlApiMock,
  listCommunities: adminControlApiMock.listCommunities,
  createCommunity: adminControlApiMock.createCommunity,
  updateCommunity: adminControlApiMock.updateCommunity,
  deleteCommunity: adminControlApiMock.deleteCommunity
}));

global.requestAnimationFrame = (callback) => {
  if (typeof callback === 'function') {
    callback();
  }
  return 0;
};

describe('Group 40 core components', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseAuth.mockReset();
    Object.values(adminControlApiMock).forEach((fn) => fn.mockReset());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders StatsBar with custom stats and headline', () => {
    render(
      <StatsBar
        eyebrow="Momentum update"
        headline="Our operators are thriving"
        stats={[
          {
            label: 'Live cohorts',
            value: '42',
            helper: 'Running this week'
          },
          {
            label: 'Communities',
            value: '128'
          }
        ]}
      />
    );

    expect(screen.getByText('Momentum update')).toBeInTheDocument();
    expect(screen.getByText('Our operators are thriving')).toBeInTheDocument();
    expect(screen.getByText('Live cohorts')).toBeInTheDocument();
    expect(screen.getByText('Running this week')).toBeInTheDocument();
  });

  it('handles TopBar interactions and counters', async () => {
    const onSearchSubmit = vi.fn();
    const onOpenMessages = vi.fn();
    const onOpenNotifications = vi.fn();
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <TopBar
          communities={[
            { id: 1, name: 'Launch Lab', description: 'Build cohorts' },
            { id: 2, name: 'Community Guild', description: 'Engagement rituals' }
          ]}
          selectedCommunity={{ id: 1, name: 'Launch Lab' }}
          onCommunityChange={() => {}}
          onSearchSubmit={onSearchSubmit}
          messageCount={12}
          notificationCount={3}
          onOpenMessages={onOpenMessages}
          onOpenNotifications={onOpenNotifications}
          profileImageUrl="https://example.com/avatar.png"
          profileAlt="Ada Lovelace"
        />
      </LanguageProvider>
    );

    const searchbox = screen.getByRole('searchbox', { name: /search the catalogue/i });
    await user.type(searchbox, ' growth ');
    await user.keyboard('{Enter}');

    expect(onSearchSubmit).toHaveBeenCalledWith('growth');

    await user.click(screen.getByLabelText('Open community messages'));
    await user.click(screen.getByLabelText('Open community notifications'));

    expect(onOpenMessages).toHaveBeenCalledTimes(1);
    expect(onOpenNotifications).toHaveBeenCalledTimes(1);
    expect(screen.getByAltText('Ada Lovelace')).toHaveAttribute('src', 'https://example.com/avatar.png');
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('submits calendar events with validation and closes on escape', async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <CalendarEventDialog
        isOpen
        mode="create"
        initialData={{ type: 'event' }}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );

    await user.type(screen.getByLabelText('Title'), 'Trust workshop');
    await user.type(screen.getByLabelText('Start time'), '2024-05-20T10:00');
    await user.type(screen.getByLabelText('End time'), '2024-05-20T11:00');
    await user.type(screen.getByLabelText('Host or facilitator'), 'Jamie');

    await user.click(screen.getByRole('button', { name: 'Create schedule' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.title).toBe('Trust workshop');
    expect(submitted.startAt).toBe('2024-05-20T10:00');
    expect(submitted.endAt).toBe('2024-05-20T11:00');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('enforces RBAC in CommunityCrudManager and creates a community when authorised', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ session: { user: { role: 'member', permissions: [] } } });

    const { rerender } = render(<CommunityCrudManager />);
    expect(screen.getByText(/console locked/i)).toBeInTheDocument();
    expect(adminControlApiMock.listCommunities).not.toHaveBeenCalled();

    mockUseAuth.mockReturnValue({
      session: {
        user: { role: 'admin', permissions: [] },
        tokens: { accessToken: 'admin-token' }
      }
    });
    adminControlApiMock.listCommunities.mockResolvedValue({ data: [] });
    adminControlApiMock.createCommunity.mockResolvedValue({ id: 99 });

    rerender(<CommunityCrudManager />);

    await waitFor(() => expect(adminControlApiMock.listCommunities).toHaveBeenCalled());

    await user.type(screen.getByLabelText('Name'), 'Growth Guild');
    await user.type(screen.getByLabelText('Slug'), 'growth-guild');
    await user.type(screen.getByLabelText('Description'), 'Test description');

    await user.click(screen.getByRole('button', { name: /Governance step/i }));
    await user.type(screen.getByLabelText('Owner ID'), '45');

    await user.click(screen.getByRole('button', { name: /Create community/i }));

    await waitFor(() => {
      expect(adminControlApiMock.createCommunity).toHaveBeenCalledWith({
        token: 'admin-token',
        payload: expect.objectContaining({
          name: 'Growth Guild',
          slug: 'growth-guild',
          ownerId: 45,
          visibility: 'public',
          metadata: {}
        })
      });
    });
  });
});
