import PropTypes from 'prop-types';
import { PaperAirplaneIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/outline';

const MESSAGE_TYPES = [
  { value: 'text', label: 'Text update' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'live', label: 'Live session' },
  { value: 'resource', label: 'Resource drop' }
];

export default function MessageComposer({ value, onChange, onSend, onReset, sending, disabled }) {
  const handleChange = (field, next) => {
    onChange({ ...value, [field]: next });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSend();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="dashboard-kicker text-slate-500">Compose update</p>
          <h3 className="text-lg font-semibold text-slate-900">Channel broadcast</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-slate-500">
            Message type
            <select
              value={value.messageType}
              onChange={(event) => handleChange('messageType', event.target.value)}
              className="ml-2 rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {MESSAGE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => onReset?.()}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-primary/40 hover:text-primary"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Message body
            <textarea
              required
              rows={value.messageType === 'announcement' ? 5 : 4}
              value={value.body}
              onChange={(event) => handleChange('body', event.target.value)}
              placeholder="Share updates, coordinate production, or route feedback."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Attachment URL
            <input
              type="url"
              value={value.attachmentUrl}
              onChange={(event) => handleChange('attachmentUrl', event.target.value)}
              placeholder="https://assets.edulure.com/lesson-deck.pdf"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Attachment label
            <input
              type="text"
              value={value.attachmentLabel}
              onChange={(event) => handleChange('attachmentLabel', event.target.value)}
              placeholder="Lesson deck"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>

        {value.messageType === 'live' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Live session topic
              <input
                type="text"
                value={value.liveTopic}
                onChange={(event) => handleChange('liveTopic', event.target.value)}
                placeholder="Studio drop-in coaching"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Meeting URL
              <input
                type="url"
                value={value.meetingUrl ?? ''}
                onChange={(event) => handleChange('meetingUrl', event.target.value)}
                placeholder="https://meet.edulure.live/studio"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
        ) : null}

        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Moderator note (optional)
          <input
            type="text"
            value={value.metadataNote}
            onChange={(event) => handleChange('metadataNote', event.target.value)}
            placeholder="Route this to the studio pod for QA."
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
            <PhotoIcon className="h-4 w-4" aria-hidden="true" />
            Add media
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
            <VideoCameraIcon className="h-4 w-4" aria-hidden="true" />
            Stage invite
          </span>
        </div>
        <button
          type="submit"
          disabled={disabled || sending}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:bg-primary/50"
        >
          <PaperAirplaneIcon className={`h-5 w-5 ${sending ? 'animate-pulse' : ''}`} aria-hidden="true" />
          {sending ? 'Sending…' : 'Send update'}
        </button>
      </div>
    </form>
  );
}

MessageComposer.propTypes = {
  value: PropTypes.shape({
    messageType: PropTypes.string,
    body: PropTypes.string,
    attachmentUrl: PropTypes.string,
    attachmentLabel: PropTypes.string,
    liveTopic: PropTypes.string,
    meetingUrl: PropTypes.string,
    metadataNote: PropTypes.string
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onSend: PropTypes.func.isRequired,
  onReset: PropTypes.func,
  sending: PropTypes.bool,
  disabled: PropTypes.bool
};

MessageComposer.defaultProps = {
  onReset: null,
  sending: false,
  disabled: false
};
