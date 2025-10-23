export function deriveQuickActions(role) {
  if (!role) return [];
  const normalised = role.toLowerCase();
  if (normalised === 'instructor') {
    return ['create-post', 'launch-session', 'upload-course'];
  }
  if (normalised === 'admin') {
    return ['launch-session', 'upload-course'];
  }
  return ['create-post'];
}

export function buildShellNotifications(session) {
  const role = session?.user?.role?.toLowerCase() ?? 'guest';
  const notifications = [];
  if (session?.user?.unreadCommunityCount) {
    notifications.push({
      id: 'community-unread',
      title: 'New community conversations',
      summary: `${session.user.unreadCommunityCount} new updates across your cohorts.`,
      timestamp: 'Just now',
      groupId: 'communities',
      unread: true,
      type: 'default',
      href: '/dashboard/learner/communities'
    });
  }
  if (role === 'instructor') {
    notifications.push({
      id: 'course-submissions',
      title: 'Assignments ready to review',
      summary: 'Learners submitted coursework that needs feedback.',
      timestamp: '8 minutes ago',
      groupId: 'courses',
      unread: false,
      type: 'default',
      href: '/dashboard/instructor/assessments'
    });
  }
  if (role === 'admin') {
    notifications.push({
      id: 'payout-approval',
      title: 'Payout approval required',
      summary: 'A payout over the manual approval threshold is waiting in finance.',
      timestamp: '12 minutes ago',
      groupId: 'payouts',
      unread: true,
      type: 'warning',
      href: '/dashboard/admin/finance'
    });
  }
  return notifications;
}

export function derivePresence(session, realtimeConnected) {
  if (!session?.user) return null;
  const presence = {};
  if (session.user.activeLiveRoom) {
    presence.liveSession = {
      label: 'Rejoin live classroom',
      description: 'A live session you host is in progress.',
      to: `/dashboard/${session.user.role?.toLowerCase() ?? 'instructor'}/live-classes`
    };
  }
  if (session.user.pendingPayouts > 0) {
    presence.pendingPayout = {
      label: 'Review pending payout',
      description: `${session.user.pendingPayouts} payout${session.user.pendingPayouts === 1 ? '' : 's'} need approval.`,
      to: '/dashboard/admin/finance'
    };
  }
  presence.realtime = realtimeConnected;
  return presence;
}

