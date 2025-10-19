import PropTypes from 'prop-types';
import {
  PaperClipIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  HandThumbUpIcon,
  FaceSmileIcon,
  ExclamationTriangleIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

import { getChannelTypeMeta } from './channelMetadata.js';

function MessageAttachment({ attachmentUrl, attachmentLabel }) {
  if (!attachmentUrl) return null;
  return (
    <a
      href={attachmentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-primary transition hover:border-primary/40 hover:bg-primary/5"
    >
      <PaperClipIcon className="h-4 w-4" aria-hidden="true" />
      {attachmentLabel || 'View attachment'}
    </a>
  );
}

MessageAttachment.propTypes = {
  attachmentUrl: PropTypes.string,
  attachmentLabel: PropTypes.string
};

MessageAttachment.defaultProps = {
  attachmentUrl: null,
  attachmentLabel: null
};

function ReactionPill({ emoji, count, onReact, onRemove }) {
  return (
    <button
      type="button"
      onClick={() => (count > 0 ? onRemove?.(emoji) : onReact?.(emoji))}
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-[2px] text-[11px] font-medium text-slate-500 transition hover:border-primary/40 hover:text-primary"
    >
      <span>{emoji}</span>
      <span>{count}</span>
    </button>
  );
}

ReactionPill.propTypes = {
  emoji: PropTypes.string.isRequired,
  count: PropTypes.number,
  onReact: PropTypes.func,
  onRemove: PropTypes.func
};

ReactionPill.defaultProps = {
  count: 0,
  onReact: null,
  onRemove: null
};

function ModerationBadge({ moderation }) {
  if (!moderation?.status) return null;
  const statusLabel = moderation.status === 'hidden' ? 'Hidden' : moderation.status;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-rose-600">
      <ExclamationTriangleIcon className="h-3 w-3" aria-hidden="true" />
      {statusLabel}
    </span>
  );
}

ModerationBadge.propTypes = {
  moderation: PropTypes.shape({
    status: PropTypes.string,
    note: PropTypes.string
  })
};

ModerationBadge.defaultProps = {
  moderation: null
};

export default function MessageTimeline({
  channel,
  messages,
  loading,
  error,
  hasMore,
  onLoadMore,
  onReact,
  onRemoveReaction,
  onModerate
}) {
  const channelMeta = channel ? getChannelTypeMeta(channel.channelType) : null;

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <p className="dashboard-kicker text-slate-400">{channelMeta?.label ?? 'Channel'}</p>
          <h2 className="text-xl font-semibold text-slate-900">{channel?.name ?? channel?.label ?? 'Select a channel'}</h2>
          <p className="mt-1 text-xs text-slate-500">{channelMeta?.description ?? 'Choose a space to review the latest updates.'}</p>
        </div>
        {channel ? (
          <div className="flex flex-col items-end text-right text-xs text-slate-400">
            <span>{channel.members ?? channel.memberCount ?? '—'} members</span>
            {channel.updatedAt ? <span>Updated {new Date(channel.updatedAt).toLocaleString()}</span> : null}
          </div>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading && messages.length === 0 ? (
          <p className="text-sm text-slate-500">Loading latest conversations…</p>
        ) : error ? (
          <p className="text-sm text-rose-600">Unable to load messages. Try refreshing the workspace.</p>
        ) : !channel ? (
          <p className="text-sm text-slate-500">Select a channel to begin moderating.</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages found yet. Kickstart the conversation with an announcement.</p>
        ) : (
          <ol className="space-y-5">
            {messages.map((message) => (
              <li key={message.id} className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-inner">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {(message.author?.displayName ?? 'Member').slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{message.author?.displayName ?? 'Member'}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">{message.author?.role ?? 'member'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <time className="text-xs text-slate-400" dateTime={message.createdAt}>
                      {message.createdAt ? new Date(message.createdAt).toLocaleString() : 'Just now'}
                    </time>
                    <ModerationBadge moderation={message.moderation} />
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  {message.body ? <p>{message.body}</p> : null}
                  {message.metadata?.note ? (
                    <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Moderator note: {message.metadata.note}</p>
                  ) : null}
                  {message.messageType === 'live' ? (
                    <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      <VideoCameraIcon className="h-4 w-4" aria-hidden="true" />
                      Live session scheduled
                    </p>
                  ) : null}
                  <MessageAttachment attachmentUrl={message.attachmentUrl} attachmentLabel={message.attachmentLabel} />
                </div>
                <footer className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => onReact?.(message.id, '👍')}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-[3px] transition hover:border-primary/40 hover:text-primary"
                  >
                    <HandThumbUpIcon className="h-4 w-4" aria-hidden="true" />
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    onClick={() => onReact?.(message.id, '💬')}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-[3px] transition hover:border-primary/40 hover:text-primary"
                  >
                    <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4" aria-hidden="true" />
                    Thread
                  </button>
                  <button
                    type="button"
                    onClick={() => onReact?.(message.id, '😊')}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-[3px] transition hover:border-primary/40 hover:text-primary"
                  >
                    <FaceSmileIcon className="h-4 w-4" aria-hidden="true" />
                    Support
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    {(message.reactions ?? []).map((reaction) => (
                      <ReactionPill
                        key={reaction.emoji}
                        emoji={reaction.emoji}
                        count={reaction.count ?? 0}
                        onReact={(emoji) => onReact?.(message.id, emoji)}
                        onRemove={(emoji) => onRemoveReaction?.(message.id, emoji)}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        onModerate?.(message.id, {
                          action: message.moderation?.status === 'hidden' ? 'restore' : 'hidden',
                          note: message.moderation?.note ?? 'Flagged by instructor dashboard'
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-[3px] text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
                    >
                      <ExclamationTriangleIcon className="h-4 w-4" aria-hidden="true" />
                      {message.moderation?.status === 'hidden' ? 'Restore' : 'Hide'}
                    </button>
                  </div>
                </footer>
              </li>
            ))}
          </ol>
        )}
      </div>

      {hasMore && (
        <div className="border-t border-slate-100 px-6 py-4 text-center">
          <button
            type="button"
            onClick={() => onLoadMore?.(messages[0]?.createdAt)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-primary/40 hover:text-primary"
          >
            Load previous messages
          </button>
        </div>
      )}
    </section>
  );
}

MessageTimeline.propTypes = {
  channel: PropTypes.object,
  messages: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.any,
  hasMore: PropTypes.bool.isRequired,
  onLoadMore: PropTypes.func,
  onReact: PropTypes.func,
  onRemoveReaction: PropTypes.func,
  onModerate: PropTypes.func
};

MessageTimeline.defaultProps = {
  channel: null,
  error: null,
  onLoadMore: null,
  onReact: null,
  onRemoveReaction: null,
  onModerate: null
};
