import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const numberFormatter = new Intl.NumberFormat('en-US');

import MediaPreviewSlot from '../shared/MediaPreviewSlot.jsx';

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes <= 0) return 'Just now';
  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  return date.toLocaleDateString();
}

function normaliseLinkAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((attachment) => attachment?.type === 'link' && typeof attachment.url === 'string')
    .map((attachment) => {
      try {
        const parsed = new URL(attachment.url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return null;
        }
        return {
          id: attachment.id ?? attachment.url,
          label: attachment.label ?? parsed.hostname.replace(/^www\./, ''),
          url: parsed.toString()
        };
      } catch (_error) {
        return null;
      }
    })
    .filter(Boolean);
}

const pollPalette = ['#4f46e5', '#0ea5e9', '#10b981', '#f97316', '#ec4899'];

function clampPercentage(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function formatPollCloseLabel(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const diff = date.getTime() - Date.now();
  if (diff <= 0) {
    return 'Poll closed';
  }
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) {
    return `Closing in ${minutes} min`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `Closing in ${hours} hour${hours === 1 ? '' : 's'}`;
  }
  const days = Math.round(hours / 24);
  if (days <= 7) {
    return `Closing in ${days} day${days === 1 ? '' : 's'}`;
  }
  return `Closes ${date.toLocaleDateString()}`;
}

function normalisePollMetadata(poll) {
  if (!poll) return null;
  const totalVotes = Number.isFinite(Number(poll.totalVotes)) ? Number(poll.totalVotes) : null;
  const choices = Array.isArray(poll.choices)
    ? poll.choices
        .map((choice, index) => {
          if (!choice) return null;
          const votes = Number.isFinite(Number(choice.votes)) ? Number(choice.votes) : 0;
          const providedPercentage = Number.isFinite(Number(choice.percentage))
            ? Number(choice.percentage)
            : null;
          const resolvedPercentage = totalVotes
            ? clampPercentage((votes / totalVotes) * 100)
            : providedPercentage !== null
              ? clampPercentage(providedPercentage)
              : 0;
          const colour = choice.color ?? pollPalette[index % pollPalette.length];
          const previewImage =
            choice.previewImageUrl ??
            choice.imageUrl ??
            choice.preview?.thumbnailUrl ??
            choice.metadata?.thumbnailUrl ??
            null;
          return {
            id: choice.id ?? index,
            label: choice.label || `Option ${index + 1}`,
            votes,
            percentage: Math.round(resolvedPercentage),
            color: colour,
            imageUrl: typeof previewImage === 'string' ? previewImage : null
          };
        })
        .filter(Boolean)
    : [];

  if (choices.length === 0) {
    return null;
  }

  const computedTotalVotes = totalVotes ?? choices.reduce((sum, choice) => sum + choice.votes, 0);
  const closeLabel = formatPollCloseLabel(poll.closesAt ?? poll.endsAt ?? poll.expiresAt);

  return {
    question: poll.question || 'Community poll',
    choices,
    totalVotes: computedTotalVotes,
    closeLabel
  };
}

function PollPreview({ poll }) {
  const leadingVotes = poll.choices.reduce((max, choice) => Math.max(max, choice.votes), 0);

  return (
    <section className="poll-preview p-4" aria-label="Poll preview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Community poll</p>
          <h5 className="mt-1 text-sm font-semibold text-slate-900">{poll.question}</h5>
        </div>
        <span className="badge-layer badge-layer--floating inline-flex items-center gap-2 rounded-full bg-slate-900/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          {numberFormatter.format(poll.totalVotes)} votes
        </span>
      </div>
      {poll.closeLabel ? <p className="mt-2 text-xs text-slate-500">{poll.closeLabel}</p> : null}
      <ul className="mt-4 space-y-4">
        {poll.choices.map((choice) => {
          const isLeading = leadingVotes > 0 && choice.votes === leadingVotes;
          return (
            <li key={choice.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">{choice.label}</span>
                <span className={`text-xs font-semibold uppercase tracking-wide ${isLeading ? 'text-primary' : 'text-slate-500'}`}>
                  {choice.percentage}%
                </span>
              </div>
              <div className="poll-preview__bar" role="presentation">
                <span className="poll-preview__fill" style={{ width: `${choice.percentage}%`, background: choice.color }} />
              </div>
              {choice.imageUrl ? (
                <div className="poll-preview__choice-image">
                  <img
                    src={choice.imageUrl}
                    alt={`${choice.label} preview`}
                    loading="lazy"
                    className="h-32 w-full object-cover"
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

PollPreview.propTypes = {
  poll: PropTypes.shape({
    question: PropTypes.string.isRequired,
    closeLabel: PropTypes.string,
    totalVotes: PropTypes.number.isRequired,
    choices: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        label: PropTypes.string.isRequired,
        votes: PropTypes.number.isRequired,
        percentage: PropTypes.number.isRequired,
        color: PropTypes.string.isRequired,
        imageUrl: PropTypes.string
      })
    ).isRequired
  }).isRequired
};

export default function FeedItemCard({ post, onModerate, onRemove, actionState, onReact }) {
  const publishedLabel = formatRelativeTime(post.publishedAt ?? post.createdAt);
  const communityName = post.community?.name;
  const tags = useMemo(() => {
    if (!Array.isArray(post.tags)) return [];
    return post.tags
      .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
      .filter(Boolean)
      .slice(0, 8);
  }, [post.tags]);
  const reactions = post.stats?.reactions ?? 0;
  const comments = post.stats?.comments ?? 0;
  const canModerate = Boolean(post.permissions?.canModerate && typeof onModerate === 'function');
  const canRemove = Boolean(post.permissions?.canRemove && typeof onRemove === 'function');
  const isSuppressed = post.moderation?.state === 'suppressed';
  const moderateAction = isSuppressed ? 'restore' : 'suppress';
  const isProcessing = Boolean(actionState?.isProcessing);
  const actionError = actionState?.error;
  const [isAvatarBroken, setIsAvatarBroken] = useState(false);
  const authorName = post.author?.name ?? 'Community member';
  const authorEmail = post.author?.email ?? '';
  const authorInitials = useMemo(() => {
    const source = authorName || authorEmail;
    return source
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'E';
  }, [authorName, authorEmail]);
  const bodyCopy = post.body?.trim() || 'No update provided.';
  const title = post.title?.trim();
  const avatarUrl = post.author?.avatarUrl;
  const linkAttachments = normaliseLinkAttachments(post.metadata?.attachments);
  const moderationReason = post.moderation?.context ?? post.moderation?.reason;
  const moderationReviewContext = post.moderation?.reviewContext ?? null;
  const preview = post.media?.preview;
  const previewUrl = preview?.thumbnailUrl;
  const previewAspectRatio = preview?.aspectRatio ?? '16:9';
  const viewerReactions = Array.isArray(post.viewer?.reactions) ? post.viewer.reactions : [];
  const defaultReactionKey = 'appreciate';
  const hasReacted = viewerReactions.includes(defaultReactionKey);
  const resolvedReactionCount = Number.isFinite(Number(reactions)) ? Number(reactions) : 0;
  const handleReact = (reaction) => {
    if (typeof onReact === 'function') {
      onReact(post, reaction);
    }
  };
  const poll = useMemo(() => normalisePollMetadata(post.metadata?.poll), [post.metadata]);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-start gap-4">
        {avatarUrl && !isAvatarBroken ? (
          <img
            src={avatarUrl}
            alt={authorName}
            className="h-12 w-12 rounded-full object-cover"
            onError={() => setIsAvatarBroken(true)}
          />
        ) : (
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
            aria-hidden="true"
          >
            {authorInitials}
          </span>
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">{authorName}</h3>
                {post.isPinned ? (
                  <span className="badge-layer badge-layer--floating inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Pinned
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                <span>{post.author?.role ?? 'Member'}</span>
                {communityName ? (
                  <span className="badge-layer inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {communityName}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">{publishedLabel}</span>
              {(canModerate || canRemove) && (
                <div className="flex flex-wrap items-center gap-2">
                  {canModerate && (
                    <button
                      type="button"
                      onClick={() => onModerate(post, moderateAction)}
                      disabled={isProcessing}
                      className="rounded-full border border-primary/40 px-3 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isProcessing ? 'Updating…' : isSuppressed ? 'Restore' : 'Suppress'}
                    </button>
                  )}
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(post)}
                      disabled={isProcessing}
                      className="rounded-full border border-red-300 px-3 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isProcessing ? 'Removing…' : 'Remove'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          {title && <h4 className="mt-4 break-words text-sm font-semibold text-slate-900">{title}</h4>}
          <p className="mt-3 break-words text-sm leading-6 text-slate-700">{bodyCopy}</p>

          {previewUrl ? (
            <div className="mt-4">
              <MediaPreviewSlot
                thumbnailUrl={previewUrl}
                label={post.title ?? 'Post preview'}
                aspectRatio={previewAspectRatio}
              />
            </div>
          ) : null}

          {poll ? (
            <div className="mt-4">
              <PollPreview poll={poll} />
            </div>
          ) : null}

          {linkAttachments.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Shared links</p>
              <ul className="space-y-2">
                {linkAttachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
                    >
                      Visit {attachment.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-primary">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-primary/10 px-3 py-1">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {isSuppressed && (
            <div
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700"
              role="status"
              aria-live="polite"
            >
              Post is hidden from members
            </div>
          )}
          {moderationReason && (
            <p className="mt-2 text-xs text-amber-500">Context: {moderationReason}</p>
          )}
          {moderationReviewContext && (
            <p className="mt-1 text-xs text-amber-500">Escalation: {moderationReviewContext}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-slate-500">
            <button
              type="button"
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold transition ${
                hasReacted
                  ? 'border-primary/50 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 text-primary shadow-inner'
                  : 'border-transparent bg-gradient-to-r from-slate-50 via-white to-slate-50 text-slate-500 hover:border-primary/40 hover:text-primary'
              }`}
              onClick={() => handleReact(defaultReactionKey)}
              disabled={!onReact || isProcessing}
              aria-pressed={hasReacted}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                {numberFormatter.format(resolvedReactionCount)}
              </span>
              {hasReacted ? 'Appreciated' : 'Appreciate'}
            </button>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600">
                {numberFormatter.format(comments)}
              </span>
              Comments
            </div>
          </div>

          {actionError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600" role="alert" aria-live="assertive">
              {actionError}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

FeedItemCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    title: PropTypes.string,
    body: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    publishedAt: PropTypes.string,
    createdAt: PropTypes.string,
    community: PropTypes.shape({ name: PropTypes.string }),
    author: PropTypes.shape({
      name: PropTypes.string,
      role: PropTypes.string,
      avatarUrl: PropTypes.string
    }),
    stats: PropTypes.shape({
      reactions: PropTypes.number,
      comments: PropTypes.number
    }),
    permissions: PropTypes.shape({
      canModerate: PropTypes.bool,
      canRemove: PropTypes.bool
    }),
    moderation: PropTypes.shape({
      state: PropTypes.string,
      reason: PropTypes.string,
      context: PropTypes.string,
      reviewContext: PropTypes.string
    }),
    metadata: PropTypes.shape({
      attachments: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          type: PropTypes.string,
          url: PropTypes.string,
          label: PropTypes.string
        })
      ),
      poll: PropTypes.shape({
        question: PropTypes.string,
        closesAt: PropTypes.string,
        endsAt: PropTypes.string,
        expiresAt: PropTypes.string,
        totalVotes: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        choices: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            label: PropTypes.string,
            votes: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
            percentage: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
            color: PropTypes.string,
            imageUrl: PropTypes.string,
            previewImageUrl: PropTypes.string,
            preview: PropTypes.shape({ thumbnailUrl: PropTypes.string }),
            metadata: PropTypes.shape({ thumbnailUrl: PropTypes.string })
          })
        )
      })
    }),
    media: PropTypes.shape({
      preview: PropTypes.shape({
        thumbnailUrl: PropTypes.string,
        aspectRatio: PropTypes.string
      })
    }),
    isPinned: PropTypes.bool,
    viewer: PropTypes.shape({
      reactions: PropTypes.arrayOf(PropTypes.string),
      hasReacted: PropTypes.bool
    })
  }).isRequired,
  onModerate: PropTypes.func,
  onRemove: PropTypes.func,
  actionState: PropTypes.shape({
    isProcessing: PropTypes.bool,
    error: PropTypes.string
  }),
  onReact: PropTypes.func
};

FeedItemCard.defaultProps = {
  onModerate: null,
  onRemove: null,
  actionState: null,
  onReact: null
};
