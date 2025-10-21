import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import AuthoringWorkspaceSection from '../../../../../src/pages/dashboard/instructor/courseManagement/AuthoringWorkspaceSection.jsx';

const LAST_DRAFT_KEY = 'edulure.authoring.lastDraft';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('AuthoringWorkspaceSection', () => {
  it('renders localisation coverage and persists draft selection', () => {
    const authoring = {
      drafts: [
        {
          id: 'draft-1',
          title: 'Leadership Lab refresh',
          status: 'draft',
          collaborators: [
            { id: 'user-1', displayName: 'Alex Rivers', role: 'owner' },
            { id: 'user-2', displayName: 'Morgan Hart', role: 'editor' }
          ],
          activeSessions: [
            {
              id: 'session-1',
              participant: 'Morgan Hart',
              role: 'editor',
              joinedAt: new Date().toISOString()
            }
          ],
          locales: ['en-US', 'es-ES'],
          complianceNotes: ['Update privacy copy'],
          publishingChannels: ['web'],
          analyticsTargets: { completion: '85%' }
        }
      ],
      activeSessions: [
        {
          id: 'session-1',
          participant: 'Morgan Hart',
          role: 'editor',
          projectTitle: 'Leadership Lab refresh',
          joinedAt: new Date().toISOString(),
          capabilities: ['outline-editing']
        }
      ],
      localisationCoverage: {
        totalLanguages: 4,
        publishedLanguages: 2,
        missing: ['fr-FR', 'de-DE']
      }
    };

    render(<AuthoringWorkspaceSection authoring={authoring} />);

    expect(screen.getByText('Localisation coverage')).toBeInTheDocument();
    expect(screen.getByText('Missing: fr-FR, de-DE')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /View draft/i }));

    expect(window.localStorage.getItem(LAST_DRAFT_KEY)).toBe('draft-1');
    expect(screen.getByText('Open in creation studio')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Forget local cache/i }));

    expect(window.localStorage.getItem(LAST_DRAFT_KEY)).toBeNull();
  });

  it('restores the last opened draft from persisted storage', () => {
    window.localStorage.setItem(LAST_DRAFT_KEY, 'draft-1');

    const authoring = {
      drafts: [
        {
          id: 'draft-1',
          title: 'Leadership Lab refresh',
          status: 'draft',
          collaborators: [],
          activeSessions: [],
          locales: ['en-US'],
          complianceNotes: [],
          publishingChannels: [],
          analyticsTargets: {}
        }
      ],
      activeSessions: [],
      localisationCoverage: { totalLanguages: 1, publishedLanguages: 1, missing: [] }
    };

    render(<AuthoringWorkspaceSection authoring={authoring} />);

    expect(screen.getByText('Open in creation studio')).toBeInTheDocument();
  });

  it('shows empty-state messaging when drafts are unavailable', () => {
    const authoring = {
      drafts: [],
      activeSessions: [],
      localisationCoverage: { totalLanguages: 0, publishedLanguages: 0, missing: [] }
    };

    render(<AuthoringWorkspaceSection authoring={authoring} />);

    expect(screen.getByText('No draft projects available.')).toBeInTheDocument();
  });
});
