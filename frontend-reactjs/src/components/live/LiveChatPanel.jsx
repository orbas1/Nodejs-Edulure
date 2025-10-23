import { Fragment, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  BoltIcon,
  ChatBubbleOvalLeftIcon,
  PaperAirplaneIcon,
  QueueListIcon
} from '@heroicons/react/24/outline';

function formatTimestamp(value) {
  if (!value) {
    return 'Just now';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function ChatMessage({ message }) {
  const isHost = message.role === 'host' || message.role === 'facilitator';
  const isSystem = message.role === 'system';
  const baseClass =
    'rounded-3xl px-5 py-4 text-sm leading-relaxed shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

  if (isSystem) {
    return (
      <li className="flex flex-col gap-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
        <span>{message.body}</span>
        <span className="font-normal normal-case text-slate-500">{formatTimestamp(message.createdAt)}</span>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            isHost ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {message.author}
        </span>
        <span className="text-xs text-slate-400">{formatTimestamp(message.createdAt)}</span>
      </div>
      <div
        className={`${baseClass} ${
          isHost
            ? 'bg-gradient-to-r from-primary/90 to-primary text-white focus-visible:outline-primary/40'
            : 'border border-slate-200 bg-white text-slate-700 focus-visible:outline-primary/50'
        }`}
      >
        {message.body}
      </div>
      {Array.isArray(message.attachments) && message.attachments.length > 0 ? (
        <ul className="flex flex-wrap gap-2 text-xs text-primary">
          {message.attachments.map((attachment) => (
            <li
              key={attachment.id ?? attachment.url}
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary"
            >
              <QueueListIcon className="h-4 w-4" aria-hidden="true" />
              <span>{attachment.name ?? 'Attachment'}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

ChatMessage.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    author: PropTypes.string.isRequired,
    role: PropTypes.string,
    body: PropTypes.string.isRequired,
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    attachments: PropTypes.array
  }).isRequired
};

function SuggestionList({ suggestions, onSelect, helpfulIds, onToggleHelpful }) {
  if (!suggestions.length) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-3xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <BoltIcon className="h-4 w-4" aria-hidden="true" />
        Smart suggestions
      </div>
      <ul className="space-y-3 text-sm text-slate-600">
        {suggestions.map((article) => {
          const helpful = helpfulIds.has(article.id);
          return (
            <li key={article.id} className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
              <button
                type="button"
                className="text-left"
                onClick={() => onSelect?.(article)}
              >
                <p className="text-sm font-semibold text-slate-900">{article.title}</p>
                {article.excerpt ? <p className="mt-1 text-xs text-slate-500">{article.excerpt}</p> : null}
                <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">{article.minutes} min read</p>
              </button>
              <div className="mt-3 flex items-center gap-3 text-xs">
                <a
                  href={article.url}
                  className="font-semibold text-primary transition hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open playbook
                </a>
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold transition ${
                    helpful
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : 'border-slate-200 text-slate-500 hover:border-primary hover:text-primary'
                  }`}
                  onClick={() => onToggleHelpful?.(article.id)}
                >
                  <ChatBubbleOvalLeftIcon className="h-4 w-4" aria-hidden="true" />
                  {helpful ? 'Helpful' : 'Helpful?'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

SuggestionList.propTypes = {
  suggestions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string.isRequired,
      excerpt: PropTypes.string,
      url: PropTypes.string,
      minutes: PropTypes.number
    })
  ),
  onSelect: PropTypes.func,
  helpfulIds: PropTypes.instanceOf(Set),
  onToggleHelpful: PropTypes.func
};

SuggestionList.defaultProps = {
  suggestions: [],
  onSelect: undefined,
  helpfulIds: new Set(),
  onToggleHelpful: undefined
};

export default function LiveChatPanel({
  title = 'Live chat',
  description,
  messages = [],
  composerValue,
  onComposerChange,
  onSend,
  sending,
  placeholder = 'Share a thought with the room…',
  disabled,
  suggestions = [],
  onSuggestionSelect,
  helpfulSuggestionIds,
  onToggleSuggestionHelpful,
  composerFooter,
  participants = []
}) {
  const helpfulIds = useMemo(() => new Set(helpfulSuggestionIds ?? []), [helpfulSuggestionIds]);

  return (
    <div className="flex h-full flex-col gap-4 rounded-4xl border border-slate-200 bg-white/90 p-5 shadow-xl">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description ? <p className="text-sm text-slate-500">{description}</p> : null}
          </div>
          {participants.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                {participants.length} attending
              </span>
              {participants.slice(0, 3).map((participant) => (
                <span key={participant} className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                  {participant}
                </span>
              ))}
              {participants.length > 3 ? <span>+{participants.length - 3} more</span> : null}
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-3xl bg-slate-50/80 p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet. Say hello to kick things off.</p>
        ) : (
          <ol className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </ol>
        )}
      </div>

      <div className="space-y-4">
        <SuggestionList
          suggestions={suggestions}
          onSelect={onSuggestionSelect}
          helpfulIds={helpfulIds}
          onToggleHelpful={onToggleSuggestionHelpful}
        />

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled) {
              onSend?.();
            }
          }}
        >
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</span>
            <textarea
              value={composerValue ?? ''}
              onChange={(event) => onComposerChange?.(event.target.value)}
              rows={3}
              placeholder={placeholder}
              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              disabled={disabled}
            />
          </label>
          {composerFooter ? <Fragment>{composerFooter}</Fragment> : null}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">Shift + Enter to add a new line</p>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={disabled || sending}
            >
              <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
              {sending ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

LiveChatPanel.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      author: PropTypes.string.isRequired,
      role: PropTypes.string,
      body: PropTypes.string.isRequired,
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
      attachments: PropTypes.array
    })
  ),
  composerValue: PropTypes.string,
  onComposerChange: PropTypes.func,
  onSend: PropTypes.func,
  sending: PropTypes.bool,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  suggestions: PropTypes.array,
  onSuggestionSelect: PropTypes.func,
  helpfulSuggestionIds: PropTypes.array,
  onToggleSuggestionHelpful: PropTypes.func,
  composerFooter: PropTypes.node,
  participants: PropTypes.arrayOf(PropTypes.string)
};

LiveChatPanel.defaultProps = {
  title: 'Live chat',
  description: undefined,
  messages: [],
  composerValue: '',
  onComposerChange: undefined,
  onSend: undefined,
  sending: false,
  placeholder: 'Share a thought with the room…',
  disabled: false,
  suggestions: [],
  onSuggestionSelect: undefined,
  helpfulSuggestionIds: undefined,
  onToggleSuggestionHelpful: undefined,
  composerFooter: undefined,
  participants: []
};
