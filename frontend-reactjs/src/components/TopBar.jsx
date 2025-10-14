import PropTypes from 'prop-types';
import { BellIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import CommunitySwitcher from './CommunitySwitcher.jsx';
import SearchBar from './SearchBar.jsx';

export default function TopBar({
  communities,
  selectedCommunity,
  onCommunityChange,
  isLoading = false,
  error = null,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  isSearching = false
}) {
  const handleSearchChange = (value, event) => {
    if (typeof onSearchChange === 'function') {
      onSearchChange(value, event);
    }
  };

  const handleSearchSubmit = (event) => {
    if (typeof onSearchSubmit === 'function') {
      const inputValue = event?.target?.search?.value ?? '';
      onSearchSubmit(inputValue);
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
          value={searchValue}
          onChange={handleSearchChange}
          onSubmit={handleSearchSubmit}
          loading={isSearching}
          placeholder="Search the Edulure network"
        />
      </div>
      <div className="flex items-center justify-end gap-3 text-slate-500">
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary hover:text-primary"
          aria-label="Open community messages"
        >
          <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
            3
          </span>
        </button>
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary hover:text-primary"
          aria-label="Open community notifications"
        >
          <BellIcon className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white">
            7
          </span>
        </button>
        <img
          src="https://i.pravatar.cc/100?img=15"
          alt="Your profile"
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
  isSearching: PropTypes.bool
};
