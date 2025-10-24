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

function toMap(items = []) {
  const map = new Map();
  items.forEach((item, index) => {
    if (!item || !item.id) {
      return;
    }
    map.set(item.id, { ...item, index });
  });
  return map;
}

export function mergeAnnexQuickActions(staticActions = [], annexActions = []) {
  const staticMap = toMap(staticActions);
  const annexMap = toMap(annexActions);
  const ids = new Set([...staticMap.keys(), ...annexMap.keys()]);
  const merged = [];

  ids.forEach((id) => {
    const base = staticMap.get(id);
    const annex = annexMap.get(id);
    if (!base && !annex) {
      return;
    }

    const label = annex?.label ?? base?.label ?? id;
    const description =
      annex?.initiative?.product?.summary ??
      annex?.initiative?.operations?.tasks?.[0]?.label ??
      base?.description ??
      '';
    const to = annex?.to ?? base?.to ?? '#';
    const analyticsId = annex?.initiative?.product?.epicId ?? base?.analyticsId ?? id;
    const operationsTask = annex?.initiative?.operations?.tasks?.[0] ?? null;
    const runbookHref = operationsTask?.href ?? annex?.initiative?.product?.backlogRef ?? null;

    merged.push({
      id,
      label,
      description,
      to,
      icon: base?.icon ?? null,
      analyticsId,
      initiative: annex?.initiative ?? null,
      category: annex?.category ?? base?.category ?? 'quick_action',
      sortOrder: annex?.sortOrder ?? annex?.index ?? base?.index ?? 999,
      meta: {
        runbookHref,
        operationsTask
      }
    });
  });

  merged.sort((a, b) => {
    const orderDiff = (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
    if (orderDiff !== 0) {
      return orderDiff;
    }
    return String(a.label ?? '').localeCompare(String(b.label ?? ''));
  });

  const callToAction = annexActions.length
    ? merged.find((item) => annexMap.has(item.id)) ?? merged[0] ?? null
    : merged[0] ?? null;

  return { quickActions: merged, callToAction };
}

