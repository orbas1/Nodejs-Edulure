import PropTypes from 'prop-types';
import { BellIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import CommunitySwitcher from './CommunitySwitcher.jsx';
import SearchBar from './SearchBar.jsx';

export default function TopBar({ communities, selectedCommunity, onCommunityChange, isLoading = false, error = null }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
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
      <div className="flex-1 min-w-[240px]">
        <SearchBar placeholder="Search the Edulure network" />
      </div>
      <div className="flex items-center gap-3 text-slate-500">
        <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary hover:text-primary">
          <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
            3
          </span>
        </button>
        <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary hover:text-primary">
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
  error: PropTypes.string
};
