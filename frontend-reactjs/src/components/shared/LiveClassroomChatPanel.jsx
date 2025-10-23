import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import MediaPreviewSlot from './MediaPreviewSlot.jsx';
import { trackEvent } from '../../lib/analytics.js';

function normaliseMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [
      {
        id: 'live-chat-default-1',
        author: 'Host team',
        role: 'Facilitator',
        body: 'Drop questions here and the facilitator desk will help route them to the stage.',
        timestamp: new Date().toISOString(),
        type: 'system'
      },
      {
        id: 'live-chat-default-2',
        author: 'Learner cohort',
        role: 'Learner',
        body: 'Excited to start the automation lab! Does the workbook auto-save?',
        timestamp: new Date().toISOString(),
        type: 'message'
      }
    ];
  }
  return messages.map((message, index) => ({
    id: message.id ?? `message-${index}`,
    author: message.author ?? 'Participant',
    role: message.role ?? 'Learner',
    body: message.body ?? message.text ?? '',
    timestamp: message.timestamp ?? message.createdAt ?? new Date().toISOString(),
    type: message.type ?? 'message'
  }));
}

export default function LiveClassroomChatPanel({ classroom, messages, onSend, className }) {
  const [draft, setDraft] = useState('');
  const safeMessages = useMemo(() => normaliseMessages(messages), [messages]);

  const allowSend = draft.trim().length > 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!allowSend) return;
    const payload = { body: draft.trim(), classroomId: classroom?.id };
    onSend?.(payload);
    trackEvent('live_chat:message_send', { classroomId: classroom?.id, surface: 'live-classrooms' });
    setDraft('');
  };

  const previewMedia = classroom?.mediaPreview ?? classroom?.hero ?? null;

  return (
    <section
      className={clsx(
        'flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm',
        className
      )}
    >
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live classroom chat</p>
        <h2 className="text-lg font-semibold text-slate-900">
          {classroom?.title ?? 'Live classroom engagement'}
        </h2>
        <p className="text-sm text-slate-600">
          Keep the cohort in sync with backstage prompts, pinned resources, and spotlight replies from facilitators.
        </p>
      </header>

      {previewMedia ? (
        <MediaPreviewSlot
          thumbnailUrl={previewMedia.thumbnailUrl ?? previewMedia.imageUrl}
          videoUrl={previewMedia.videoUrl}
          label={previewMedia.label ?? 'Classroom stage preview'}
          aspectRatio={previewMedia.aspectRatio ?? '16:9'}
        />
      ) : null}

      <div className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-700">
        <ol className="space-y-3">
          {safeMessages.map((message) => (
            <li key={message.id} className="rounded-2xl bg-white/95 p-3 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="text-slate-600">{message.author}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{message.role}</span>
                </span>
                <time dateTime={message.timestamp}>{new Date(message.timestamp).toLocaleTimeString()}</time>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{message.body}</p>
            </li>
          ))}
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="live-chat-draft">
          Send a message
        </label>
        <textarea
          id="live-chat-draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm leading-6 text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Welcome everyone! Reply with your favourite automation win…"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <p>Live reactions sync with the stage and attendance metrics automatically.</p>
          <button
            type="submit"
            disabled={!allowSend}
            className={clsx(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
              allowSend
                ? 'border border-primary bg-primary text-white hover:bg-primary/90'
                : 'border border-slate-200 bg-slate-100 text-slate-400'
            )}
          >
            Send message
          </button>
        </div>
      </form>
    </section>
  );
}

LiveClassroomChatPanel.propTypes = {
  classroom: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    mediaPreview: PropTypes.shape({
      thumbnailUrl: PropTypes.string,
      videoUrl: PropTypes.string,
      aspectRatio: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string
    }),
    hero: PropTypes.shape({
      imageUrl: PropTypes.string,
      thumbnailUrl: PropTypes.string,
      videoUrl: PropTypes.string,
      aspectRatio: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string
    })
  }),
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      author: PropTypes.string,
      role: PropTypes.string,
      body: PropTypes.string,
      timestamp: PropTypes.string,
      type: PropTypes.string
    })
  ),
  onSend: PropTypes.func,
  className: PropTypes.string
};

LiveClassroomChatPanel.defaultProps = {
  classroom: null,
  messages: [],
  onSend: null,
  className: ''
};
