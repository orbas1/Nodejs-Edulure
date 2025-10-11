import PropTypes from 'prop-types';

const numberFormatter = new Intl.NumberFormat('en-US');

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

export default function FeedCard({ post }) {
  const publishedLabel = formatRelativeTime(post.publishedAt);
  const communityName = post.community?.name;
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const reactions = post.stats?.reactions ?? 0;
  const comments = post.stats?.comments ?? 0;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <img
          src={post.author?.avatarUrl}
          alt={post.author?.name}
          className="h-12 w-12 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{post.author?.name}</h3>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {post.author?.role ?? 'Member'}
                {communityName && <span className="ml-1 text-slate-300">•</span>}
                {communityName && <span className="ml-1 text-slate-500">{communityName}</span>}
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">{publishedLabel}</span>
          </div>
          {post.title && <h4 className="mt-4 text-sm font-semibold text-slate-900">{post.title}</h4>}
          <p className="mt-3 text-sm leading-6 text-slate-700">{post.body}</p>
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-primary">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-primary/10 px-3 py-1">
                  #{tag}
                </span>
              ))}
            </div>
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
        </div>
      </div>
    </article>
  );
}

FeedCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string,
    body: PropTypes.string.isRequired,
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
      role: PropTypes.string,
      avatarUrl: PropTypes.string
    }).isRequired,
    stats: PropTypes.shape({
      reactions: PropTypes.number,
      comments: PropTypes.number
    })
  }).isRequired
};
