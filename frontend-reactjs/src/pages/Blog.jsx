import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchBlogPosts, fetchBlogCategories, fetchBlogTags } from '../api/blogApi.js';

const INITIAL_FILTERS = Object.freeze({ category: '', tags: [], search: '' });

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function normaliseCategories(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => ({
      slug: entry.slug,
      name: entry.name ?? entry.slug,
      description: entry.description ?? ''
    }))
    .filter((entry) => entry.slug && entry.name);
}

function normaliseTags(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => ({ slug: entry.slug, name: entry.name ?? entry.slug }))
    .filter((entry) => entry.slug && entry.name);
}

function normalisePosts(posts) {
  if (!Array.isArray(posts)) return [];
  return posts.map((post) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    heroImage: post.media?.[0]?.mediaUrl ?? null,
    category: post.category,
    tags: Array.isArray(post.tags) ? post.tags : [],
    readingTimeMinutes: post.readingTimeMinutes,
    viewCount: post.viewCount
  }));
}

export default function Blog() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const [categoryResponse, tagResponse] = await Promise.all([
          fetchBlogCategories(),
          fetchBlogTags()
        ]);
        if (cancelled) return;
        setCategories(normaliseCategories(categoryResponse));
        setTags(normaliseTags(tagResponse));
      } catch (err) {
        console.error('Failed to preload blog metadata', err);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPosts = useMemo(
    () =>
      async function load(page = 1) {
        setLoading(true);
        setError(null);
        try {
          const response = await fetchBlogPosts({
            page,
            pageSize: pagination.pageSize,
            category: filters.category || undefined,
            tags: filters.tags,
            search: filters.search?.trim() || undefined
          });
          setPosts(normalisePosts(response.posts));
          setPagination(response.pagination);
        } catch (err) {
          setError(err);
        } finally {
          setLoading(false);
        }
      },
    [filters.category, filters.tags, filters.search, pagination.pageSize]
  );

  useEffect(() => {
    loadPosts(1);
  }, [loadPosts]);

  const featuredPost = posts[0] ?? null;
  const additionalPosts = posts.slice(1);

  const hasActiveFilters = Boolean(
    filters.category || filters.search.trim().length > 0 || (filters.tags?.length ?? 0) > 0
  );

  const handleCategoryChange = (slug) => {
    setFilters((prev) => ({ ...prev, category: prev.category === slug ? '' : slug }));
  };

  const handleTagToggle = (slug) => {
    setFilters((prev) => {
      const tagsSet = new Set(prev.tags);
      if (tagsSet.has(slug)) {
        tagsSet.delete(slug);
      } else {
        tagsSet.add(slug);
      }
      return { ...prev, tags: Array.from(tagsSet) };
    });
  };

  const handleSearchChange = (event) => {
    setFilters((prev) => ({ ...prev, search: event.target.value }));
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.2),_transparent_60%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-24">
          <div className="flex flex-col gap-6 text-slate-900">
            <span className="w-fit rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
              Edulure insights
            </span>
            <h1 className="text-4xl font-semibold md:text-5xl">Stories from the Edulure community</h1>
            <p className="max-w-3xl text-lg text-slate-600">
              Discover product updates, community wins, and learning insights from the teams shaping modern education.
              Every article is reviewed, accessible, and crafted for both desktop and mobile learners.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
              <input
                type="search"
                value={filters.search}
                onChange={handleSearchChange}
                placeholder="Search articles, authors, or topics"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-inner transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-2xl border border-primary/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary hover:border-primary"
                >
                  Reset
                </button>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-3">
              <Link
                to="/register"
                className="hidden rounded-full border border-primary/20 px-5 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:text-primary-dark md:inline-flex"
              >
                Join Edulure
              </Link>
              <Link
                to="/dashboard"
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-8">
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Categories</h2>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.slug}
                    onClick={() => handleCategoryChange(category.slug)}
                    className={classNames(
                      'rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition',
                      filters.category === category.slug
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary'
                    )}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    type="button"
                    key={tag.slug}
                    onClick={() => handleTagToggle(tag.slug)}
                    className={classNames(
                      'rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition',
                      filters.tags.includes(tag.slug)
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary'
                    )}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-sm text-slate-600 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Enterprise storytelling ready</h3>
              <p className="mt-3 text-sm leading-relaxed">
                Every article is audited for accessibility, responsive typography, and secure content delivery. Share with
                your team knowing the experience is consistent on web and mobile.
              </p>
            </div>
          </aside>

          <div className="space-y-8">
            {loading ? (
              <div className="flex h-40 items-center justify-center rounded-3xl border border-dashed border-primary/30 bg-white">
                <p className="text-sm font-semibold text-primary">Loading articles…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/50 p-10 text-center">
                <p className="text-base font-semibold text-rose-600">We couldn't load the blog right now.</p>
                <p className="text-sm text-rose-500">
                  {error.message ?? 'Please refresh the page or check your connection.'}
                </p>
                <button
                  type="button"
                  onClick={() => loadPosts(pagination.page)}
                  className="rounded-full border border-rose-200 px-5 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-400 hover:text-rose-700"
                >
                  Retry
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">No articles yet</h3>
                <p className="mt-2 text-sm text-slate-500">
                  We're preparing fresh content for you. Check back soon for enterprise-grade insights.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {featuredPost ? (
                  <article className="grid gap-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    {featuredPost.heroImage ? (
                      <img
                        src={featuredPost.heroImage}
                        alt={featuredPost.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <span className="text-sm font-semibold uppercase tracking-wide text-primary">Featured insight</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-4 p-8">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-primary">
                        {featuredPost.category?.name ? <span>{featuredPost.category.name}</span> : null}
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                          {featuredPost.readingTimeMinutes ?? 5} min read
                        </span>
                      </div>
                      <h2 className="text-2xl font-semibold text-slate-900">{featuredPost.title}</h2>
                      <p className="text-base text-slate-600">{featuredPost.excerpt}</p>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
                        <span>
                          {featuredPost.publishedAt
                            ? new Date(featuredPost.publishedAt).toLocaleDateString()
                            : 'Drafted'}
                        </span>
                        <Link
                          to={`/blog/${featuredPost.slug}`}
                          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
                        >
                          Read article
                        </Link>
                      </div>
                    </div>
                  </article>
                ) : null}

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {additionalPosts.map((post) => (
                    <article
                      key={post.id ?? post.slug}
                      className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      {post.heroImage ? (
                        <img src={post.heroImage} alt={post.title} className="h-48 w-full object-cover" />
                      ) : (
                        <div className="flex h-48 items-center justify-center bg-primary/5 text-sm font-semibold uppercase tracking-wide text-primary">
                          {post.category?.name ?? 'Insight'}
                        </div>
                      )}
                      <div className="flex flex-1 flex-col gap-3 p-6">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary/80">
                          {post.category?.name ? <span>{post.category.name}</span> : null}
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                            {post.readingTimeMinutes ?? 5} min read
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">{post.title}</h3>
                        <p className="flex-1 text-sm text-slate-600">{post.excerpt}</p>
                        <div className="mt-auto flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                          <span>
                            {post.publishedAt
                              ? new Date(post.publishedAt).toLocaleDateString()
                              : 'Drafted'}
                          </span>
                          <Link
                            to={`/blog/${post.slug}`}
                            className="rounded-full border border-primary/20 px-4 py-1.5 text-xs font-semibold text-primary transition hover:border-primary hover:text-primary-dark"
                          >
                            Read more
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {pagination.totalPages > 1 ? (
                  <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
                    <span>
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => loadPosts(Math.max(1, pagination.page - 1))}
                        disabled={pagination.page <= 1 || loading}
                        className="rounded-full border border-slate-200 px-4 py-1.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 hover:border-primary hover:text-primary"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => loadPosts(Math.min(pagination.totalPages, pagination.page + 1))}
                        disabled={pagination.page >= pagination.totalPages || loading}
                        className="rounded-full border border-slate-200 px-4 py-1.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 hover:border-primary hover:text-primary"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
