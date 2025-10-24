import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Dialog, Transition } from '@headlessui/react';
import {
  ArrowUpRightIcon,
  CheckCircleIcon,
  ClockIcon,
  LifebuoyIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/solid';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function formatCaseTimestamp(timestamp) {
  if (!timestamp) {
    return 'Recently';
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function SupportLauncher({ launcher }) {
  const {
    isOpen,
    closeLauncher,
    query,
    setQuery,
    category,
    setCategory,
    suggestions,
    helpfulArticleIds,
    toggleHelpfulArticle,
    metrics,
    deflectionRate,
    loading,
    error,
    feedbackHistory,
    submitFeedback,
    feedbackPending,
    context,
    caseSummaries
  } = launcher ?? {};

  const [feedback, setFeedback] = useState({ rating: 0, comment: '' });
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFeedback({ rating: 0, comment: '' });
      setFeedbackMessage(null);
    }
  }, [isOpen]);

  if (!launcher) {
    return null;
  }

  const contextTags = useMemo(() => {
    if (!context) {
      return [];
    }
    const tags = [];
    if (context.role) {
      tags.push({ id: 'role', label: context.role });
    }
    if (Array.isArray(context.segments) && context.segments.length) {
      tags.push({ id: 'path', label: `/${context.segments.join('/')}` });
    }
    if (typeof context.metrics?.open === 'number') {
      tags.push({ id: 'open', label: `${context.metrics.open} open cases` });
    }
    return tags;
  }, [context]);

  const handleToggleHelpful = useCallback(
    (articleId) => {
      toggleHelpfulArticle?.(articleId);
    },
    [toggleHelpfulArticle]
  );

  const handleSubmitFeedback = async (event) => {
    event.preventDefault();
    try {
      await submitFeedback?.(feedback);
      setFeedback({ rating: 0, comment: '' });
      setFeedbackMessage({ tone: 'success', text: 'Feedback sent. Thank you for helping us improve support workflows!' });
    } catch (submissionError) {
      setFeedbackMessage({
        tone: 'error',
        text: submissionError?.message ?? 'Unable to send feedback. Please try again.'
      });
    }
  };

  const stats = [
    {
      id: 'open-cases',
      label: 'Open cases',
      value: metrics?.open ?? 0,
      icon: LifebuoyIcon
    },
    {
      id: 'awaiting',
      label: 'Waiting on learner',
      value: metrics?.awaitingLearner ?? 0,
      icon: ChatBubbleBottomCenterTextIcon
    },
    {
      id: 'response-time',
      label: 'Avg response (min)',
      value: metrics?.averageResponseMinutes ?? 0,
      icon: ClockIcon
    },
    {
      id: 'deflection',
      label: 'Deflection rate',
      value: `${deflectionRate}%`,
      icon: SparklesIcon
    }
  ];

  const lastFeedback = feedbackHistory?.[0] ?? context?.lastFeedback ?? null;
  const helpfulSet = useMemo(() => new Set(helpfulArticleIds ?? []), [helpfulArticleIds]);

  return (
    <Transition show={isOpen} as={Fragment} appear>
      <Dialog as="div" className="relative z-50" onClose={closeLauncher}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel
                className="w-full max-w-5xl transform overflow-hidden rounded-3xl border border-slate-200/70 shadow-2xl"
                style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                <div className="flex flex-col gap-6 p-6 sm:p-8">
                  <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                      <Dialog.Title className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <LifebuoyIcon className="h-6 w-6" />
                        </span>
                        Support & knowledge workspace
                      </Dialog.Title>
                      <p className="max-w-2xl text-sm text-slate-500" style={{ color: 'var(--color-text-muted)' }}>
                        Search live playbooks, surface contextual guidance, and track open conversations without
                        leaving your current workflow. Helpful marks feed annex deflection metrics and keep support
                        teams aligned with learner insights.
                      </p>
                      {contextTags.length ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {contextTags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
                            >
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={closeLauncher}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 text-slate-500 transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      aria-label="Close support launcher"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </header>

                  <div className="grid gap-8 lg:grid-cols-[1.7fr,1fr]">
                    <section className="flex flex-col gap-6">
                      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm"
                        style={{ backgroundColor: 'var(--color-surface-muted)' }}
                      >
                        <label className="text-sm font-semibold text-slate-600" htmlFor="support-launcher-search">
                          Search the knowledge base
                        </label>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="relative flex-1">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input
                              id="support-launcher-search"
                              value={query}
                              onChange={(event) => setQuery?.(event.target.value)}
                              type="search"
                              placeholder="How do I escalate a live classroom incident?"
                              className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                          </div>
                          <select
                            value={category}
                            onChange={(event) => setCategory?.(event.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                          >
                            <option value="all">All topics</option>
                            <option value="technical">Technical</option>
                            <option value="billing">Billing & payments</option>
                            <option value="community">Community & chat</option>
                            <option value="feedback">Feedback loops</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {loading ? (
                          <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, index) => (
                              <div
                                key={`kb-skeleton-${index}`}
                                className="h-28 rounded-3xl border border-dashed border-slate-200/70 bg-slate-100/60"
                              />
                            ))}
                          </div>
                        ) : error ? (
                          <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-700">
                            {error.message ?? 'Support knowledge base temporarily unavailable.'}
                          </div>
                        ) : suggestions.length ? (
                          suggestions.map((article) => {
                            const markedHelpful = helpfulSet.has(article.id);
                            return (
                              <article
                                key={article.id}
                                className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                              >
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                                    {article.category}
                                  </span>
                                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                    {article.minutes} min read
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  <h3 className="text-lg font-semibold text-slate-900">{article.title}</h3>
                                  <p className="text-sm text-slate-500">{article.excerpt}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <a
                                    href={article.url}
                                    className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                                  >
                                    Open playbook
                                    <ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleHelpful(article.id)}
                                    className={classNames(
                                      'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                                      markedHelpful
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                                        : 'border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary'
                                    )}
                                  >
                                    <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
                                    {markedHelpful ? 'Marked helpful' : 'Mark helpful'}
                                  </button>
                                </div>
                              </article>
                            );
                          })
                        ) : (
                          <div className="rounded-3xl border border-dashed border-slate-200/70 p-8 text-center text-sm text-slate-500">
                            No matching playbooks yet. Try another phrase or share feedback so the support team can expand the
                            knowledge base.
                          </div>
                        )}
                      </div>
                    </section>

                    <aside className="flex flex-col gap-6 rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm"
                      style={{ backgroundColor: 'var(--color-surface-muted)' }}
                    >
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Support signals</h3>
                        <dl className="grid gap-3">
                          {stats.map((stat) => (
                            <div
                              key={stat.id}
                              className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3"
                            >
                              <div className="flex items-center gap-3">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                  <stat.icon className="h-4 w-4" aria-hidden="true" />
                                </span>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stat.label}</dt>
                              </div>
                              <dd className="text-sm font-semibold text-slate-900">{stat.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>

                      {caseSummaries?.length ? (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent cases</h3>
                          <ul className="space-y-2">
                            {caseSummaries.slice(0, 3).map((supportCase) => (
                              <li
                                key={supportCase.id}
                                className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-600"
                              >
                                <p className="font-semibold text-slate-800">{supportCase.subject}</p>
                                <p className="text-xs uppercase tracking-wide text-slate-400">
                                  {supportCase.status} • {formatCaseTimestamp(supportCase.updatedAt)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Share quick feedback</h3>
                        {feedbackMessage ? (
                          <div
                            className={classNames(
                              'rounded-2xl border px-4 py-3 text-sm',
                              feedbackMessage.tone === 'success'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-rose-200 bg-rose-50 text-rose-700'
                            )}
                          >
                            {feedbackMessage.text}
                          </div>
                        ) : null}
                        <form className="space-y-3" onSubmit={handleSubmitFeedback}>
                          <div className="flex items-center gap-2">
                            {Array.from({ length: 5 }).map((_, index) => {
                              const value = index + 1;
                              const active = feedback.rating >= value;
                              return (
                                <button
                                  key={`feedback-star-${value}`}
                                  type="button"
                                  onClick={() => setFeedback((prev) => ({ ...prev, rating: value }))}
                                  className={classNames(
                                    'inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                                    active
                                      ? 'border-amber-300 bg-amber-50 text-amber-600'
                                      : 'border-slate-200 text-slate-400 hover:border-primary/30 hover:text-primary'
                                  )}
                                  aria-label={`Set feedback rating to ${value}`}
                                >
                                  {value}
                                </button>
                              );
                            })}
                          </div>
                          <textarea
                            value={feedback.comment}
                            onChange={(event) => setFeedback((prev) => ({ ...prev, comment: event.target.value }))}
                            placeholder="Tell us what worked well or what felt confusing."
                            rows={3}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                          <button
                            type="submit"
                            disabled={feedbackPending || !feedback.rating}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
                          >
                            {feedbackPending ? 'Sending…' : 'Send feedback'}
                          </button>
                        </form>
                        {lastFeedback ? (
                          <p className="text-xs text-slate-400">
                            Last shared feedback: {lastFeedback.rating ? `${lastFeedback.rating}/5` : 'No rating'} •{' '}
                            {lastFeedback.comment ? lastFeedback.comment : 'No additional notes captured.'}
                          </p>
                        ) : null}
                      </div>
                    </aside>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

SupportLauncher.propTypes = {
  launcher: PropTypes.shape({
    isOpen: PropTypes.bool.isRequired,
    closeLauncher: PropTypes.func.isRequired,
    query: PropTypes.string,
    setQuery: PropTypes.func,
    category: PropTypes.string,
    setCategory: PropTypes.func,
    suggestions: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        excerpt: PropTypes.string,
        url: PropTypes.string,
        category: PropTypes.string,
        minutes: PropTypes.number
      })
    ),
    helpfulArticleIds: PropTypes.instanceOf(Set),
    toggleHelpfulArticle: PropTypes.func,
    metrics: PropTypes.shape({
      open: PropTypes.number,
      awaitingLearner: PropTypes.number,
      averageResponseMinutes: PropTypes.number
    }),
    deflectionRate: PropTypes.number,
    loading: PropTypes.bool,
    error: PropTypes.object,
    feedbackHistory: PropTypes.array,
    submitFeedback: PropTypes.func,
    feedbackPending: PropTypes.bool,
    context: PropTypes.object,
    caseSummaries: PropTypes.array
  })
};

SupportLauncher.defaultProps = {
  launcher: null
};

export default SupportLauncher;
