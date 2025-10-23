import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  LifebuoyIcon,
  PaperClipIcon,
  PhoneIcon,
  PlusIcon,
  SparklesIcon,
  UserCircleIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import {
  closeSupportTicket as closeSupportTicketApi,
  createSupportTicket as createSupportTicketApi,
  replyToSupportTicket as replyToSupportTicketApi,
  updateSupportTicket as updateSupportTicketApi
} from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useLearnerSupportCases from '../../hooks/useLearnerSupportCases.js';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import TicketForm from '../../components/support/TicketForm.jsx';

const PRIORITY_BADGES = {
  urgent: 'bg-rose-100 text-rose-700',
  high: 'bg-amber-100 text-amber-700',
  normal: 'bg-primary/10 text-primary',
  low: 'bg-slate-100 text-slate-600'
};

const STATUS_BADGES = {
  open: 'bg-sky-100 text-sky-700',
  waiting: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-600'
};

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const CATEGORY_OPTIONS = [
  'Technical issue',
  'Billing & payments',
  'Course access',
  'Live classroom',
  'Community & chat',
  'Other'
];

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent — service outage' },
  { value: 'high', label: 'High — blocking work' },
  { value: 'normal', label: 'Normal — needs response soon' },
  { value: 'low', label: 'Low — feedback or request' }
];

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return 'Just now';
  return TIME_FORMATTER.format(date);
}

function formatRelative(value) {
  const date = toDate(value);
  if (!date) return 'moments ago';
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  if (Math.abs(diffMinutes) < 60) {
    return RELATIVE_FORMATTER.format(diffMinutes, 'minute');
  }
  const diffHours = Math.round(diffMs / (60 * 60 * 1000));
  if (Math.abs(diffHours) < 48) {
    return RELATIVE_FORMATTER.format(diffHours, 'hour');
  }
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return RELATIVE_FORMATTER.format(diffDays, 'day');
}

function normaliseKnowledgeBase(articles) {
  if (!Array.isArray(articles)) {
    return [];
  }
  return articles
    .filter((article) => article?.title)
    .map((article) => ({
      id: article.id ?? article.slug ?? article.title,
      title: article.title,
      excerpt: article.excerpt ?? article.summary ?? 'Explore the playbook to resolve common learner requests.',
      url: article.url ?? '#',
      category: article.category ?? article.topic ?? 'Guide',
      minutes: Number(article.minutes ?? article.readTime ?? 3)
    }));
}

function normaliseContacts(contacts) {
  if (!Array.isArray(contacts)) {
    return [
      {
        id: 'email',
        label: 'Email support',
        description: 'Send a note to the learner success desk. Avg response under 2 hours.',
        action: 'Email team',
        icon: EnvelopeIcon,
        href: 'mailto:support@edulure.test'
      },
      {
        id: 'call',
        label: 'Schedule a call',
        description: 'Book a 20 minute call with a specialist for billing or classroom escalations.',
        action: 'Schedule',
        icon: PhoneIcon,
        href: '#'
      },
      {
        id: 'live-chat',
        label: 'Live chat',
        description: 'Weekday concierge with instant escalation to instructors and moderators.',
        action: 'Start chat',
        icon: VideoCameraIcon,
        href: '#'
      }
    ];
  }
  return contacts.map((contact) => ({
    id: contact.id ?? contact.type ?? contact.label,
    label: contact.label ?? contact.name ?? 'Support channel',
    description:
      contact.description ??
      contact.summary ??
      'Reach the learner success team through the preferred support channel.',
    action: contact.action ?? contact.cta ?? 'Open channel',
    icon: contact.icon ?? EnvelopeIcon,
    href: contact.href ?? contact.url ?? '#'
  }));
}

function createAttachmentMeta(file) {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `upload-${Date.now()}`;
  return {
    id,
    name: file.name,
    size: file.size,
    type: file.type,
    file
  };
}

function AttachmentList({ attachments }) {
  if (!attachments?.length) {
    return null;
  }
  return (
    <ul className="mt-3 space-y-2 text-xs text-slate-500">
      {attachments.map((attachment) => (
        <li key={attachment.id} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
          <PaperClipIcon className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-medium text-slate-700">{attachment.name}</span>
          {typeof attachment.size === 'number' ? (
            <span className="text-slate-400">{Math.max(1, Math.round(attachment.size / 1024))} KB</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function MessageTimeline({ messages }) {
  if (!messages?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
        No conversation yet. Start by sharing context or asking a question.
      </div>
    );
  }
  return (
    <ol className="space-y-4">
      {messages.map((message) => {
        const isLearner = message.author === 'learner' || message.author === 'you';
        return (
          <li key={message.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isLearner ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'}`}>
                {isLearner ? 'You' : message.author ?? 'Support'}
              </span>
              <span className="text-xs text-slate-400">{formatDateTime(message.createdAt)}</span>
            </div>
            <div
              className={`rounded-3xl px-5 py-4 text-sm leading-relaxed shadow-sm ${
                isLearner
                  ? 'bg-gradient-to-r from-primary/90 to-primary text-white'
                  : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              {message.body ?? '—'}
            </div>
            <AttachmentList attachments={message.attachments} />
          </li>
        );
      })}
    </ol>
  );
}

function KnowledgeBaseCard({ article, helpful, onToggleHelpful }) {
  return (
    <article className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {article.category}
        </span>
        <h3 className="text-lg font-semibold text-slate-900">{article.title}</h3>
        <p className="text-sm text-slate-600">{article.excerpt}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {article.minutes} minute read
        </p>
      </div>
      <div className="mt-6 flex items-center gap-3 text-sm">
        <a
          href={article.url}
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 font-semibold text-primary transition hover:bg-primary hover:text-white"
        >
          Open playbook
          <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
        </a>
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
            helpful ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
          }`}
          onClick={() => onToggleHelpful(article.id)}
        >
          <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
          {helpful ? 'Marked helpful' : 'Mark helpful'}
        </button>
      </div>
    </article>
  );
}

function SupportContactCard({ contact }) {
  const Icon = contact.icon ?? EnvelopeIcon;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">{contact.label}</h3>
          <p className="text-sm text-slate-600">{contact.description}</p>
          <a
            href={contact.href}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:underline"
          >
            {contact.action}
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LearnerSupport() {
  const { isLearner, section: data, refresh, loading, error } = useLearnerDashboardSection('support');
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const initialCases = useMemo(() => (Array.isArray(data?.cases) ? data.cases : []), [data?.cases]);
  const knowledgeBase = useMemo(() => normaliseKnowledgeBase(data?.knowledgeBase ?? data?.articles), [data]);
  const contacts = useMemo(() => normaliseContacts(data?.contacts), [data?.contacts]);
  const serviceWindow = data?.serviceWindow ?? data?.serviceLevel?.label ?? '24/7 global support';
  const firstResponseMinutes = data?.metrics?.firstResponseMinutes ?? data?.metrics?.firstResponse ?? 42;

  const {
    cases,
    stats,
    createCase,
    updateCase,
    addMessage,
    closeCase,
    reopenCase,
    deleteCase
  } = useLearnerSupportCases(initialCases, { session });

  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [messageAttachments, setMessageAttachments] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [helpfulArticles, setHelpfulArticles] = useState({});

  useEffect(() => {
    setSelectedCaseId((current) => {
      if (current && cases.some((item) => item.id === current)) {
        return current;
      }
      return cases[0]?.id ?? null;
    });
  }, [cases]);

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setStatusMessage(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  const selectedCase = cases.find((supportCase) => supportCase.id === selectedCaseId) ?? null;

  const handleTicketSubmit = useCallback(
    async ({ subject, category, priority, description, attachments = [], knowledgeSuggestions = [] }) => {
      const trimmedSubject = subject?.trim();
      const trimmedDescription = description?.trim();
      if (!trimmedSubject || !trimmedDescription) {
        setStatusMessage({ type: 'error', message: 'Add a subject and description to submit your request.' });
        return;
      }

      setPendingAction('create');
      const timestamp = new Date().toISOString();
      let response;
      try {
        if (!token) {
          throw new Error('Sign in again to sync with the support team. Your request will be stored locally.');
        }
        response = await createSupportTicketApi({
          token,
          payload: {
            subject: trimmedSubject,
            category,
            priority,
            description: trimmedDescription,
            attachments,
            knowledgeSuggestions
          }
        });
        setStatusMessage({
          type: 'success',
          message: response?.message ?? 'Support request submitted. We will notify you via email and in-app.'
        });
      } catch (apiError) {
        setStatusMessage({
          type: 'warning',
          message:
            apiError instanceof Error
              ? `${apiError.message} We saved the ticket locally and will retry when you refresh.`
              : 'We saved the ticket locally but could not reach the support API.'
        });
      } finally {
        setPendingAction(null);
      }

      const remoteTicket = response?.data?.ticket ?? response?.data ?? {};
      const created = createCase({
        id: remoteTicket.id ?? remoteTicket.ticketId ?? `support-${Date.now()}`,
        reference: remoteTicket.reference ?? remoteTicket.ref ?? null,
        subject: remoteTicket.subject ?? trimmedSubject,
        category: remoteTicket.category ?? category,
        priority: remoteTicket.priority ?? priority,
        status: remoteTicket.status ?? 'open',
        knowledgeSuggestions:
          remoteTicket.knowledgeSuggestions ?? remoteTicket.knowledge_suggestions ?? knowledgeSuggestions,
        followUpDueAt: remoteTicket.followUpDueAt ?? remoteTicket.follow_up_due_at ?? null,
        aiSummary: remoteTicket.aiSummary ?? remoteTicket.ai_summary ?? null,
        escalationBreadcrumbs:
          remoteTicket.escalationBreadcrumbs ?? remoteTicket.escalation_breadcrumbs ?? [],
        createdAt: remoteTicket.createdAt ?? timestamp,
        updatedAt: remoteTicket.updatedAt ?? timestamp,
        messages:
          remoteTicket.messages?.length > 0
            ? remoteTicket.messages
            : [
                {
                  id: `msg-${timestamp}`,
                  author: 'learner',
                  body: trimmedDescription,
                  createdAt: timestamp,
                  attachments
                }
              ]
      });

      setSelectedCaseId(created?.id ?? remoteTicket.id ?? null);
      setTicketFormOpen(false);
    },
    [createCase, token]
  );

  const handleMessageAttachment = useCallback((event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setMessageAttachments((current) => [...current, ...files.map((file) => createAttachmentMeta(file))]);
    event.target.value = '';
  }, []);

  const handleMessageAttachmentRemove = useCallback((id) => {
    setMessageAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!selectedCase) {
      return;
    }
    if (!messageBody.trim() && messageAttachments.length === 0) {
      setStatusMessage({ type: 'error', message: 'Write a reply or attach a file before sending.' });
      return;
    }
    setPendingAction(selectedCase.id);
    const timestamp = new Date().toISOString();
    const attachments = messageAttachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      size: attachment.size,
      type: attachment.type
    }));
    let succeeded = false;
    try {
      if (!token) {
        throw new Error('You are offline. We will sync your reply when you refresh.');
      }
      await replyToSupportTicketApi({
        token,
        ticketId: selectedCase.id,
        payload: { body: messageBody, attachments }
      });
      succeeded = true;
      setStatusMessage({ type: 'success', message: 'Reply sent to the learner success team.' });
    } catch (apiError) {
      setStatusMessage({
        type: 'warning',
        message:
          apiError instanceof Error
            ? `${apiError.message} Stored the update locally.`
            : 'We stored your reply locally and will sync once online.'
      });
    } finally {
      setPendingAction(null);
    }

    addMessage(selectedCase.id, {
      id: `msg-${timestamp}`,
      author: 'learner',
      body: messageBody,
      createdAt: timestamp,
      attachments
    });
    if (!succeeded) {
      updateCase(selectedCase.id, { status: 'waiting' });
    }
    setMessageBody('');
    setMessageAttachments([]);
  }, [addMessage, messageAttachments, messageBody, selectedCase, token, updateCase]);

  const handleCloseCase = useCallback(
    async (supportCase) => {
      if (!supportCase) return;
      setPendingAction(`close-${supportCase.id}`);
      try {
        if (token) {
          await closeSupportTicketApi({ token, ticketId: supportCase.id, payload: { resolution: 'Learner confirmed resolved' } });
        }
        closeCase(supportCase.id, 'Learner marked resolved');
        setStatusMessage({ type: 'success', message: 'Case marked resolved.' });
      } catch (apiError) {
        closeCase(supportCase.id, 'Learner marked resolved');
        setStatusMessage({
          type: 'warning',
          message:
            apiError instanceof Error
              ? `${apiError.message} Resolution stored locally. Refresh to retry sync.`
              : 'Resolution stored locally. Refresh to sync with support.'
        });
      } finally {
        setPendingAction(null);
      }
    },
    [closeCase, token]
  );

  const handleReopenCase = useCallback(
    async (supportCase) => {
      if (!supportCase) return;
      setPendingAction(`reopen-${supportCase.id}`);
      try {
        if (token) {
          await updateSupportTicketApi({ token, ticketId: supportCase.id, payload: { status: 'open' } });
        }
        reopenCase(supportCase.id);
        setStatusMessage({ type: 'success', message: 'Case reopened. A specialist will follow up.' });
      } catch (apiError) {
        reopenCase(supportCase.id);
        setStatusMessage({
          type: 'warning',
          message:
            apiError instanceof Error
              ? `${apiError.message} Re-open stored locally. Refresh to sync.`
              : 'Re-open stored locally. Refresh to sync with support.'
        });
      } finally {
        setPendingAction(null);
      }
    },
    [reopenCase, token]
  );

  const handleDeleteCase = useCallback(
    (supportCase) => {
      if (!supportCase) return;
      const confirmed = window.confirm('Remove this case from your local archive? This does not cancel the support ticket.');
      if (!confirmed) return;
      deleteCase(supportCase.id);
      if (selectedCaseId === supportCase.id) {
        setSelectedCaseId(null);
      }
    },
    [deleteCase, selectedCaseId]
  );

  const toggleHelpfulArticle = useCallback((articleId) => {
    setHelpfulArticles((current) => ({ ...current, [articleId]: !current[articleId] }));
  }, []);

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner dashboard required"
        description="Switch to your learner Learnspace to manage support requests and knowledge base."
      />
    );
  }

  if (loading) {
    return (
      <DashboardStateMessage
        title="Loading support workspace"
        description="Fetching tickets, SLAs, and contact options for your learner workspace."
      />
    );
  }

  if (error) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Unable to load support"
        description={error.message ?? 'Support tooling is temporarily unavailable. Refresh to retry.'}
        actionLabel="Retry"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-10">
      <TicketForm
        open={ticketFormOpen}
        onClose={() => setTicketFormOpen(false)}
        onSubmit={handleTicketSubmit}
        serviceWindow={serviceWindow}
        firstResponseMinutes={firstResponseMinutes}
        categoryOptions={CATEGORY_OPTIONS}
        priorityOptions={PRIORITY_OPTIONS}
        defaultCategory={CATEGORY_OPTIONS[0]}
        defaultPriority="normal"
      />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="dashboard-title">Support workspace</h1>
          <p className="dashboard-subtitle">
            Manage learner success requests, triage live escalations, and surface answers instantly.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="dashboard-pill" onClick={() => refresh?.()}>
            <ArrowPathIcon className="mr-2 h-4 w-4" aria-hidden="true" /> Sync data
          </button>
          <button type="button" className="dashboard-primary-pill" onClick={() => setTicketFormOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" aria-hidden="true" /> New request
          </button>
        </div>
      </header>

      {statusMessage ? (
        <div
          role="status"
          className={`rounded-3xl border px-5 py-4 text-sm ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : statusMessage.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-600'
                : statusMessage.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-primary/30 bg-primary/5 text-primary'
          }`}
        >
          {statusMessage.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="dashboard-kicker">Open cases</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.open + stats.waiting}</p>
          <p className="mt-2 text-xs text-slate-500">Awaiting a response or in progress.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="dashboard-kicker">Average response</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.averageResponseMinutes}m</p>
          <p className="mt-2 text-xs text-slate-500">Current support SLA for your workspace.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="dashboard-kicker">Awaiting your reply</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.awaitingLearner}</p>
          <p className="mt-2 text-xs text-slate-500">Support is waiting on learner updates.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="dashboard-kicker">Resolved this quarter</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.resolved + stats.closed}</p>
          <p className="mt-2 text-xs text-slate-500">Closed cases across all channels.</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Cases</h2>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {cases.length} total
            </span>
          </div>
          <div className="space-y-3">
            {cases.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                No support requests yet. Use “New request” to start one.
              </div>
            ) : (
              cases.map((supportCase) => (
                <button
                  type="button"
                  key={supportCase.id}
                  onClick={() => setSelectedCaseId(supportCase.id)}
                  className={`w-full rounded-3xl border px-5 py-4 text-left shadow-sm transition ${
                    selectedCaseId === supportCase.id
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-slate-200 bg-white hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{supportCase.subject}</p>
                      <p className="mt-1 text-xs text-slate-500">{supportCase.category}</p>
                      <p className="mt-1 text-xs text-slate-400">Updated {formatRelative(supportCase.updatedAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          PRIORITY_BADGES[supportCase.priority] ?? PRIORITY_BADGES.normal
                        }`}
                      >
                        {supportCase.priority}
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          STATUS_BADGES[supportCase.status] ?? STATUS_BADGES.open
                        }`}
                      >
                        {supportCase.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {selectedCase ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="dashboard-kicker">Case detail</p>
                    <h2 className="text-lg font-semibold text-slate-900">{selectedCase.subject}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {selectedCase.reference ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                          {selectedCase.reference}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                        {selectedCase.category}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                        {selectedCase.channel}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedCase.status !== 'resolved' && selectedCase.status !== 'closed' ? (
                      <button
                        type="button"
                        className="dashboard-pill"
                        onClick={() => handleCloseCase(selectedCase)}
                        disabled={pendingAction === `close-${selectedCase.id}`}
                      >
                        Mark resolved
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="dashboard-pill"
                        onClick={() => handleReopenCase(selectedCase)}
                        disabled={pendingAction === `reopen-${selectedCase.id}`}
                      >
                        Reopen
                      </button>
                    )}
                    <button
                      type="button"
                      className="dashboard-pill"
                      onClick={() => handleDeleteCase(selectedCase)}
                    >
                      Archive local copy
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opened</p>
                    <p className="text-sm text-slate-700">{formatDateTime(selectedCase.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last update</p>
                    <p className="text-sm text-slate-700">{formatDateTime(selectedCase.updatedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned</p>
                    <p className="text-sm text-slate-700">
                      {selectedCase.owner ?? selectedCase.lastAgent ?? 'Learner success desk'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Messages</p>
                    <p className="text-sm text-slate-700">{selectedCase.messageCount}</p>
                  </div>
                </div>

                <MessageTimeline messages={selectedCase.messages} />

                <div className="space-y-3">
                  <label className="flex flex-col text-sm font-medium text-slate-700">
                    Reply to support
                    <textarea
                      rows={4}
                      value={messageBody}
                      onChange={(event) => setMessageBody(event.target.value)}
                      className="dashboard-input mt-2"
                      placeholder="Share updates, attach artifacts, or ask follow-up questions."
                      disabled={pendingAction === selectedCase.id}
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-primary/40 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10">
                      <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" /> Add attachment
                      <input type="file" multiple className="hidden" onChange={handleMessageAttachment} />
                    </label>
                    <span className="text-xs text-slate-400">Optional — logs, screenshots, transcripts.</span>
                  </div>
                  <AttachmentList attachments={messageAttachments} />
                  {messageAttachments.length ? (
                    <div className="flex flex-wrap gap-2">
                      {messageAttachments.map((attachment) => (
                        <button
                          type="button"
                          key={attachment.id}
                          className="dashboard-pill text-xs"
                          onClick={() => handleMessageAttachmentRemove(attachment.id)}
                        >
                          Remove {attachment.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      className="dashboard-primary-pill"
                      onClick={handleSendMessage}
                      disabled={pendingAction === selectedCase.id}
                    >
                      {pendingAction === selectedCase.id ? 'Sending…' : 'Send reply'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                Select a case to view the timeline and reply.
              </div>
            )}
          </div>

          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
            <div className="flex items-start gap-3">
              <LifebuoyIcon className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Support hours</p>
                <p className="mt-1 text-sm text-slate-600">{serviceWindow}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <SparklesIcon className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Specialist team</p>
                <p className="mt-1 text-sm text-slate-600">
                  First response under {firstResponseMinutes} minutes. Priority cases route to live operations.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserCircleIcon className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Your dedicated crew</p>
                <p className="mt-1 text-sm text-slate-600">
                  {data?.successManager ?? 'Assigned success manager coordinates across instructors, finance, and community moderators.'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Escalation playbook</p>
                <p className="mt-1 text-sm text-slate-600">
                  Urgent incidents route to live command within 5 minutes with SMS and Slack alerts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="dashboard-kicker">Knowledge base</p>
            <h2 className="text-lg font-semibold text-slate-900">Guides curated for your workspace</h2>
          </div>
          <button type="button" className="dashboard-pill" onClick={() => refresh?.()}>
            Refresh recommendations
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {knowledgeBase.length ? (
            knowledgeBase.map((article) => (
              <KnowledgeBaseCard
                key={article.id}
                article={article}
                helpful={Boolean(helpfulArticles[article.id])}
                onToggleHelpful={toggleHelpfulArticle}
              />
            ))
          ) : (
            <div className="md:col-span-2 xl:col-span-3">
              <DashboardStateMessage
                title="No guides yet"
                description="Once support publishes learner success guides they will appear here."
              />
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2">
          <p className="dashboard-kicker">Need to talk now?</p>
          <h2 className="text-lg font-semibold text-slate-900">Live support options</h2>
          <p className="text-sm text-slate-600">
            Combine async tickets with real-time channels for urgent escalations. We route context from your cases.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {contacts.map((contact) => (
            <SupportContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-primary/10 via-white to-primary/10 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="dashboard-kicker">Feedback loop</p>
            <h2 className="text-lg font-semibold text-slate-900">Help us keep improving support</h2>
            <p className="mt-1 text-sm text-slate-600">
              Share wins, gaps, or new playbooks needed. We route feedback directly to the learner success leads.
            </p>
          </div>
          <a href="#" className="dashboard-primary-pill">
            <DocumentTextIcon className="mr-2 h-4 w-4" aria-hidden="true" /> Submit feedback
          </a>
        </div>
      </section>
    </div>
  );
}
