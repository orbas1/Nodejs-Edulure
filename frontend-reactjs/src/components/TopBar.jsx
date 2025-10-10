import { BellIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import CommunitySwitcher from './CommunitySwitcher.jsx';
import SearchBar from './SearchBar.jsx';

export default function TopBar({ communities, selectedCommunity, onCommunityChange }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
      <CommunitySwitcher communities={communities} selected={selectedCommunity} onSelect={onCommunityChange} />
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
