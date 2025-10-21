import { describe, expect, it } from 'vitest';

import { filterThreadEntries } from '../DashboardInbox.jsx';

const buildThread = ({
  id,
  subject,
  body,
  unreadCount = 0,
  participants = []
}) => ({
  thread: { id, subject },
  latestMessage: body ? { body } : null,
  unreadCount,
  participants
});

describe('filterThreadEntries', () => {
  const baseThreads = [
    buildThread({
      id: 'thread-1',
      subject: 'Welcome to the community',
      body: 'Say hello',
      unreadCount: 0,
      participants: [
        { userId: 'user-1', user: { firstName: 'Alice', lastName: 'Wong' } },
        { userId: 'user-2', user: { firstName: 'Bruno', lastName: 'Singh' } }
      ]
    }),
    buildThread({
      id: 'thread-2',
      subject: 'Project Phoenix',
      body: 'Sprint update ready for review',
      unreadCount: 3,
      participants: [
        { userId: 'user-1', user: { firstName: 'Alice', lastName: 'Wong' } },
        { userId: 'user-3', user: { firstName: 'Cara', lastName: 'Diaz' } }
      ]
    })
  ];

  it('matches search terms against subject, participants, and recent messages', () => {
    const resultsBySubject = filterThreadEntries(baseThreads, {
      term: 'phoenix',
      filter: 'all',
      currentUserId: 'user-1'
    });
    expect(resultsBySubject.map((thread) => thread.thread.id)).toEqual(['thread-2']);

    const resultsByParticipant = filterThreadEntries(baseThreads, {
      term: 'Bruno',
      currentUserId: 'user-1'
    });
    expect(resultsByParticipant.map((thread) => thread.thread.id)).toEqual(['thread-1']);

    const resultsByMessage = filterThreadEntries(baseThreads, {
      term: 'sprint update',
      currentUserId: 'user-1'
    });
    expect(resultsByMessage.map((thread) => thread.thread.id)).toEqual(['thread-2']);
  });

  it('applies unread filtering before evaluating search terms', () => {
    const unreadOnly = filterThreadEntries(baseThreads, {
      term: 'project',
      filter: 'unread',
      currentUserId: 'user-1'
    });
    expect(unreadOnly.map((thread) => thread.thread.id)).toEqual(['thread-2']);

    const noUnreadMatch = filterThreadEntries(baseThreads, {
      term: 'welcome',
      filter: 'unread',
      currentUserId: 'user-1'
    });
    expect(noUnreadMatch).toHaveLength(0);
  });
});

