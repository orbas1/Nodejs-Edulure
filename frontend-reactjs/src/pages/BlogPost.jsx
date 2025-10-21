import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { fetchBlogPost } from '../api/blogApi.js';
import usePageMetadata from '../hooks/usePageMetadata.js';

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
  const [shareUrl, setShareUrl] = useState('');
  const [copyStatus, setCopyStatus] = useState('idle');
  const [readingProgress, setReadingProgress] = useState(0);

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

  useEffect(() => {
    if (!post) {
      setShareUrl('');
      return;
    }

    const explicitUrl = post.permalink ?? post.shareUrl;
    if (explicitUrl) {
      setShareUrl(explicitUrl);
      return;
    }

    if (typeof window !== 'undefined' && window.location?.href) {
      setShareUrl(window.location.href);
    }
  }, [post]);

  useEffect(() => {
    if (!post) {
      setReadingProgress(0);
      return () => {};
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return () => {};
    }

    const articleElement = document.querySelector('[data-blog-article="content"]');
    if (!articleElement) {
      return () => {};
    }

    let animationFrame = null;

    const handleScroll = () => {
      animationFrame = null;
      const rect = articleElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const totalHeight = rect.height + rect.top;
      const progress = totalHeight <= 0 ? 100 : Math.min(100, Math.max(0, ((viewportHeight - rect.top) / totalHeight) * 100));
      setReadingProgress(Number.isFinite(progress) ? Math.round(progress) : 0);
    };

    const onScroll = () => {
      if (animationFrame !== null) {
        return;
      }
      animationFrame = window.requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [post]);

  useEffect(() => {
    if (copyStatus === 'idle') {
      return undefined;
    }

    const timeout = setTimeout(() => setCopyStatus('idle'), 3000);
    return () => clearTimeout(timeout);
  }, [copyStatus]);

  const encodedShareUrl = useMemo(() => (shareUrl ? encodeURIComponent(shareUrl) : ''), [shareUrl]);
  const encodedTitle = useMemo(() => (post?.title ? encodeURIComponent(post.title) : ''), [post?.title]);
  const emailShareHref = useMemo(() => {
    if (!shareUrl) {
      return undefined;
    }
    const subject = post?.title ? `${post.title} · Edulure` : 'Insight from Edulure';
    const emailBody = `Thought you might enjoy this article from Edulure: ${shareUrl}`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
  }, [post?.title, shareUrl]);

  const tagKeywords = useMemo(() => (Array.isArray(post?.tags) ? post.tags.map((tag) => tag?.name ?? tag?.slug).filter(Boolean) : []), [
    post?.tags
  ]);

  const metaDescription = useMemo(() => {
    if (post?.excerpt) {
      return post.excerpt;
    }
    if (post?.content) {
      const condensed = post.content.replace(/\s+/g, ' ').trim();
      return condensed.length > 220 ? `${condensed.slice(0, 217)}…` : condensed;
    }
    return 'Explore community-led education insights, frameworks, and operator playbooks from the Edulure team.';
  }, [post?.excerpt, post?.content]);

  const canonicalPath = post?.slug ? `/blog/${post.slug}` : '/blog';
  const robots = post?.status === 'draft' || post?.visibility === 'private' ? 'noindex, nofollow' : 'index, follow';

  const canonicalUrlForStructured = useMemo(() => {
    if (post?.permalink) {
      return post.permalink;
    }
    if (post?.shareUrl) {
      return post.shareUrl;
    }
    if (typeof window !== 'undefined') {
      try {
        return new URL(canonicalPath, window.location.origin).toString();
      } catch (_error) {
        return undefined;
      }
    }
    return canonicalPath ? `https://www.edulure.com${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}` : undefined;
  }, [post?.permalink, post?.shareUrl, canonicalPath]);

  const heroImage = post?.media?.[0]?.mediaUrl ?? null;

  const structuredData = useMemo(() => {
    if (!post) {
      return null;
    }
    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: metaDescription,
      datePublished: post.publishedAt ?? undefined,
      dateModified: post.updatedAt ?? post.publishedAt ?? undefined,
      mainEntityOfPage: canonicalUrlForStructured,
      image: heroImage ? [heroImage] : undefined,
      author: post.author?.name
        ? {
            '@type': 'Person',
            name: post.author.name
          }
        : undefined
    };
  }, [post, metaDescription, canonicalUrlForStructured, heroImage]);

  usePageMetadata({
    title: post?.title ?? 'Edulure blog insight',
    description: metaDescription,
    canonicalPath,
    image: heroImage ?? undefined,
    robots,
    keywords: tagKeywords,
    structuredData,
    analytics: post
      ? {
          page_type: 'blog_article',
          resource_id: post.id,
          published_at: post.publishedAt ?? null
        }
      : { page_type: 'blog_article' }
  });

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) {
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else if (typeof document !== 'undefined') {
        const temporaryInput = document.createElement('input');
        temporaryInput.setAttribute('aria-hidden', 'true');
        temporaryInput.value = shareUrl;
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        document.execCommand('copy');
        document.body.removeChild(temporaryInput);
      }
      setCopyStatus('success');
    } catch (copyError) {
      console.error('Unable to copy article link', copyError);
      setCopyStatus('error');
    }
  }, [shareUrl]);

  const shareButtonLabel = useMemo(() => {
    if (copyStatus === 'success') {
      return 'Link copied';
    }
    if (copyStatus === 'error') {
      return 'Copy failed';
    }
    return 'Copy link';
  }, [copyStatus]);

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
            <h1 className="text-3xl font-semibold text-rose-600">We couldn&rsquo;t find that article</h1>
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

  const tags = Array.isArray(post.tags) ? post.tags : [];
  const wordCount = useMemo(() => {
    if (!post?.content) {
      return null;
    }
    const words = post.content.trim().split(/\s+/).filter(Boolean);
    return words.length || null;
  }, [post?.content]);

  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_65%)]" />
        <div className="relative mx-auto max-w-4xl px-6 py-24">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-primary">
            <span className="rounded-full bg-primary/10 px-3 py-1">Reading progress {readingProgress}%</span>
            {wordCount ? <span className="rounded-full bg-slate-900/10 px-3 py-1 text-slate-700">{wordCount.toLocaleString()} words</span> : null}
          </div>
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

      <article className="mx-auto max-w-3xl space-y-6 px-6 py-16" data-blog-article="content">
        <div className="space-y-4 text-base leading-relaxed text-slate-700">
          {renderParagraphs(post.content)}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Share this insight</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a
              href={encodedShareUrl ? `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedShareUrl}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary disabled:opacity-50"
              aria-disabled={!encodedShareUrl}
              onClick={(event) => {
                if (!encodedShareUrl) {
                  event.preventDefault();
                }
              }}
            >
              Share on X
            </a>
            <a
              href={encodedShareUrl ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrl}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary disabled:opacity-50"
              aria-disabled={!encodedShareUrl}
              onClick={(event) => {
                if (!encodedShareUrl) {
                  event.preventDefault();
                }
              }}
            >
              Share on LinkedIn
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!shareUrl}
              className="rounded-full border border-primary/20 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:text-primary-dark disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              {shareButtonLabel}
            </button>
            <a
              href={emailShareHref}
              onClick={(event) => {
                if (!emailShareHref) {
                  event.preventDefault();
                }
              }}
              className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary disabled:opacity-50"
            >
              Share via email
            </a>
          </div>
          <div aria-live="polite" className="mt-2 text-xs font-semibold text-slate-500">
            {copyStatus === 'success'
              ? 'Article link copied to your clipboard.'
              : copyStatus === 'error'
                ? 'Your browser blocked clipboard access. Try sharing manually instead.'
                : ''}
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
