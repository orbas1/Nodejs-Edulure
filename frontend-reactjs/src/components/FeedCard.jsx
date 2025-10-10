import PropTypes from 'prop-types';

export default function FeedCard({ post }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <img src={post.avatar} alt={post.author} className="h-12 w-12 rounded-full object-cover" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{post.author}</h3>
              <p className="text-sm text-slate-500">{post.role}</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">{post.postedAt}</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-700">{post.content}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-primary">
            {post.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-primary/10 px-3 py-1">
                #{tag}
              </span>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-6 text-sm text-slate-500">
            <button className="flex items-center gap-2 transition hover:text-primary">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                {post.likes}
              </span>
              Appreciations
            </button>
            <button className="flex items-center gap-2 transition hover:text-primary">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600">
                {post.comments}
              </span>
              Comments
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

FeedCard.propTypes = {
  post: PropTypes.shape({
    avatar: PropTypes.string.isRequired,
    author: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
    postedAt: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    tags: PropTypes.arrayOf(PropTypes.string).isRequired,
    likes: PropTypes.number.isRequired,
    comments: PropTypes.number.isRequired
  }).isRequired
};
