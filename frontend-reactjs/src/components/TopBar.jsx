import PropTypes from 'prop-types';
import { useState } from 'react';
import { BellIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import CommunitySwitcher from './CommunitySwitcher.jsx';
import SearchBar from './SearchBar.jsx';
import LanguageSelector from './navigation/LanguageSelector.jsx';

export default function TopBar({
  communities,
  selectedCommunity,
  onCommunityChange,
  isLoading = false,
  error = null,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  isSearching = false,
  messageCount = 0,
  notificationCount = 0,
  onOpenMessages,
  onOpenNotifications,
  profileImageUrl = 'https://i.pravatar.cc/100?img=15',
  profileAlt = 'Your profile'
}) {
  const [localSearchValue, setLocalSearchValue] = useState('');
  const resolvedSearchValue = searchValue ?? localSearchValue;

  const handleSearchChange = (value, event) => {
    if (typeof onSearchChange === 'function') {
      onSearchChange(value, event);
    }
    if (searchValue === undefined) {
      setLocalSearchValue(value);
    }
  };

  const handleSearchSubmit = (event) => {
    if (typeof onSearchSubmit === 'function') {
      const formValue = event?.target?.search?.value;
      const rawValue = searchValue ?? localSearchValue ?? formValue ?? '';
      const trimmedValue = (formValue ?? rawValue ?? '').trim();
      onSearchSubmit(trimmedValue);
    }
  };

  const handleOpenMessages = () => {
    if (typeof onOpenMessages === 'function') {
      onOpenMessages();
    }
  };

  const handleOpenNotifications = () => {
    if (typeof onOpenNotifications === 'function') {
      onOpenNotifications();
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex w-full flex-col gap-2 sm:max-w-xs">
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
      </div>
      <div className="w-full sm:flex-1">
        <SearchBar
          value={resolvedSearchValue}
          onChange={handleSearchChange}
          onSubmit={handleSearchSubmit}
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
  isSearching: PropTypes.bool,
  messageCount: PropTypes.number,
  notificationCount: PropTypes.number,
  onOpenMessages: PropTypes.func,
  onOpenNotifications: PropTypes.func,
  profileImageUrl: PropTypes.string,
  profileAlt: PropTypes.string
};
