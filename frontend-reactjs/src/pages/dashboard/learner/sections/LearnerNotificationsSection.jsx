import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  BellAlertIcon,
  ChatBubbleLeftEllipsisIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

const notificationPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  title: PropTypes.string.isRequired,
  timestamp: PropTypes.string.isRequired,
  type: PropTypes.string
});

const toneByType = {
  social: { icon: UserGroupIcon, bg: 'bg-primary/10 text-primary', label: 'Community' },
  learning: { icon: ClipboardDocumentCheckIcon, bg: 'bg-emerald-100 text-emerald-700', label: 'Learning' },
  messaging: { icon: ChatBubbleLeftEllipsisIcon, bg: 'bg-sky-100 text-sky-700', label: 'Messages' }
};

function resolveTone(type) {
  return toneByType[type] ?? { icon: BellAlertIcon, bg: 'bg-slate-200 text-slate-700', label: 'Update' };
}

function NotificationRow({ notification }) {
  const tone = resolveTone(notification.type);
  const Icon = tone.icon;

  return (
    <li className="flex gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <span className={clsx('flex h-11 w-11 items-center justify-center rounded-xl', tone.bg)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
        <p className="mt-1 text-xs text-slate-500">{notification.timestamp}</p>
      </div>
      <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {tone.label}
      </span>
    </li>
  );
}

NotificationRow.propTypes = {
  notification: notificationPropType.isRequired
};

export default function LearnerNotificationsSection({ notifications, total, onRefresh, className }) {
  const handleRefresh = () => {
    if (typeof onRefresh === 'function') {
      onRefresh();
    }
  };

  if (!Array.isArray(notifications) || notifications.length === 0) {
    return (
      <section className={clsx('dashboard-section h-full', className)}>
        <p className="dashboard-kicker">Notifications</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">You&rsquo;re all caught up</h3>
        <p className="mt-2 text-sm text-slate-600">We&rsquo;ll surface classroom, community, and messaging alerts here as soon as they arrive.</p>
        <button
          type="button"
          onClick={handleRefresh}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          disabled={typeof onRefresh !== 'function'}
        >
          Refresh feed
        </button>
      </section>
    );
  }

  return (
    <section className={clsx('dashboard-section h-full', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="dashboard-kicker">Notifications</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Latest actions requiring your attention</h3>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-dark">
          {total > notifications.length ? `${notifications.length}/${total}` : `${notifications.length}`} open
        </span>
      </div>
      <ul className="mt-4 space-y-4">
        {notifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} />
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
        <span>Alerts sync every 5 minutes with enterprise-grade webhooks.</span>
        {typeof onRefresh === 'function' ? (
          <button
            type="button"
            onClick={handleRefresh}
            className="text-xs font-semibold text-primary transition hover:text-primary-dark"
          >
            Refresh now
          </button>
        ) : null}
      </div>
    </section>
  );
}

LearnerNotificationsSection.propTypes = {
  notifications: PropTypes.arrayOf(notificationPropType),
  total: PropTypes.number,
  onRefresh: PropTypes.func,
  className: PropTypes.string
};

LearnerNotificationsSection.defaultProps = {
  notifications: [],
  total: 0,
  onRefresh: undefined,
  className: ''
};
