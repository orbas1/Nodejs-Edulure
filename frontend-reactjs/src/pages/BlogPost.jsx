import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { fetchBlogPost } from '../api/blogApi.js';

function formatPublishedAt(timestamp) {
  if (!timestamp) return 'Unpublished';
  try {
    return new Date(timestamp).toLocaleString();
  } catch (error) {
    return 'Unpublished';
  }
}

function renderParagraphs(content) {
  if (!content) return null;
  return content
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim().length > 0)
    .map((paragraph, index) => (
      <p key={`paragraph-${index}`} className="text-base leading-relaxed text-slate-700">
        {paragraph.trim()}
      </p>
    ));
}

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchBlogPost(slug);
        if (cancelled) return;
        setPost(response);
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    if (slug) {
      load();
    }
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="mx-auto flex h-[60vh] max-w-4xl items-center justify-center px-6">
          <div className="rounded-3xl border border-primary/20 bg-white/80 px-6 py-4 text-sm font-semibold text-primary shadow-sm">
            Loading article…
          </div>
        </div>
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="mx-auto max-w-4xl px-6 py-24">
          <div className="space-y-6 rounded-3xl border border-rose-200 bg-rose-50/60 p-12 text-center shadow-sm">
            <h1 className="text-3xl font-semibold text-rose-600">We couldn't find that article</h1>
            <p className="text-sm text-rose-500">
              {error?.message ?? 'The article may have been unpublished or the link is incorrect.'}
            </p>
            <Link
              to="/blog"
              className="inline-flex rounded-full border border-rose-200 px-5 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-400 hover:text-rose-700"
            >
              Return to blog
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const heroImage = post.media?.[0]?.mediaUrl ?? null;
  const tags = Array.isArray(post.tags) ? post.tags : [];

  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_65%)]" />
        <div className="relative mx-auto max-w-4xl px-6 py-24">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-primary">
            {post.category?.name ? <span className="rounded-full bg-primary/10 px-3 py-1">{post.category.name}</span> : null}
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
              {post.readingTimeMinutes ?? 5} min read
            </span>
            <span className="text-slate-500">{formatPublishedAt(post.publishedAt)}</span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold text-slate-900 md:text-5xl">{post.title}</h1>
          {post.excerpt ? <p className="mt-4 max-w-3xl text-lg text-slate-600">{post.excerpt}</p> : null}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
            {tags.map((tag) => (
              <span key={tag.slug ?? tag.id} className="rounded-full border border-slate-200 px-3 py-1">
                #{tag.name ?? tag.slug}
              </span>
            ))}
          </div>
        </div>
      </section>

      {heroImage ? (
        <figure className="mx-auto max-w-5xl px-6">
          <img src={heroImage} alt={post.title} className="h-auto w-full rounded-4xl object-cover shadow-lg" />
        </figure>
      ) : null}

      <article className="mx-auto max-w-3xl space-y-6 px-6 py-16">
        <div className="space-y-4 text-base leading-relaxed text-slate-700">
          {renderParagraphs(post.content)}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Share this insight</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
            >
              Share on X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
            >
              Share on LinkedIn
            </a>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              className="rounded-full border border-primary/20 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:text-primary-dark"
            >
              Copy link
            </button>
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <Link
            to="/blog"
            className="rounded-full border border-slate-200 px-5 py-2 font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
          >
            Back to articles
          </Link>
          <span>Views: {post.viewCount ?? 0}</span>
        </footer>
      </article>
    </main>
  );
}
