import PropTypes from 'prop-types';
import { ArrowPathIcon, CircleStackIcon } from '@heroicons/react/24/outline';

import { getChannelTypeMeta } from './channelMetadata.js';

function CommunitySelect({ communities, selectedCommunityId, onSelectCommunity }) {
  if (communities.length <= 1) return null;

  return (
    <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
      Community workspace
      <select
        value={selectedCommunityId ?? ''}
        onChange={(event) => onSelectCommunity(event.target.value || null)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {communities.map((community) => (
          <option key={community.id} value={community.id}>
            {community.title}
          </option>
        ))}
      </select>
    </label>
  );
}

CommunitySelect.propTypes = {
  communities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired
    })
  ).isRequired,
  selectedCommunityId: PropTypes.string,
  onSelectCommunity: PropTypes.func.isRequired
};

CommunitySelect.defaultProps = {
  selectedCommunityId: null
};

export default function ChannelSidebar({
  communities,
  selectedCommunityId,
  onSelectCommunity,
  channels,
  loading,
  error,
  onRefresh,
  activeChannelId,
  onSelectChannel,
  interactive
}) {
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : null
    : null;

  return (
    <aside className="flex h-full w-full flex-col gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="dashboard-kicker text-slate-500">Community command</p>
            <h2 className="text-lg font-semibold text-slate-900">Chat control centre</h2>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-primary/40 hover:text-primary"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Sync
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Monitor channels, switch cohorts, and orchestrate announcements without leaving your instructor workspace.
        </p>
        <div className="mt-4 space-y-4">
          <CommunitySelect
            communities={communities}
            selectedCommunityId={selectedCommunityId ?? undefined}
            onSelectCommunity={onSelectCommunity}
          />

          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
            {interactive ? (
              <span>Connected to live infrastructure. All updates sync instantly.</span>
            ) : (
              <span>Working in offline preview mode. Changes queue until an authenticated session is available.</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CircleStackIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            Active channels
          </div>
          <span className="text-xs text-slate-400">{channels.length} spaces</span>
        </header>

        <div
          className="custom-scrollbar h-full max-h-[520px] overflow-y-auto px-2 py-2"
          aria-busy={loading}
          aria-live="polite"
        >
          {loading ? (
            <p className="px-3 py-2 text-xs text-slate-500">Loading channels…</p>
          ) : errorMessage ? (
            <p className="px-3 py-2 text-xs text-rose-600" role="alert">
              Unable to load channels. Refresh to retry.
              <span className="mt-1 block text-[11px] text-rose-500">{errorMessage}</span>
            </p>
          ) : channels.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">No channels detected for this community yet.</p>
          ) : (
            <ul className="space-y-1">
              {channels.map((entry) => {
                const meta = getChannelTypeMeta(entry.channel?.channelType);
                const Icon = meta.icon;
                const isActive = entry.id === activeChannelId;
                const memberRole = entry.membership?.role;
                const lastActivity = entry.latestMessage?.createdAt ?? entry.channel?.updatedAt;
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => onSelectChannel(entry.id)}
                      className={`group flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                        isActive
                          ? 'bg-primary/10 text-primary shadow-inner'
                          : 'text-slate-600 hover:bg-primary/5 hover:text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-2xl border text-primary ${
                            isActive ? 'border-primary/40 bg-white' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{entry.channel?.name ?? meta.label}</p>
                          <p className="text-[11px] text-slate-400">{meta.description}</p>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        {memberRole ? <p className="capitalize">Role: {memberRole}</p> : null}
                        {lastActivity ? (
                          <p>{new Date(lastActivity).toLocaleDateString()}</p>
                        ) : null}
                        {entry.unreadCount ? (
                          <p className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-[2px] text-[10px] font-semibold text-primary">
                            {entry.unreadCount} unread
                          </p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}

ChannelSidebar.propTypes = {
  communities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired
    })
  ).isRequired,
  selectedCommunityId: PropTypes.string,
  onSelectCommunity: PropTypes.func.isRequired,
  channels: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.any,
  onRefresh: PropTypes.func.isRequired,
  activeChannelId: PropTypes.string,
  onSelectChannel: PropTypes.func.isRequired,
  interactive: PropTypes.bool.isRequired
};

ChannelSidebar.defaultProps = {
  selectedCommunityId: null,
  error: null,
  activeChannelId: null
};
