import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  ChatBubbleOvalLeftEllipsisIcon,
  MegaphoneIcon,
  MicrophoneIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/24/solid';

import usePersistentCollection from '../../hooks/usePersistentCollection.js';

const CHANNEL_TYPES = [
  { id: 'discussion', label: 'Discussion', description: 'Two-way chat with typing indicators and slow mode.' },
  { id: 'broadcast', label: 'Broadcast', description: 'Announcement only updates with acknowledgements.' },
  { id: 'voice', label: 'Voice stage', description: 'Drop-in audio stage with host controls.' }
];

const defaultChannels = [
  {
    id: 'general',
    name: 'General strategy',
    type: 'discussion',
    description: 'Weekly updates, async stand-ups, and quick wins.',
    isPrivate: false,
    slowMode: 10,
    allowVoice: false,
    createdAt: '2024-05-01T12:00:00.000Z'
  }
];

const defaultMessages = [
  {
    id: 'message-1',
    channelId: 'general',
    author: 'Community team',
    role: 'Moderator',
    content: 'Welcome to the new community chat workspace! Share your wins for this sprint.',
    attachments: [],
    createdAt: '2024-05-01T12:05:00.000Z',
    updatedAt: null
  }
];

function typeIcon(type) {
  switch (type) {
    case 'broadcast':
      return <MegaphoneIcon className="h-4 w-4" />;
    case 'voice':
      return <MicrophoneIcon className="h-4 w-4" />;
    default:
      return <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4" />;
  }
}

function formatTimestamp(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function ChannelForm({ channel, onSubmit, onCancel }) {
  const [formState, setFormState] = useState(() => ({
    name: channel?.name ?? '',
    type: channel?.type ?? 'discussion',
    description: channel?.description ?? '',
    isPrivate: channel?.isPrivate ?? false,
    slowMode: channel?.slowMode ?? 0,
    allowVoice: channel?.allowVoice ?? false
  }));

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    setFormState((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      ...formState,
      slowMode: Number.parseInt(formState.slowMode, 10) || 0
    };
    onSubmit?.(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Channel name
          <input
            type="text"
            name="name"
            required
            value={formState.name}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Channel type
          <select
            name="type"
            value={formState.type}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {CHANNEL_TYPES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="space-y-1 text-xs font-semibold text-slate-600">
        Description
        <textarea
          name="description"
          rows={3}
          value={formState.description}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            name="isPrivate"
            checked={formState.isPrivate}
            onChange={handleChange}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
          />
          Private channel
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            name="allowVoice"
            checked={formState.allowVoice}
            onChange={handleChange}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
          />
          Enable voice stage
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Slow mode (seconds)
          <input
            type="number"
            min="0"
            name="slowMode"
            value={formState.slowMode}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          <ShieldCheckIcon className="h-4 w-4" /> Save channel
        </button>
      </div>
    </form>
  );
}

ChannelForm.propTypes = {
  channel: PropTypes.object,
  onSubmit: PropTypes.func,
  onCancel: PropTypes.func
};

ChannelForm.defaultProps = {
  channel: null,
  onSubmit: undefined,
  onCancel: undefined
};

function AttachmentEditor({ attachments, onChange }) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  const handleAdd = () => {
    if (!label || !url) return;
    const id = crypto.randomUUID?.() ?? `attachment-${Date.now()}`;
    onChange?.([...attachments, { id, label, url }]);
    setLabel('');
    setUrl('');
  };

  const handleRemove = (id) => {
    onChange?.(attachments.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="url"
          placeholder="https://..."
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200"
        >
          <PaperClipIcon className="h-4 w-4" /> Add attachment
        </button>
        <span className="text-[11px] font-medium text-slate-500">{attachments.length} attached</span>
      </div>
      <ul className="space-y-2 text-xs text-slate-600">
        {attachments.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
            <a href={item.url} className="font-semibold text-primary" target="_blank" rel="noopener noreferrer">
              {item.label}
            </a>
            <button
              type="button"
              onClick={() => handleRemove(item.id)}
              className="text-[11px] font-semibold text-slate-500 transition hover:text-primary"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

AttachmentEditor.propTypes = {
  attachments: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired
};

function MessageComposer({ onSubmit }) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!content.trim()) return;
    onSubmit?.({ content: content.trim(), attachments });
    setContent('');
    setAttachments([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Post an update</p>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rich text & media ready</span>
      </div>
      <textarea
        required
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
        placeholder="Share what the team needs to know..."
        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <AttachmentEditor attachments={attachments} onChange={setAttachments} />
      <div className="flex items-center justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          <PaperAirplaneIcon className="h-4 w-4" /> Send message
        </button>
      </div>
    </form>
  );
}

MessageComposer.propTypes = {
  onSubmit: PropTypes.func
};

MessageComposer.defaultProps = {
  onSubmit: undefined
};

function MessageItem({ message, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const handleUpdate = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    onUpdate?.(message.id, {
      ...message,
      content: draft.trim(),
      updatedAt: new Date().toISOString()
    });
    setIsEditing(false);
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">{message.author}</span>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">{message.role}</span>
        </div>
        <time dateTime={message.createdAt}>{formatTimestamp(message.createdAt)}</time>
      </div>

      {isEditing ? (
        <form onSubmit={handleUpdate} className="mt-3 space-y-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex items-center justify-end gap-3 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => {
                setDraft(message.content);
                setIsEditing(false);
              }}
              className="rounded-full border border-slate-200 px-3 py-1 text-slate-500 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-white shadow-sm transition hover:bg-primary-dark"
            >
              <ShieldCheckIcon className="h-4 w-4" /> Update
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-3 text-sm text-slate-700">{message.content}</p>
      )}

      {message.attachments?.length ? (
        <ul className="mt-3 space-y-2 text-xs">
          {message.attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
              <a href={attachment.url} className="font-semibold text-primary" target="_blank" rel="noopener noreferrer">
                {attachment.label}
              </a>
              <PaperClipIcon className="h-4 w-4 text-slate-400" />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
        <button
          type="button"
          onClick={() => setIsEditing((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 transition hover:bg-slate-200"
        >
          <PencilSquareIcon className="h-4 w-4" /> Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete?.(message.id)}
          className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-rose-600 transition hover:bg-rose-100"
        >
          <TrashIcon className="h-4 w-4" /> Delete
        </button>
        {message.updatedAt ? <span>Edited · {formatTimestamp(message.updatedAt)}</span> : null}
      </div>
    </article>
  );
}

MessageItem.propTypes = {
  message: PropTypes.object.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default function CommunityChatModule({
  communityId,
  communityName,
  viewerRole,
  initialChannels,
  initialMessages
}) {
  const storageNamespace = communityId ? `community:${communityId}` : 'community:preview';

  const seedChannels = useMemo(() => {
    if (Array.isArray(initialChannels) && initialChannels.length) {
      return initialChannels.map((channel) => ({
        ...channel,
        id: channel.id ?? channel.slug ?? channel.name?.toLowerCase().replace(/\s+/g, '-') ?? `channel-${Date.now()}`
      }));
    }
    return defaultChannels;
  }, [initialChannels]);

  const seedMessages = useMemo(() => {
    if (Array.isArray(initialMessages) && initialMessages.length) {
      return initialMessages.map((message) => ({
        ...message,
        id: message.id ?? `message-${Date.now()}`,
        attachments: Array.isArray(message.attachments) ? message.attachments : []
      }));
    }
    return defaultMessages;
  }, [initialMessages]);

  const {
    items: channels,
    addItem: addChannel,
    updateItem: updateChannel,
    removeItem: removeChannel
  } = usePersistentCollection(`${storageNamespace}:chat:channels`, seedChannels);

  const {
    items: messages,
    addItem: addMessage,
    updateItem: updateMessage,
    removeItem: removeMessage
  } = usePersistentCollection(`${storageNamespace}:chat:messages`, seedMessages);

  const [activeChannelId, setActiveChannelId] = useState(() => channels[0]?.id ?? null);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [channelBeingEdited, setChannelBeingEdited] = useState(null);

  useEffect(() => {
    if (!channels.length) {
      setActiveChannelId(null);
      return;
    }
    if (!activeChannelId) {
      setActiveChannelId(channels[0].id);
      return;
    }
    const exists = channels.some((channel) => channel.id === activeChannelId);
    if (!exists) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) ?? null,
    [channels, activeChannelId]
  );

  const channelMessages = useMemo(
    () => messages.filter((message) => message.channelId === activeChannelId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [messages, activeChannelId]
  );

  const handleCreateChannel = (payload) => {
    const newChannel = addChannel({
      ...payload,
      messageCount: 0,
      createdAt: new Date().toISOString()
    });
    setIsCreatingChannel(false);
    setActiveChannelId(newChannel.id);
  };

  const handleUpdateChannel = (payload) => {
    if (!channelBeingEdited) return;
    updateChannel(channelBeingEdited.id, {
      ...channelBeingEdited,
      ...payload
    });
    setChannelBeingEdited(null);
  };

  const handleRemoveChannel = (channelId) => {
    removeChannel(channelId);
    messages
      .filter((message) => message.channelId === channelId)
      .forEach((message) => removeMessage(message.id));
  };

  const handlePostMessage = ({ content, attachments }) => {
    if (!activeChannel) return;
    addMessage({
      channelId: activeChannel.id,
      author: 'You',
      role: viewerRole ?? 'Member',
      content,
      attachments,
      createdAt: new Date().toISOString(),
      updatedAt: null
    });
  };

  const totalMessages = messages.length;
  const privateChannels = channels.filter((channel) => channel.isPrivate).length;

  return (
    <section className="space-y-6 rounded-4xl border border-slate-200 bg-white/70 p-6 shadow-xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Community chat</p>
          <h2 className="text-lg font-semibold text-slate-900">{communityName} · Channel operations</h2>
          <p className="mt-1 text-sm text-slate-600">
            Configure rooms, manage live tooling, and keep updates searchable across the community.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{channels.length} channels</span>
          <span className="rounded-full bg-slate-900/5 px-3 py-1">{totalMessages} messages</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">{privateChannels} private</span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setChannelBeingEdited(null);
              setIsCreatingChannel((value) => !value);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            <PlusIcon className="h-5 w-5" /> New channel
          </button>

          <ul className="space-y-2">
            {channels.map((channel) => {
              const isActive = channel.id === activeChannelId;
              return (
                <li key={channel.id}>
                  <button
                    type="button"
                    onClick={() => setActiveChannelId(channel.id)}
                    className={`flex w-full items-start gap-3 rounded-3xl border px-3 py-3 text-left transition ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 bg-white/80 text-slate-700 hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    <span className="mt-1 inline-flex items-center justify-center rounded-full bg-white p-1 shadow">
                      {typeIcon(channel.type)}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{channel.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs">{channel.description || 'No description yet.'}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                        {channel.isPrivate ? (
                          <span className="rounded-full bg-slate-900/10 px-2 py-1">Private</span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-600">Open</span>
                        )}
                        {channel.allowVoice ? (
                          <span className="rounded-full bg-violet-100 px-2 py-1 text-violet-600">Voice stage</span>
                        ) : null}
                        {channel.slowMode ? (
                          <span className="rounded-full bg-slate-100 px-2 py-1">Slow {channel.slowMode}s</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                  <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingChannel(false);
                        setChannelBeingEdited(channel);
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-1 transition hover:bg-slate-200"
                    >
                      <PencilSquareIcon className="h-4 w-4" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveChannel(channel.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-rose-600 transition hover:bg-rose-100"
                    >
                      <TrashIcon className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
            <p className="text-sm font-semibold text-slate-800">Channel templates</p>
            <ul className="mt-2 space-y-2">
              {CHANNEL_TYPES.map((type) => (
                <li key={type.id} className="rounded-2xl bg-white/70 px-3 py-2">
                  <p className="font-semibold text-slate-700">{type.label}</p>
                  <p className="mt-1 text-[11px]">{type.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="space-y-5">
          {isCreatingChannel ? (
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-lg">
              <p className="text-sm font-semibold text-slate-900">Create a channel</p>
              <p className="mt-1 text-xs text-slate-500">Set visibility, slow mode, and live tooling in one step.</p>
              <div className="mt-4">
                <ChannelForm
                  channel={null}
                  onSubmit={handleCreateChannel}
                  onCancel={() => setIsCreatingChannel(false)}
                />
              </div>
            </div>
          ) : null}

          {channelBeingEdited ? (
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-lg">
              <p className="text-sm font-semibold text-slate-900">Update channel · {channelBeingEdited.name}</p>
              <p className="mt-1 text-xs text-slate-500">Keep members informed when you adjust controls.</p>
              <div className="mt-4">
                <ChannelForm
                  channel={channelBeingEdited}
                  onSubmit={handleUpdateChannel}
                  onCancel={() => setChannelBeingEdited(null)}
                />
              </div>
            </div>
          ) : null}

          {activeChannel ? (
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-primary/10 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3 text-primary">
                      {typeIcon(activeChannel.type)}
                      <p className="text-sm font-semibold text-slate-900">{activeChannel.name}</p>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{activeChannel.description || 'Add guidance for this room.'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
                    <UsersIcon className="h-4 w-4" /> {activeChannel.isPrivate ? 'Private audience' : 'Open to all members'}
                    {activeChannel.allowVoice ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-violet-600">
                        <MicrophoneIcon className="h-4 w-4" /> Voice stage enabled
                      </span>
                    ) : null}
                    {activeChannel.slowMode ? <span>Slow mode {activeChannel.slowMode}s</span> : null}
                  </div>
                </div>
              </div>

              <MessageComposer onSubmit={handlePostMessage} />

              <div className="space-y-3">
                {channelMessages.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white/40 p-6 text-center text-sm text-slate-500">
                    No messages yet. Share an update to kick things off.
                  </div>
                ) : (
                  channelMessages.map((message) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      onUpdate={updateMessage}
                      onDelete={removeMessage}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/40 p-6 text-center text-sm text-slate-500">
              Create or select a channel to begin moderating messages.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

CommunityChatModule.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  communityName: PropTypes.string,
  viewerRole: PropTypes.string,
  initialChannels: PropTypes.array,
  initialMessages: PropTypes.array
};

CommunityChatModule.defaultProps = {
  communityId: 'preview',
  communityName: 'Community',
  viewerRole: 'Member',
  initialChannels: undefined,
  initialMessages: undefined
};
