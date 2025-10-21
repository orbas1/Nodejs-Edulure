import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let editorProps;

vi.mock('../../../../../src/components/profile/ProfileIdentityEditor.jsx', () => ({
  default: (props) => {
    editorProps = props;
    return <div data-testid="profile-identity-editor" />;
  }
}));

vi.mock('../../../../../src/api/userApi.js', () => ({
  fetchCurrentUser: vi.fn(),
  updateCurrentUser: vi.fn()
}));

const authState = { session: null };
const setSession = vi.fn((next) => {
  authState.session = typeof next === 'function' ? next(authState.session) : next;
});

vi.mock('../../../../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ session: authState.session, setSession })
}));

import LearnerProfileEditor from '../../../../../src/pages/dashboard/learner/sections/LearnerProfileEditor.jsx';
import { fetchCurrentUser, updateCurrentUser } from '../../../../../src/api/userApi.js';

describe('LearnerProfileEditor', () => {
  beforeEach(() => {
    editorProps = undefined;
    fetchCurrentUser.mockReset();
    updateCurrentUser.mockReset();
    setSession.mockClear();
    authState.session = { tokens: { accessToken: 'token-123' }, user: { id: 'user-1' } };
  });

  it('does not render when no access token', () => {
    authState.session = null;
    render(<LearnerProfileEditor />);
    expect(screen.queryByTestId('profile-identity-editor')).not.toBeInTheDocument();
    expect(fetchCurrentUser).not.toHaveBeenCalled();
  });

  it('loads current user and persists updates', async () => {
    fetchCurrentUser.mockResolvedValue({
      data: {
        firstName: 'Jordan',
        lastName: 'Blake',
        profile: {
          displayName: 'Jordan Blake',
          tagline: 'Creator',
          location: 'Remote',
          bio: 'Future of learning',
          avatarUrl: 'https://cdn/avatar.png',
          bannerUrl: '',
          socialLinks: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/jordan', handle: 'jordan' }]
        },
        address: {
          line1: '123 Market St',
          line2: '',
          city: 'San Francisco',
          region: 'CA',
          postalCode: '94105',
          country: 'US'
        }
      }
    });

    updateCurrentUser.mockResolvedValue({
      data: {
        firstName: 'Jordan',
        lastName: 'Blake',
        profile: {
          displayName: 'Jordan Blake',
          tagline: 'Strategist',
          location: 'Remote',
          bio: 'Future of learning',
          avatarUrl: 'https://cdn/avatar.png',
          bannerUrl: '',
          socialLinks: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/jordan', handle: 'jordan' }]
        },
        address: {
          line1: '123 Market St',
          line2: '',
          city: 'San Francisco',
          region: 'CA',
          postalCode: '94105',
          country: 'US'
        }
      },
      message: 'Updated'
    });

    const onProfileUpdated = vi.fn();
    render(<LearnerProfileEditor onProfileUpdated={onProfileUpdated} />);

    await waitFor(() => expect(fetchCurrentUser).toHaveBeenCalledWith({ token: 'token-123' }));
    expect(editorProps.form.firstName).toBe('Jordan');
    expect(editorProps.canSubmit).toBe(false);

    editorProps.onFieldChange('tagline', 'Strategist');
    await waitFor(() => expect(editorProps.canSubmit).toBe(true));

    await editorProps.onSubmit();

    expect(updateCurrentUser).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-123',
        payload: expect.objectContaining({
          firstName: 'Jordan',
          profile: expect.objectContaining({
            tagline: 'Strategist',
            socialLinks: [expect.objectContaining({ url: 'https://linkedin.com/in/jordan' })]
          })
        })
      })
    );
    expect(setSession).toHaveBeenCalled();
    expect(onProfileUpdated).toHaveBeenCalled();
  });
});
