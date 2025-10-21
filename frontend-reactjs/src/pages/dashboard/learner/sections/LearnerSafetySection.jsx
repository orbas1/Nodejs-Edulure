import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  LockClosedIcon,
  EnvelopeOpenIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

const privacyPropType = PropTypes.shape({
  visibility: PropTypes.string,
  followApprovalRequired: PropTypes.bool,
  shareActivity: PropTypes.bool,
  messagePermission: PropTypes.string
});

const messagingPropType = PropTypes.shape({
  notificationsEnabled: PropTypes.bool,
  unreadThreads: PropTypes.number
});

const followersPropType = PropTypes.shape({
  followers: PropTypes.number,
  following: PropTypes.number,
  pending: PropTypes.array,
  outgoing: PropTypes.array
});

function StatusPill({ tone, children }) {
  const toneClass = {
    good: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    warn: 'bg-amber-100 text-amber-700 border border-amber-200',
    info: 'bg-primary/10 text-primary-dark border border-primary/20'
  }[tone];

  return <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', toneClass)}>{children}</span>;
}

StatusPill.propTypes = {
  tone: PropTypes.oneOf(['good', 'warn', 'info']).isRequired,
  children: PropTypes.node.isRequired
};

function SafetyCard({ icon: Icon, title, description, items, tone }) {
  const toneIconClass = tone === 'warn' ? 'text-amber-500' : tone === 'good' ? 'text-emerald-500' : 'text-primary';
  const ToneIcon = tone === 'warn' ? ShieldExclamationIcon : ShieldCheckIcon;

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <ToneIcon className={clsx('h-5 w-5', toneIconClass)} />
      </div>
      <ul className="space-y-2 text-xs text-slate-600">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <StatusPill tone={item.tone}>{item.status}</StatusPill>
            <span className="break-words">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

SafetyCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      tone: PropTypes.oneOf(['good', 'warn', 'info']).isRequired
    })
  ).isRequired,
  tone: PropTypes.oneOf(['good', 'warn', 'info']).isRequired
};

function normaliseVisibility(value) {
  switch (value) {
    case 'private':
      return 'Private';
    case 'followers':
      return 'Followers only';
    case 'workspace':
      return 'Workspace';
    case 'everyone':
      return 'Public';
    default:
      return 'Workspace';
  }
}

function normaliseMessagePermission(value) {
  switch (value) {
    case 'instructors_only':
      return 'Instructors only';
    case 'followers':
      return 'Followers';
    case 'everyone':
    default:
      return 'Everyone';
  }
}

export default function LearnerSafetySection({ privacy, messaging, followers, unreadMessages, className }) {
  const pendingApprovals = Array.isArray(followers?.pending) ? followers.pending.length : Number(followers?.pending ?? 0);
  const outgoingRequests = Array.isArray(followers?.outgoing) ? followers.outgoing.length : Number(followers?.outgoing ?? 0);
  const followerCount = Number(followers?.followers ?? 0);
  const followingCount = Number(followers?.following ?? 0);
  const followApprovalRequired = Boolean(privacy?.followApprovalRequired);
  const shareActivity = Boolean(privacy?.shareActivity);
  const notificationsEnabled = Boolean(messaging?.notificationsEnabled);

  const privacyTone = followApprovalRequired ? 'good' : 'warn';
  const messagingTone = unreadMessages > 0 ? 'warn' : notificationsEnabled ? 'good' : 'info';
  const networkTone = pendingApprovals > 0 ? 'info' : 'good';

  const privacyItems = [
    {
      label: 'Profile visibility',
      status: normaliseVisibility(privacy?.visibility),
      tone: privacy?.visibility === 'everyone' ? 'warn' : 'good'
    },
    {
      label: 'Follow approvals',
      status: followApprovalRequired ? 'Required' : 'Auto-approve',
      tone: followApprovalRequired ? 'good' : 'warn'
    },
    {
      label: 'Activity broadcast',
      status: shareActivity ? 'Enabled' : 'Muted',
      tone: shareActivity ? 'info' : 'good'
    }
  ];

  const messagingItems = [
    {
      label: 'Message permissions',
      status: normaliseMessagePermission(privacy?.messagePermission),
      tone: privacy?.messagePermission === 'everyone' ? 'info' : 'good'
    },
    {
      label: 'Inbox moderation',
      status: unreadMessages > 0 ? `${unreadMessages} awaiting` : 'Clear',
      tone: unreadMessages > 0 ? 'warn' : 'good'
    },
    {
      label: 'Push notifications',
      status: notificationsEnabled ? 'Enabled' : 'Disabled',
      tone: notificationsEnabled ? 'good' : 'warn'
    }
  ];

  const networkItems = [
    {
      label: 'Followers',
      status: `${followerCount}`,
      tone: 'info'
    },
    {
      label: 'Following',
      status: `${followingCount}`,
      tone: 'info'
    },
    {
      label: 'Pending approvals',
      status: `${pendingApprovals}`,
      tone: pendingApprovals > 0 ? 'warn' : 'good'
    },
    {
      label: 'Outgoing requests',
      status: `${outgoingRequests}`,
      tone: 'info'
    }
  ];

  return (
    <section className={clsx('dashboard-section h-full', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="dashboard-kicker">Safety & controls</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Security posture across your Learnspace</h3>
          <p className="mt-2 text-sm text-slate-600">
            Review privacy, messaging, and network safeguards. Enterprise policies keep sensitive cohorts aligned to SOC2 and GDPR protocols.
          </p>
        </div>
        <StatusPill tone={unreadMessages > 0 ? 'warn' : 'good'}>
          {unreadMessages > 0 ? `${unreadMessages} unread messages` : 'Inbox clear'}
        </StatusPill>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SafetyCard
          icon={LockClosedIcon}
          title="Privacy controls"
          description="Visibility and approval workflows"
          items={privacyItems}
          tone={privacyTone}
        />
        <SafetyCard
          icon={EnvelopeOpenIcon}
          title="Messaging guardrails"
          description="Direct communication settings"
          items={messagingItems}
          tone={messagingTone}
        />
        <SafetyCard
          icon={UsersIcon}
          title="Network health"
          description="Community relationship hygiene"
          items={networkItems}
          tone={networkTone}
        />
      </div>
    </section>
  );
}

LearnerSafetySection.propTypes = {
  privacy: privacyPropType,
  messaging: messagingPropType,
  followers: followersPropType,
  unreadMessages: PropTypes.number,
  className: PropTypes.string
};

LearnerSafetySection.defaultProps = {
  privacy: null,
  messaging: null,
  followers: null,
  unreadMessages: 0,
  className: ''
};
