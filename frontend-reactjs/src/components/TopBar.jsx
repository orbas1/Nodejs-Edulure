import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import {
  BellIcon,
  ChatBubbleLeftEllipsisIcon,
  BoltIcon,
  CurrencyDollarIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import CommunitySwitcher from './CommunitySwitcher.jsx';
import GlobalSearchBar from './search/GlobalSearchBar.jsx';
import LanguageSelector from './navigation/LanguageSelector.jsx';
import { trackNavigationSelect } from '../lib/analytics.js';

function PresenceBadge({ badge, onNavigate }) {
  if (!badge) return null;
  const Icon = badge.icon ?? BoltIcon;
  const handleClick = () => {
    if (badge.to) {
      onNavigate?.(badge.to, badge.analyticsId);
    }
  };

  const content = (
    <span className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
      <Icon className="h-4 w-4" />
      <span>{badge.label}</span>
    </span>
  );

  if (!badge.to) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
    >
      <Icon className="h-4 w-4" />
      <span>{badge.label}</span>
    </button>
  );
}

PresenceBadge.propTypes = {
  badge: PropTypes.shape({
    label: PropTypes.string.isRequired,
    to: PropTypes.string,
    icon: PropTypes.elementType,
    analyticsId: PropTypes.string
  }),
  onNavigate: PropTypes.func
};

PresenceBadge.defaultProps = {
  badge: null,
  onNavigate: null
};

export default function TopBar({
  communities,
  selectedCommunity,
  onCommunityChange,
  isLoading = false,
  error = null,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onSuggestionSelect,
  isSearching = false,
  messageCount = 0,
  notificationCount = 0,
  onOpenMessages,
  onOpenNotifications,
  profileImageUrl = 'https://i.pravatar.cc/100?img=15',
  profileAlt = 'Your profile',
  presence = null,
  onNavigate,
  messagesOpen = false,
  notificationsOpen = false
}) {
  const [localSearchValue, setLocalSearchValue] = useState('');
  const resolvedSearchValue = searchValue ?? localSearchValue;

  const presenceBadges = useMemo(() => {
    if (!presence) return [];
    const badges = [];
    if (presence.liveSession) {
      badges.push({
        id: 'live-session',
        label: presence.liveSession.label ?? 'Live session in progress',
        to: presence.liveSession.to ?? null,
        icon: BoltIcon,
        analyticsId: 'community-live-session'
      });
    }
    if (presence.pendingPayout) {
      badges.push({
        id: 'pending-payout',
        label: presence.pendingPayout.label ?? 'Review pending payout',
        to: presence.pendingPayout.to ?? null,
        icon: CurrencyDollarIcon,
        analyticsId: 'community-payout-review'
      });
    }
    return badges;
  }, [presence]);

  const realtimeState = presence?.realtime;

  const handleSearchChange = (value, event) => {
    if (typeof onSearchChange === 'function') {
      onSearchChange(value, event);
    }
    if (searchValue === undefined) {
      setLocalSearchValue(value);
    }
  };

  const handleSearchSubmit = (submittedValue) => {
    if (typeof onSearchSubmit !== 'function') {
      return;
    }
    const rawValue = submittedValue ?? searchValue ?? localSearchValue ?? '';
    const trimmedValue = (rawValue ?? '').trim();
    if (trimmedValue.length === 0) {
      return;
    }
    onSearchSubmit(trimmedValue);
  };

  const handleSuggestionSelect = (suggestion) => {
    if (!suggestion) return;
    if (searchValue === undefined && suggestion.query) {
      setLocalSearchValue(suggestion.query);
    }
    return onSuggestionSelect?.(suggestion);
  };

  const handleOpenMessages = () => {
    trackNavigationSelect('community-messages', { origin: 'community-topbar' });
    if (typeof onOpenMessages === 'function') {
      onOpenMessages();
    }
  };

  const handleOpenNotifications = () => {
    trackNavigationSelect('community-notifications', { origin: 'community-topbar' });
    if (typeof onOpenNotifications === 'function') {
      onOpenNotifications();
    }
  };

  const handlePresenceNavigate = (target, analyticsId) => {
    if (target) {
      trackNavigationSelect(analyticsId ?? 'community-presence', { origin: 'community-topbar' });
      onNavigate?.(target);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex w-full flex-col gap-3 sm:max-w-xs">
        <CommunitySwitcher
          communities={communities}
          selected={selectedCommunity}
          onSelect={onCommunityChange}
          disabled={isLoading || !communities?.length}
        />
        {isLoading && <span className="text-xs font-medium text-slate-400" aria-live="polite">Loading communities…</span>}
        {!isLoading && error && (
          <span className="text-xs font-medium text-red-500" role="alert" aria-live="assertive">
            {error}
          </span>
        )}
        {presenceBadges.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {presenceBadges.map((badge) => (
              <PresenceBadge key={badge.id} badge={badge} onNavigate={handlePresenceNavigate} />
            ))}
          </div>
        ) : null}
        {typeof realtimeState === 'boolean' ? (
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <SignalIcon
              className={
                realtimeState
                  ? 'h-4 w-4 text-emerald-500'
                  : 'h-4 w-4 text-slate-300'
              }
            />
            <span>{realtimeState ? 'Realtime connected' : 'Realtime reconnecting'}</span>
          </div>
        ) : null}
      </div>
      <div className="w-full sm:flex-1">
        <GlobalSearchBar
          value={resolvedSearchValue}
          onChange={handleSearchChange}
          onSubmit={handleSearchSubmit}
          onSuggestionSelect={handleSuggestionSelect}
          loading={isSearching}
          placeholder="Search the Edulure network"
        />
      </div>
      <div className="flex items-center justify-end gap-3 text-slate-500">
        <LanguageSelector size="compact" variant="light" align="end" showLabel={false} />
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary hover:text-primary"
          aria-label="Open community messages"
          title="Open community messages"
          onClick={handleOpenMessages}
          aria-expanded={messagesOpen}
          aria-pressed={messagesOpen}
        >
          <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
          {messageCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-white">
              {messageCount > 99 ? '99+' : messageCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary hover:text-primary"
          aria-label="Open community notifications"
          title="Open community notifications"
          onClick={handleOpenNotifications}
          aria-expanded={notificationsOpen}
          aria-pressed={notificationsOpen}
        >
          <BellIcon className="h-5 w-5" />
          {notificationCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-white">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          ) : null}
        </button>
        <img
          src={profileImageUrl}
          alt={profileAlt}
          className="h-10 w-10 rounded-full border border-white shadow-md"
        />
      </div>
    </div>
  );
}

TopBar.propTypes = {
  communities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string
    })
  ).isRequired,
  selectedCommunity: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    description: PropTypes.string
  }),
  onCommunityChange: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  searchValue: PropTypes.string,
  onSearchChange: PropTypes.func,
  onSearchSubmit: PropTypes.func,
  onSuggestionSelect: PropTypes.func,
  isSearching: PropTypes.bool,
  messageCount: PropTypes.number,
  notificationCount: PropTypes.number,
  onOpenMessages: PropTypes.func,
  onOpenNotifications: PropTypes.func,
  profileImageUrl: PropTypes.string,
  profileAlt: PropTypes.string,
  presence: PropTypes.shape({
    liveSession: PropTypes.shape({
      label: PropTypes.string,
      to: PropTypes.string
    }),
    pendingPayout: PropTypes.shape({
      label: PropTypes.string,
      to: PropTypes.string
    }),
    realtime: PropTypes.bool
  }),
  onNavigate: PropTypes.func,
  messagesOpen: PropTypes.bool,
  notificationsOpen: PropTypes.bool
};

TopBar.defaultProps = {
  selectedCommunity: null,
  isLoading: false,
  error: null,
  searchValue: undefined,
  onSearchChange: null,
  onSearchSubmit: null,
  onSuggestionSelect: null,
  isSearching: false,
  messageCount: 0,
  notificationCount: 0,
  onOpenMessages: null,
  onOpenNotifications: null,
  profileImageUrl: 'https://i.pravatar.cc/100?img=15',
  profileAlt: 'Your profile',
  presence: null,
  onNavigate: null,
  messagesOpen: false,
  notificationsOpen: false
};
