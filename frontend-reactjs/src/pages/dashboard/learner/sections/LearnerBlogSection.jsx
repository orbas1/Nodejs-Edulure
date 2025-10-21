import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function normaliseSlug(slug) {
  if (typeof slug !== 'string') {
    return '';
  }
  const trimmed = slug.trim().replace(/^\/+/, '').replace(/\/+$/, '');
  if (trimmed.length === 0) {
    return '';
  }
  return trimmed;
}

export default function LearnerBlogSection({ posts, featured, className }) {
  if (!Array.isArray(posts) || posts.length === 0) {
    return (
      <section
        className={classNames(
          'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
          className
        )}
      >
        <div className="flex flex-col gap-3 text-sm text-slate-600">
          <h2 className="text-base font-semibold text-slate-900">Latest from the Edulure blog</h2>
          <p className="text-sm text-slate-500">Fresh articles will appear here once they are published.</p>
          <Link
            to="/blog"
            className="w-fit rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary hover:text-primary"
          >
            Visit blog
          </Link>
        </div>
      </section>
    );
  }

  const spotlight = featured ?? posts[0];
  const spotlightSlug = normaliseSlug(spotlight?.slug);
  const supporting = posts
    .filter((post) => normaliseSlug(post.slug) !== spotlightSlug)
    .slice(0, 3);
  const spotlightLink = spotlightSlug ? `/blog/${spotlightSlug}` : '/blog';

  return (
    <section
      className={classNames(
        'flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
        className
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Enterprise blog</p>
          <h2 className="text-lg font-semibold text-slate-900">Latest platform stories</h2>
        </div>
        <Link
          to="/blog"
          className="rounded-full border border-primary/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition hover:border-primary hover:text-primary-dark"
        >
          Explore all
        </Link>
      </header>

      <article className="grid gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/5 via-white to-white p-6 shadow-inner md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            {spotlight.category?.name ? <span>{spotlight.category.name}</span> : null}
            <span className="rounded-full bg-primary/10 px-3 py-1">{spotlight.readingTimeMinutes ?? 5} min read</span>
          </div>
          <h3 className="text-xl font-semibold text-slate-900">{spotlight.title}</h3>
          <p className="text-sm text-slate-600">{spotlight.excerpt ?? 'Tap through to read the full insight.'}</p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wide text-slate-500">
            <span>
              {spotlight.publishedAt ? new Date(spotlight.publishedAt).toLocaleDateString() : 'Drafted'}
            </span>
            <Link
              to={spotlightLink}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-card transition hover:bg-primary-dark"
            >
              Read article
            </Link>
          </div>
        </div>
        <div className="grid gap-2 text-xs text-slate-500">
          <p className="text-sm font-semibold text-slate-700">Recently published</p>
          {supporting.map((post) => {
            const safeSlug = normaliseSlug(post.slug);
            return (
              <Link
              key={safeSlug || post.slug || post.title}
              to={safeSlug ? `/blog/${safeSlug}` : '/blog'}
              className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-left transition hover:border-primary/40 hover:text-primary"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                {post.category?.name ?? 'Insight'} · {post.readingTimeMinutes ?? 5} min read
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{post.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{post.excerpt ?? 'Read more'}</p>
            </Link>
            );
          })}
        </div>
      </article>
    </section>
  );
}

LearnerBlogSection.propTypes = {
  posts: PropTypes.arrayOf(PropTypes.object),
  featured: PropTypes.object,
  className: PropTypes.string
};

LearnerBlogSection.defaultProps = {
  posts: [],
  featured: null,
  className: ''
};
