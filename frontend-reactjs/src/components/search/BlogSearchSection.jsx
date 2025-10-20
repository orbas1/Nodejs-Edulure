import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  BookmarkSquareIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TagIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

import { fetchBlogCategories, fetchBlogPosts, fetchBlogTags } from '../../api/blogApi.js';

const STORAGE_KEY = 'edulure.blog-search.views';

function persistViews(views) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch (error) {
    console.warn('Unable to persist blog views', error);
  }
}

function loadViews() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.warn('Unable to parse stored blog views', error);
    return [];
  }
}

function BlogCard({ post }) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          <BookmarkSquareIcon className="h-4 w-4" /> {post.category ?? 'Insight'}
        </span>
        <h3 className="text-xl font-semibold text-slate-900">{post.title}</h3>
        <p className="text-sm text-slate-500">{post.excerpt ?? post.description ?? ''}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Draft'}
          </span>
          {post.readingTimeMinutes ? <span>{post.readingTimeMinutes} min read</span> : null}
          <span>{post.viewCount ?? 0} views</span>
        </div>
      </div>
      {post.tags?.length ? (
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <TagIcon className="h-3 w-3" /> {tag}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-auto">
        <a
          href={`/blog/${post.slug}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary-dark"
        >
          Read post
          <MagnifyingGlassIcon className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}

BlogCard.propTypes = {
  post: PropTypes.shape({
    title: PropTypes.string,
    excerpt: PropTypes.string,
    description: PropTypes.string,
    publishedAt: PropTypes.string,
    readingTimeMinutes: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    viewCount: PropTypes.number,
    tags: PropTypes.arrayOf(PropTypes.string),
    slug: PropTypes.string,
    category: PropTypes.string
  }).isRequired
};

export default function BlogSearchSection() {
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ category: '', tags: [] });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [savedViews, setSavedViews] = useState(() => (typeof window !== 'undefined' ? loadViews() : []));
  const [newViewName, setNewViewName] = useState('');
  const [viewError, setViewError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    fetchBlogCategories().then(setCategories).catch(() => setCategories([]));
    fetchBlogTags().then(setTags).catch(() => setTags([]));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistViews(savedViews);
  }, [savedViews]);

  const appliedTags = useMemo(() => new Set(filters.tags ?? []), [filters.tags]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchBlogPosts({ page: pagination.page, pageSize: 6, category: filters.category || undefined, search: query || undefined, tags: filters.tags })
      .then((response) => {
        if (!active) return;
        setPosts(response.posts ?? []);
        const metaPagination = response.pagination ?? response.meta?.pagination;
        if (metaPagination) {
          setPagination({
            page: metaPagination.page ?? 1,
            totalPages: metaPagination.totalPages ?? metaPagination.total_pages ?? 1,
            total: metaPagination.total ?? metaPagination.total_items ?? 0
          });
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message ?? 'Unable to fetch blog posts');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters.category, filters.tags, pagination.page, query]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    setQuery(queryDraft.trim());
  };

  const toggleTag = (value) => {
    setFilters((prev) => {
      const next = new Set(prev.tags ?? []);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return { ...prev, tags: Array.from(next) };
    });
  };

  const handleSaveView = (event) => {
    event.preventDefault();
    if (!newViewName.trim()) {
      setViewError('Name the saved view to reuse it.');
      return;
    }
    const nextView = {
      id: `${Date.now()}`,
      name: newViewName.trim(),
      query,
      filters
    };
    setSavedViews((prev) => [nextView, ...prev]);
    setNewViewName('');
    setViewError(null);
  };

  const applyView = (view) => {
    setQuery(view.query ?? '');
    setQueryDraft(view.query ?? '');
    setFilters(view.filters ?? { category: '', tags: [] });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDeleteView = (viewId) => {
    setSavedViews((prev) => prev.filter((view) => view.id !== viewId));
  };

  const handleRenameView = (event) => {
    event.preventDefault();
    setSavedViews((prev) =>
      prev.map((view) => (view.id === editingId ? { ...view, name: editingName.trim() || view.name } : view))
    );
    setEditingId(null);
    setEditingName('');
  };

  return (
    <section className="rounded-4xl border border-slate-200 bg-slate-50/80 p-8 shadow-xl">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Blog search</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Discover the latest activation playbooks, product releases and monetisation tactics from the Edulure publishing team.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder="Search by keyword, campaign or author"
            className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
          >
            <MagnifyingGlassIcon className="h-5 w-5" /> Search
          </button>
        </form>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[3fr,1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-sm font-semibold text-slate-600">
                Category
                <select
                  value={filters.category}
                  onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.slug ?? category} value={category.slug ?? category}>
                      {category.name ?? category}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-2 text-sm font-semibold text-slate-600 md:col-span-2">
                Tags
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const value = tag.slug ?? tag;
                    const selected = appliedTags.has(value);
                    return (
                      <button
                        type="button"
                        key={value}
                        onClick={() => toggleTag(value)}
                        className={
                          selected
                            ? 'inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-card'
                            : 'inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary'
                        }
                      >
                        <TagIcon className="h-4 w-4" /> {tag.name ?? tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600" role="alert">
              {error}
            </div>
          ) : null}

          {loading && !posts.length ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="animate-pulse rounded-3xl border border-slate-100 bg-white/80 p-6">
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="mt-3 h-5 w-64 rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : null}

          {!loading && posts.length === 0 && !error ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center">
              <h3 className="text-lg font-semibold text-slate-800">No stories yet</h3>
              <p className="mt-2 text-sm text-slate-500">Try adjusting the filters or searching for another topic.</p>
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            {posts.map((post) => (
              <BlogCard key={post.id ?? post.slug} post={post} />
            ))}
          </div>

          {pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600">
              <span>
                Showing page {pagination.page} of {pagination.totalPages} · {pagination.total} posts
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="rounded-full border border-slate-200 px-4 py-2 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary hover:text-primary"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="rounded-full border border-slate-200 px-4 py-2 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary hover:text-primary"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Saved views</h3>
            <p className="mt-2 text-sm text-slate-500">Capture newsroom filters and share with your content squad.</p>
            {!savedViews.length ? <p className="mt-4 text-xs text-slate-400">No saved views yet.</p> : null}
            <ul className="mt-4 space-y-3">
              {savedViews.map((view) => (
                <li key={view.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  {editingId === view.id ? (
                    <form className="space-y-2" onSubmit={handleRenameView}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-card"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditingName('');
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => applyView(view)}
                        className="text-left text-sm font-semibold text-slate-800 transition hover:text-primary"
                      >
                        {view.name}
                      </button>
                      <p className="mt-1 text-xs text-slate-500">
                        {view.query ? `“${view.query}”` : 'All posts'} · {view.filters.tags?.length ?? 0} tags
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(view.id);
                            setEditingName(view.name);
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                        >
                          <PencilSquareIcon className="h-4 w-4" /> Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteView(view.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                        >
                          <TrashIcon className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Save current view</h3>
            <p className="mt-2 text-xs text-primary/80">Persist this configuration locally for the editorial team.</p>
            <form className="mt-4 space-y-3" onSubmit={handleSaveView}>
              <input
                type="text"
                value={newViewName}
                onChange={(event) => setNewViewName(event.target.value)}
                placeholder="e.g. Growth launch coverage"
                className="w-full rounded-2xl border border-primary/40 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {viewError ? <p className="text-xs font-semibold text-red-600">{viewError}</p> : null}
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
              >
                Save view
              </button>
            </form>
          </div>
        </aside>
      </div>
    </section>
  );
}
