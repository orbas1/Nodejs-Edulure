import { ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline';

import { formatKnowledgeRelativeTime } from '../../features/support/knowledgeBase.js';

export default function SupportKnowledgeResults({
  suggestions,
  loading,
  error,
  offline,
  lastFetchedAt,
  isStale,
  onRefresh,
  fallbackContact = 'support@edulure.com'
}) {
  const hasSuggestions = Array.isArray(suggestions) && suggestions.length > 0;
  const freshnessLabel = formatKnowledgeRelativeTime(lastFetchedAt);

  return (
    <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-primary">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5" aria-hidden="true" />
          Suggested fixes
        </div>
        <div className="flex items-center gap-2 text-xs text-primary/70">
          {freshnessLabel ? <span>{freshnessLabel}</span> : null}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-3 py-1 font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onRefresh}
            disabled={loading || offline}
          >
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" /> Refresh
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-primary/80">
        We surface knowledge base guidance while you draft so you and the support desk share the same playbooks.
      </p>
      <div className="mt-4 space-y-3">
        {offline ? (
          <p className="text-xs text-amber-600">
            You&apos;re offline. Jot down your request and email <a className="font-semibold underline" href={`mailto:${fallbackContact}`}>{fallbackContact}</a> for urgent incidents.
          </p>
        ) : error ? (
          <p className="text-xs text-rose-600">
            We couldn&apos;t load suggestions.
            {error?.message ? ` ${error.message}` : ''}
            {onRefresh ? ' Try refreshing once your connection is stable.' : ' Retry in a moment.'}
          </p>
        ) : loading ? (
          <p className="text-xs text-slate-500">Searching the knowledge base…</p>
        ) : hasSuggestions ? (
          suggestions.map((suggestion) => (
            <article key={suggestion.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{suggestion.title}</p>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {suggestion.minutes} min
                </span>
              </div>
              {suggestion.excerpt ? (
                <p className="mt-1 text-xs text-slate-500">{suggestion.excerpt}</p>
              ) : null}
              <div className="mt-3 text-xs">
                <a className="font-semibold text-primary underline" href={suggestion.url}>
                  Open guide
                </a>
              </div>
            </article>
          ))
        ) : (
          <p className="text-xs text-slate-400">
            No instant matches yet. Add more detail and we&apos;ll fetch tailored runbooks.
          </p>
        )}
      </div>
      {isStale && !loading && !offline ? (
        <p className="mt-3 text-xs text-amber-600">
          These suggestions are a few minutes old. Refresh to pull the newest playbooks.
        </p>
      ) : null}
    </div>
  );
}
