import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const numberFormatter = new Intl.NumberFormat('en-US');
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:']);
const MAX_MEDIA_PREVIEW = 4;

function normaliseLinkAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((attachment) => attachment?.type === 'link' && typeof attachment.url === 'string')
    .map((attachment) => {
      try {
        const parsed = new URL(attachment.url);
        if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) {
          return null;
        }
        return {
          id: attachment.id ?? attachment.url,
          label: attachment.label ?? parsed.hostname.replace(/^www\./, ''),
          url: parsed.toString()
        };
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
}

function normaliseMediaAttachments(post) {
  const entries = [];
  const seen = new Set();

  const addEntry = (item, fallbackIndex) => {
    if (!item) return;
    const url = item.previewUrl || item.thumbnailUrl || item.url;
    if (!url) return;
    const id = item.id ?? url ?? `media-${fallbackIndex}`;
    if (seen.has(id)) return;
    seen.add(id);
    entries.push({
      id,
      url,
      alt: item.alt || item.label || item.caption || 'Community media preview',
      caption: item.caption || item.description || null
    });
  };

  if (Array.isArray(post.media)) {
    post.media.forEach((item, index) => addEntry(item, index));
  }

  if (Array.isArray(post.attachments)) {
    post.attachments
      .filter((attachment) => attachment?.type === 'image' || attachment?.mimeType?.startsWith('image/'))
      .forEach((attachment, index) => addEntry(attachment, `attachment-${index}`));
  }

  const total = entries.length;
  return entries.slice(0, MAX_MEDIA_PREVIEW).map((entry, index) => ({
    ...entry,
    index,
    total,
    showOverlay: index === MAX_MEDIA_PREVIEW - 1 && total > MAX_MEDIA_PREVIEW
  }));
}

function normalisePoll(poll) {
  if (!poll || typeof poll !== 'object') return null;
  const options = Array.isArray(poll.options) ? poll.options : [];
  const totalVotes = options.reduce(
    (sum, option) => sum + (Number(option?.votes ?? option?.count ?? 0) || 0),
    0
  );

  const resolvedOptions = options.map((option, index) => {
    const votes = Number(option?.votes ?? option?.count ?? 0) || 0;
    const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
    return {
      id: option?.id ?? `poll-option-${index}`,
      label: option?.label ?? option?.text ?? `Option ${index + 1}`,
      votes,
      percentage
    };
  });

  const imageUrl = poll.imageUrl || poll.media?.previewUrl || poll.previewImageUrl || null;

  return {
    id: poll.id ?? 'poll',
    title: poll.title ?? poll.question ?? 'Community poll',
    description: poll.description ?? poll.subtitle ?? '',
    imageUrl,
    options: resolvedOptions,
    totalVotes
  };
}

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

export default function FeedCard({ post, onModerate, onRemove, actionState }) {
  const publishedLabel = formatRelativeTime(post.publishedAt);
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
  const linkAttachments = normaliseLinkAttachments(post.attachments);
  const moderationReason = post.moderation?.reason;
  const mediaAttachments = normaliseMediaAttachments(post);
  const poll = normalisePoll(post.poll);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        {avatarUrl && !isAvatarBroken ? (
          <img
            src={avatarUrl}
            alt={authorName}
            className="h-12 w-12 rounded-full object-cover"
            onError={() => setIsAvatarBroken(true)}
          />
        ) : (
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary" aria-hidden="true">
            {authorInitials}
          </span>
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{authorName}</h3>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {post.author?.role ?? 'Member'}
                {communityName && <span className="ml-1 text-slate-300">•</span>}
                {communityName && <span className="ml-1 text-slate-500">{communityName}</span>}
              </p>
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
          {mediaAttachments.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {mediaAttachments.map((media) => (
                <figure
                  key={media.id}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50"
                >
                  <img
                    src={media.url}
                    alt={media.alt}
                    className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.01]"
                    loading="lazy"
                  />
                  {media.caption ? (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-slate-900/60 px-3 py-2 text-[11px] font-medium text-white">
                      {media.caption}
                    </figcaption>
                  ) : null}
                  {media.showOverlay ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/50 text-sm font-semibold text-white">
                      +{media.total - MAX_MEDIA_PREVIEW + 1} more assets
                    </span>
                  ) : null}
                </figure>
              ))}
            </div>
          )}
          {poll && (
            <div className="mt-4 rounded-3xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                {poll.imageUrl ? (
                  <img
                    src={poll.imageUrl}
                    alt="Poll preview"
                    className="h-32 w-full rounded-2xl object-cover sm:h-40 sm:w-40"
                    loading="lazy"
                  />
                ) : null}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">{poll.title}</p>
                    {poll.description ? (
                      <p className="mt-1 text-xs text-indigo-700">{poll.description}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {poll.options.map((option) => (
                      <div key={option.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-indigo-700">
                          <span>{option.label}</span>
                          <span>{option.percentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-indigo-100">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${option.percentage}%` }}
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                    {numberFormatter.format(poll.totalVotes)} {poll.totalVotes === 1 ? 'vote' : 'votes'} tallied
                  </p>
                </div>
              </div>
            </div>
          )}
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium leading-5 text-primary">
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
            <p className="mt-2 text-xs text-amber-500">Reason: {moderationReason}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                {numberFormatter.format(reactions)}
              </span>
              Appreciations
            </div>
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

FeedCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string,
    body: PropTypes.string,
    publishedAt: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    community: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      slug: PropTypes.string
    }),
    author: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      email: PropTypes.string,
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
    attachments: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        type: PropTypes.string,
        url: PropTypes.string,
        label: PropTypes.string
      })
    ),
    media: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        url: PropTypes.string,
        previewUrl: PropTypes.string,
        thumbnailUrl: PropTypes.string,
        alt: PropTypes.string,
        caption: PropTypes.string
      })
    ),
    poll: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      title: PropTypes.string,
      description: PropTypes.string,
      imageUrl: PropTypes.string,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          label: PropTypes.string,
          votes: PropTypes.number,
          percentage: PropTypes.number
        })
      ),
      totalVotes: PropTypes.number
    }),
    moderation: PropTypes.shape({
      state: PropTypes.string,
      reason: PropTypes.string
    })
  }).isRequired,
  onModerate: PropTypes.func,
  onRemove: PropTypes.func,
  actionState: PropTypes.shape({
    isProcessing: PropTypes.bool,
    error: PropTypes.string
  })
};
