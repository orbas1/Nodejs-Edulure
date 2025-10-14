import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import { adminCreateBlogPost } from '../../../api/blogApi.js';

function normaliseSummary(summary) {
  if (!summary) {
    return { published: 0, drafts: 0, scheduled: 0, totalViews: 0 };
  }
  return {
    published: Number(summary.published ?? 0),
    drafts: Number(summary.drafts ?? 0),
    scheduled: Number(summary.scheduled ?? 0),
    totalViews: Number(summary.totalViews ?? 0)
  };
}

function normalisePosts(posts) {
  if (!Array.isArray(posts)) return [];
  return posts.map((post) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    status: post.status,
    publishedAt: post.publishedAt,
    readingTimeMinutes: post.readingTimeMinutes,
    views: Number(post.views ?? post.viewCount ?? 0),
    category: post.category?.name ?? 'Insight',
    featured: Boolean(post.featured ?? post.isFeatured),
    excerpt: post.excerpt
  }));
}

export default function AdminBlogSection({ sectionId, blog, token, onPostCreated }) {
  const summary = useMemo(() => normaliseSummary(blog?.summary), [blog?.summary]);
  const posts = useMemo(() => normalisePosts(blog?.recent), [blog?.recent]);
  const [formState, setFormState] = useState({
    title: '',
    excerpt: '',
    category: '',
    heroImage: '',
    tags: '',
    content: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormMessage(null);
    try {
      const payload = {
        title: formState.title.trim(),
        excerpt: formState.excerpt.trim() || null,
        content: formState.content.trim(),
        status: 'draft',
        category: formState.category
          ? {
              name: formState.category,
              slug: formState.category
            }
          : undefined,
        media: formState.heroImage
          ? [
              {
                mediaUrl: formState.heroImage,
                altText: formState.title,
                mediaType: 'image'
              }
            ]
          : [],
        tags: formState.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => ({ name: tag }))
      };
      if (!payload.title || !payload.content) {
        throw new Error('Title and content are required to draft a blog post.');
      }
      await adminCreateBlogPost(payload, { token });
      setFormState({ title: '', excerpt: '', category: '', heroImage: '', tags: '', content: '' });
      setFormMessage({ type: 'success', text: 'Draft created. Continue editing from the blog console.' });
      onPostCreated?.();
    } catch (error) {
      setFormMessage({ type: 'error', text: error.message ?? 'Failed to create blog post.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id={sectionId} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Blog publishing</p>
          <h2 className="text-2xl font-semibold text-slate-900">Manage enterprise blog</h2>
          <p className="text-sm text-slate-500">
            Curate, schedule, and publish Edulure insights. Drafts are stored securely and syncing with the mobile app is
            automatic on publish.
          </p>
        </div>
        <Link
          to="/blog"
          className="rounded-full border border-primary/20 px-5 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:text-primary-dark"
        >
          View public blog
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Published</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.published}</p>
          <p className="text-xs text-slate-500">Live articles</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Drafts</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.drafts}</p>
          <p className="text-xs text-slate-500">Awaiting review</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scheduled</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.scheduled}</p>
          <p className="text-xs text-slate-500">Upcoming releases</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lifetime views</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.totalViews}</p>
          <p className="text-xs text-slate-500">Across all articles</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
          <h3 className="text-lg font-semibold text-slate-900">Create draft</h3>
          <p className="text-sm text-slate-500">
            Publish-ready articles require a title and long-form content. Add a hero image URL to spotlight the story.
          </p>
          <div className="grid gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Title
              <input
                type="text"
                name="title"
                value={formState.title}
                onChange={handleChange}
                placeholder="Announcing our learner experience upgrade"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Excerpt
              <textarea
                name="excerpt"
                value={formState.excerpt}
                onChange={handleChange}
                rows="3"
                placeholder="Summarise the announcement for quick scanning."
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Category
              <input
                type="text"
                name="category"
                value={formState.category}
                onChange={handleChange}
                placeholder="Product updates"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Hero image URL
              <input
                type="url"
                name="heroImage"
                value={formState.heroImage}
                onChange={handleChange}
                placeholder="https://cdn.edulure.com/assets/blog/hero.jpg"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tags (comma separated)
              <input
                type="text"
                name="tags"
                value={formState.tags}
                onChange={handleChange}
                placeholder="Product, Learner success"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Content
              <textarea
                name="content"
                value={formState.content}
                onChange={handleChange}
                rows="6"
                placeholder="Write the full article here. This draft can be refined before publishing."
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </label>
          </div>
          {formMessage ? (
            <div
              className={
                formMessage.type === 'success'
                  ? 'rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600'
                  : 'rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600'
              }
            >
              {formMessage.text}
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-3">
            <button
              type="reset"
              onClick={() => setFormState({ title: '', excerpt: '', category: '', heroImage: '', tags: '', content: '' })}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Save draft'}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent articles</h3>
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id ?? post.slug}
                className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm transition hover:border-primary/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                      {post.category} · {post.readingTimeMinutes ?? 5} min read
                    </p>
                    <h4 className="text-base font-semibold text-slate-900">{post.title}</h4>
                  </div>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary hover:text-primary"
                  >
                    Preview
                  </Link>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500">{post.excerpt}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{post.status}</span>
                  <span>
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleString() : 'Not published yet'}
                  </span>
                  <span>Views: {post.views}</span>
                  {post.featured ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Featured</span>
                  ) : null}
                </div>
              </div>
            ))}
            {posts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                No recent posts yet. Draft an article to populate this section.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

AdminBlogSection.propTypes = {
  sectionId: PropTypes.string,
  blog: PropTypes.object,
  token: PropTypes.string,
  onPostCreated: PropTypes.func
};

AdminBlogSection.defaultProps = {
  sectionId: 'blog',
  blog: null,
  token: null,
  onPostCreated: null
};
