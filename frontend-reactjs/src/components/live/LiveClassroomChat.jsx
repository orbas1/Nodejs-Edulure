import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

function normaliseMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((message) => {
      if (!message) return null;
      return {
        id: message.id ?? `${message.author ?? 'anon'}:${message.createdAt ?? Math.random().toString(36)}`,
        author: message.author ?? 'Participant',
        body: message.body ?? message.message ?? '',
        createdAt: message.createdAt ?? message.timestamp ?? null,
        pinned: Boolean(message.pinned),
        reactions: Array.isArray(message.reactions) ? message.reactions : []
      };
    })
    .filter(Boolean)
    .slice(-25);
}

function formatTimestamp(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function LiveClassroomChat({
  sessionTitle,
  messages,
  onSend,
  onReact,
  isMuted,
  isBusy,
  participants
}) {
  const [draft, setDraft] = useState('');
  const normalisedMessages = useMemo(() => normaliseMessages(messages), [messages]);
  const pinnedMessage = normalisedMessages.find((message) => message.pinned) ?? null;
  const audienceLabel = useMemo(() => {
    if (!Array.isArray(participants) || participants.length === 0) {
      return 'No participants online';
    }
    return `${participants.length} participants`;
  }, [participants]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft.trim() || typeof onSend !== 'function') {
      return;
    }
    await onSend(draft.trim());
    setDraft('');
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Live chat</p>
          <h3 className="text-lg font-semibold text-slate-900">{sessionTitle ?? 'Classroom conversation'}</h3>
          <p className="text-xs text-slate-500">{audienceLabel}</p>
        </div>
        {isMuted ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Chat muted</span>
        ) : null}
      </header>

      {pinnedMessage ? (
        <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
          <p className="font-semibold">Pinned by host</p>
          <p className="mt-1 text-primary/80">{pinnedMessage.body}</p>
        </div>
      ) : null}

      <div className="mt-4 max-h-60 space-y-3 overflow-y-auto pr-2 text-sm text-slate-700">
        {normalisedMessages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Chat will appear here once the host starts the conversation.
          </p>
        ) : (
          normalisedMessages.map((message) => (
            <article key={message.id} className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{message.author}</span>
                <span>{formatTimestamp(message.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-700">{message.body}</p>
              {Array.isArray(message.reactions) && message.reactions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-primary">
                  {message.reactions.map((reaction) => (
                    <span key={`${message.id}-${reaction}`} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                      {reaction}
                    </span>
                  ))}
                </div>
              ) : null}
              {typeof onReact === 'function' ? (
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-1 hover:border-primary hover:text-primary"
                    onClick={() => onReact(message.id, 'appreciate')}
                    disabled={isBusy}
                  >
                    Appreciate
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-1 hover:border-primary hover:text-primary"
                    onClick={() => onReact(message.id, 'question')}
                    disabled={isBusy}
                  >
                    Ask follow-up
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Send a message
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            placeholder={isMuted ? 'Host muted the chat' : 'Share an update or ask a question'}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={isMuted || isBusy}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>Messages respect your Edulure name and avatar.</span>
          <button
            type="submit"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isMuted || isBusy || !draft.trim()}
          >
            {isBusy ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>
    </section>
  );
}

LiveClassroomChat.propTypes = {
  sessionTitle: PropTypes.string,
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      author: PropTypes.string,
      body: PropTypes.string,
      createdAt: PropTypes.string,
      pinned: PropTypes.bool,
      reactions: PropTypes.array
    })
  ),
  onSend: PropTypes.func,
  onReact: PropTypes.func,
  isMuted: PropTypes.bool,
  isBusy: PropTypes.bool,
  participants: PropTypes.arrayOf(PropTypes.string)
};

LiveClassroomChat.defaultProps = {
  sessionTitle: null,
  messages: [],
  onSend: undefined,
  onReact: undefined,
  isMuted: false,
  isBusy: false,
  participants: []
};
