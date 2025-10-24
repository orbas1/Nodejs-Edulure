import PropTypes from 'prop-types';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CircleStackIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

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
  interactive,
  socialGraph,
  directMessages,
  directMessagesLoading,
  onSelectDirectRecipient,
  onOpenDirectThread
}) {
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : null
    : null;

  const presenceSummary = socialGraph?.stats?.presence;
  const topConnectors = Array.isArray(socialGraph?.topConnectors)
    ? socialGraph.topConnectors.slice(0, 3)
    : [];
  const directThreads = Array.isArray(directMessages?.threads)
    ? directMessages.threads.slice(0, 3)
    : [];
  const directSuggestions = Array.isArray(directMessages?.suggestions)
    ? directMessages.suggestions.slice(0, 3)
    : [];

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

          {presenceSummary ? (
            <div className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-[11px] text-slate-500">
              <p className="font-semibold uppercase tracking-wide text-slate-500">Live presence</p>
              <div className="flex flex-wrap gap-2">
                <span className="dashboard-pill px-3 py-1">
                  Online {presenceSummary.byStatus?.online ?? 0}
                </span>
                <span className="dashboard-pill px-3 py-1">
                  Away {presenceSummary.byStatus?.away ?? 0}
                </span>
                <span className="dashboard-pill px-3 py-1">
                  Offline {presenceSummary.byStatus?.offline ?? 0}
                </span>
              </div>
              {presenceSummary.recent?.length ? (
                <p className="text-[11px] text-slate-400">
                  Recent activity: {presenceSummary.recent.map((member) => member.displayName).join(', ')}
                </p>
              ) : null}
            </div>
          ) : null}

          {topConnectors.length ? (
            <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Top connectors</p>
              <ul className="space-y-2 text-xs text-slate-600">
                {topConnectors.map((connector) => (
                  <li key={connector.id} className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-700">{connector.displayName}</span>
                    <span className="text-[11px] text-slate-400">
                      {connector.peerCount} peers · {connector.channelCount} channels
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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

      <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CircleStackIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            Direct connections
          </div>
          <span className="text-xs text-slate-400">
            {directThreads.length} threads · {directSuggestions.length} suggestions
          </span>
        </header>
        <div className="mt-3 space-y-4 text-xs text-slate-500">
          {directMessagesLoading ? (
            <p>Loading direct connections…</p>
          ) : directThreads.length ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Active threads</p>
              <ul className="mt-2 space-y-2">
                {directThreads.map((thread) => (
                  <li
                    key={thread.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
                  >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-700">{thread.name}</p>
                          <p className="mt-1 text-[11px] text-slate-400">
                          {thread.members.length} members ·{' '}
                          {thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleString() : 'No activity yet'}
                          {thread.unreadCount ? (
                            <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-[1px] text-[10px] font-semibold text-primary">
                              {thread.unreadCount} unread
                            </span>
                          ) : null}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenDirectThread?.(thread)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-primary/40 hover:text-primary"
                          aria-label={`Open direct thread ${thread.name}`}
                          data-thread-id={thread.id}
                        >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                        Open
                      </button>
                    </div>
                    {thread.lastMessageSnippet ? (
                      <p className="mt-2 text-slate-500">{thread.lastMessageSnippet}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>No direct threads detected yet.</p>
          )}

          {directSuggestions.length ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Suggested intros</p>
              <ul className="mt-2 space-y-2">
                {directSuggestions.map((suggestion) => (
                  <li
                    key={suggestion.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold text-slate-700">{suggestion.displayName}</p>
                      <p className="text-[11px] text-slate-400">
                        {suggestion.peerCount} peers · {suggestion.channelCount} channels
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectDirectRecipient?.(suggestion)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-primary/40 hover:text-primary"
                      aria-label={`Compose direct message to ${suggestion.displayName}`}
                      data-member-id={suggestion.id}
                    >
                      <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
                      Compose
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
  interactive: PropTypes.bool.isRequired,
  socialGraph: PropTypes.shape({
    stats: PropTypes.object,
    topConnectors: PropTypes.array,
    directMessages: PropTypes.object
  }),
  directMessages: PropTypes.shape({
    threads: PropTypes.array,
    suggestions: PropTypes.array
  }),
  directMessagesLoading: PropTypes.bool,
  onSelectDirectRecipient: PropTypes.func,
  onOpenDirectThread: PropTypes.func
};

ChannelSidebar.defaultProps = {
  selectedCommunityId: null,
  error: null,
  activeChannelId: null,
  socialGraph: null,
  directMessages: null,
  directMessagesLoading: false,
  onSelectDirectRecipient: null,
  onOpenDirectThread: null
};
