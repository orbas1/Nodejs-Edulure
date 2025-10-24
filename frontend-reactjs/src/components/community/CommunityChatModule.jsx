import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import {
  listCommunityChannels,
  listCommunityMessages,
  postCommunityMessage,
  markCommunityChannelRead,
  moderateCommunityMessage
} from '../../api/communityChatApi.js';
import {
  createCommunityChatChannel,
  updateCommunityChatChannel,
  deleteCommunityChatChannel
} from '../../api/communityApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useCommunityRealtime from '../../hooks/useCommunityRealtime.js';

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
    authorId: 'community-team',
    author: {
      id: 'community-team',
      name: 'Community team',
      role: 'Moderator'
    },
    body: 'Welcome to the new community chat workspace! Share your wins for this sprint.',
    attachments: [],
    createdAt: '2024-05-01T12:05:00.000Z',
    updatedAt: null,
    reactions: [],
    viewerReactions: []
  }
];

function resolveChannelType(type) {
  const value = typeof type === 'string' ? type.toLowerCase() : 'discussion';
  if (value === 'announcements') return 'broadcast';
  if (value === 'events' || value === 'classroom') return 'voice';
  if (value === 'broadcast' || value === 'voice') return value;
  return 'discussion';
}

function resolveAuthorDetails(author, fallbackRole) {
  if (!author) {
    return {
      id: null,
      name: 'Community member',
      role: fallbackRole ?? null
    };
  }
  if (typeof author === 'string') {
    return {
      id: null,
      name: author,
      role: fallbackRole ?? null
    };
  }

  const { firstName, lastName, name, email, role, id } = author;
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || name || email || 'Community member';
  return {
    ...author,
    id: id ?? author.userId ?? null,
    name: displayName,
    role: role ?? fallbackRole ?? null
  };
}

function normaliseMessageEntry(message, channelIdOverride) {
  if (!message) {
    return null;
  }
  const channelId = channelIdOverride ?? message.channelId ?? message.channel?.id ?? message.channel?.channelId ?? null;
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const author = resolveAuthorDetails(message.author ?? message.authorDetails, message.role);
  return {
    id: message.id ?? `message-${Date.now()}`,
    channelId,
    authorId: message.authorId ?? author.id ?? null,
    author,
    body: message.body ?? message.content ?? '',
    attachments,
    metadata: message.metadata ?? {},
    messageType: message.messageType ?? 'text',
    status: message.status ?? 'visible',
    createdAt: message.createdAt ?? new Date().toISOString(),
    updatedAt: message.updatedAt ?? null,
    reactions: Array.isArray(message.reactions) ? message.reactions : [],
    viewerReactions: Array.isArray(message.viewerReactions) ? message.viewerReactions : []
  };
}

function normaliseChannelEntry(entry) {
  if (!entry) {
    return null;
  }
  const channel = entry.channel ?? entry;
  const metadata = channel.metadata ?? entry.metadata ?? {};
  const id = channel.id ?? channel.slug ?? channel.name ?? `channel-${Date.now()}`;
  const type = resolveChannelType(channel.channelType ?? metadata.channelType ?? entry.type);
  const latestMessage = entry.latestMessage ? normaliseMessageEntry(entry.latestMessage, id) : null;

  return {
    id,
    name: channel.name ?? 'Channel',
    description: channel.description ?? '',
    type,
    metadata,
    isPrivate: Boolean(metadata.isPrivate ?? metadata.visibility === 'private'),
    allowVoice:
      Boolean(metadata.allowVoice ?? metadata.permissions?.voice) || ['voice'].includes(type),
    slowMode: Number(metadata.slowMode ?? metadata.slow_mode ?? 0) || 0,
    memberCount: entry.memberCount ?? metadata.memberCount ?? 0,
    unreadCount: entry.unreadCount ?? metadata.unreadCount ?? 0,
    messageCount: entry.messageCount ?? metadata.messageCount ?? 0,
    latestMessage,
    createdAt: channel.createdAt ?? new Date().toISOString()
  };
}

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

function toErrorMessage(error, fallback = 'Something went wrong') {
  if (!error) {
    return null;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === 'object' && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

function sortMessagesByCreatedAt(messages) {
  return [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function upsertMessage(messages, nextMessage) {
  if (!nextMessage) {
    return messages;
  }
  const map = new Map(messages.map((item) => [item.id, item]));
  map.set(nextMessage.id, nextMessage);
  return sortMessagesByCreatedAt(Array.from(map.values()));
}

function removeMessageById(messages, messageId) {
  if (!messageId) {
    return messages;
  }
  return messages.filter((item) => item.id !== messageId);
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

function MessageComposer({ onSubmit, onTyping, disabled, isSubmitting, error }) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const typingTimeoutRef = useRef(null);

  const handleChange = (event) => {
    const value = event.target.value;
    setContent(value);
    if (!onTyping) {
      return;
    }
    onTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
      typingTimeoutRef.current = null;
    }, 1500);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || disabled || isSubmitting) return;
    onSubmit?.({ content: trimmed, attachments });
    setContent('');
    setAttachments([]);
    if (onTyping) {
      onTyping(false);
    }
  };

  useEffect(() => () => typingTimeoutRef.current && clearTimeout(typingTimeoutRef.current), []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Post an update</p>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rich text & media ready</span>
      </div>
      <textarea
        required
        value={content}
        onChange={handleChange}
        rows={3}
        placeholder={disabled ? 'Join the community to start posting…' : 'Share what the team needs to know...'}
        disabled={disabled || isSubmitting}
        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
      <AttachmentEditor attachments={attachments} onChange={setAttachments} />
      {error ? <p className="text-xs font-semibold text-rose-500">{error}</p> : null}
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={disabled || isSubmitting || !content.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          <PaperAirplaneIcon className="h-4 w-4" /> {isSubmitting ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </form>
  );
}

MessageComposer.propTypes = {
  onSubmit: PropTypes.func,
  onTyping: PropTypes.func,
  disabled: PropTypes.bool,
  isSubmitting: PropTypes.bool,
  error: PropTypes.node
};

MessageComposer.defaultProps = {
  onSubmit: undefined,
  onTyping: undefined,
  disabled: false,
  isSubmitting: false,
  error: null
};

function MessageItem({ message, viewerId, canModerate, onModerate }) {
  const authorName = message.author?.name ?? 'Community member';
  const authorRole = message.author?.role ?? null;
  const authorId = message.authorId ?? message.author?.id ?? null;
  const isViewerAuthor = viewerId != null && String(authorId ?? '') === String(viewerId);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">
            {authorName}
            {isViewerAuthor ? ' · You' : ''}
          </span>
          {authorRole ? (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">{authorRole}</span>
          ) : null}
        </div>
        <time dateTime={message.createdAt}>{formatTimestamp(message.createdAt)}</time>
      </div>

      <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{message.body}</p>

      {message.attachments?.length ? (
        <ul className="mt-3 space-y-2 text-xs">
          {message.attachments.map((attachment) => (
            <li key={attachment.id ?? attachment.url} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
              <a href={attachment.url} className="font-semibold text-primary" target="_blank" rel="noopener noreferrer">
                {attachment.label ?? attachment.url}
              </a>
              <PaperClipIcon className="h-4 w-4 text-slate-400" />
            </li>
          ))}
        </ul>
      ) : null}

      {message.reactions?.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
          {message.reactions.map((reaction) => (
            <span
              key={`${reaction.emoji}-${reaction.count}`}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1"
            >
              <span>{reaction.emoji}</span>
              <span>{reaction.count ?? 1}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
        <span>Status: {message.status ?? 'visible'}</span>
        {message.updatedAt ? <span>Edited · {formatTimestamp(message.updatedAt)}</span> : null}
        {canModerate ? (
          <button
            type="button"
            onClick={() => onModerate?.(message, { action: 'delete' })}
            className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-rose-600 transition hover:bg-rose-100"
          >
            <TrashIcon className="h-4 w-4" /> Remove
          </button>
        ) : null}
      </div>
    </article>
  );
}

MessageItem.propTypes = {
  message: PropTypes.object.isRequired,
  viewerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  canModerate: PropTypes.bool,
  onModerate: PropTypes.func
};

MessageItem.defaultProps = {
  viewerId: null,
  canModerate: false,
  onModerate: undefined
};

export default function CommunityChatModule({
  communityId,
  communityName,
  viewerRole,
  initialChannels,
  initialMessages
}) {
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const viewerId = session?.user?.id ?? null;
  const viewerDisplayName =
    session?.user?.name ??
    session?.user?.fullName ??
    [session?.user?.firstName, session?.user?.lastName].filter(Boolean).join(' ').trim() ||
    session?.user?.email ||
    'You';

  const seededChannels = useMemo(() => {
    const source = Array.isArray(initialChannels) && initialChannels.length ? initialChannels : defaultChannels;
    return source.map(normaliseChannelEntry).filter(Boolean);
  }, [initialChannels]);

  const seededMessages = useMemo(() => {
    const source = Array.isArray(initialMessages) && initialMessages.length ? initialMessages : defaultMessages;
    return source.reduce((accumulator, entry) => {
      const message = normaliseMessageEntry(entry, entry.channelId);
      if (!message?.channelId) {
        return accumulator;
      }
      const channelId = message.channelId;
      const existing = accumulator[channelId] ?? [];
      accumulator[channelId] = upsertMessage(existing, message);
      return accumulator;
    }, {});
  }, [initialMessages]);

  const [channels, setChannels] = useState(seededChannels);
  const [channelsStatus, setChannelsStatus] = useState(seededChannels.length ? 'ready' : 'idle');
  const [channelsError, setChannelsError] = useState(null);
  const [messagesByChannel, setMessagesByChannel] = useState(seededMessages);
  const [messageStates, setMessageStates] = useState(() => {
    const base = {};
    Object.keys(seededMessages).forEach((channelId) => {
      base[channelId] = { status: 'ready', error: null };
    });
    return base;
  });
  const [channelActionError, setChannelActionError] = useState(null);
  const [composerError, setComposerError] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [typingState, setTypingState] = useState({});
  const [realtimeError, setRealtimeError] = useState(null);

  const [activeChannelId, setActiveChannelId] = useState(() => seededChannels[0]?.id ?? null);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [channelBeingEdited, setChannelBeingEdited] = useState(null);

  const normalisedCommunityId = communityId && communityId !== 'preview' ? communityId : null;

  const roleKey = (viewerRole ?? '').toLowerCase();
  const canManageChannels = ['owner', 'admin', 'moderator', 'staff', 'manager'].includes(roleKey);
  const canModerateMessages = canManageChannels || roleKey === 'support';

  const updateMessagesForChannel = useCallback((channelId, updater) => {
    setMessagesByChannel((previous) => {
      const current = previous[channelId] ?? [];
      const next = typeof updater === 'function' ? updater(current) : updater ?? current;
      if (next === current) {
        return previous;
      }
      return {
        ...previous,
        [channelId]: next
      };
    });
  }, []);

  const setMessageState = useCallback((channelId, partialState) => {
    setMessageStates((previous) => {
      const current = previous[channelId] ?? { status: 'idle', error: null };
      const next = { ...current, ...partialState };
      if (current.status === next.status && current.error === next.error) {
        return previous;
      }
      return {
        ...previous,
        [channelId]: next
      };
    });
  }, []);

  useEffect(() => {
    if (!channels.length) {
      setActiveChannelId(null);
      return;
    }
    if (!activeChannelId) {
      setActiveChannelId(channels[0].id);
      return;
    }
    if (!channels.some((channel) => channel.id === activeChannelId)) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  useEffect(() => {
    if (!normalisedCommunityId || !token || !isAuthenticated) {
      setChannels(seededChannels);
      setChannelsStatus(seededChannels.length ? 'ready' : 'idle');
      setChannelsError(null);
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    setChannelsStatus('loading');
    setChannelsError(null);

    listCommunityChannels({
      communityId: normalisedCommunityId,
      token,
      signal: controller.signal
    })
      .then((response) => {
        if (!isActive) return;
        const items = Array.isArray(response?.data) ? response.data : [];
        const normalised = items.map(normaliseChannelEntry).filter(Boolean);
        setChannels(normalised);
        setChannelsStatus('ready');
        setChannelsError(null);
        if (!normalised.length) {
          setActiveChannelId(null);
        }
      })
      .catch((error) => {
        if (!isActive || controller.signal.aborted) return;
        setChannelsStatus('error');
        setChannelsError(error);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [normalisedCommunityId, token, isAuthenticated, seededChannels]);

  useEffect(() => {
    if (!activeChannelId) {
      return;
    }
    if (!normalisedCommunityId || !token || !isAuthenticated) {
      setMessageState(activeChannelId, { status: 'ready', error: null });
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    setMessageState(activeChannelId, { status: 'loading', error: null });

    listCommunityMessages({
      communityId: normalisedCommunityId,
      channelId: activeChannelId,
      token,
      signal: controller.signal
    })
      .then((response) => {
        if (!isActive) return;
        const items = Array.isArray(response?.data) ? response.data : [];
        const normalised = items
          .map((item) => normaliseMessageEntry(item, activeChannelId))
          .filter(Boolean);
        updateMessagesForChannel(activeChannelId, sortMessagesByCreatedAt(normalised));
        setMessageState(activeChannelId, { status: 'ready', error: null });
        setChannels((previous) => {
          let mutated = false;
          const next = previous.map((channel) => {
            if (channel.id !== activeChannelId) {
              return channel;
            }
            const latest = normalised[normalised.length - 1] ?? channel.latestMessage ?? null;
            const messageCount = normalised.length;
            if (
              channel.latestMessage === latest &&
              channel.messageCount === messageCount &&
              channel.unreadCount === 0
            ) {
              return channel;
            }
            mutated = true;
            return {
              ...channel,
              latestMessage: latest,
              messageCount,
              unreadCount: 0
            };
          });
          return mutated ? next : previous;
        });
        markCommunityChannelRead({
          communityId: normalisedCommunityId,
          channelId: activeChannelId,
          token,
          payload: { timestamp: new Date().toISOString() }
        }).catch(() => {});
      })
      .catch((error) => {
        if (!isActive || controller.signal.aborted) return;
        setMessageState(activeChannelId, { status: 'error', error });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    activeChannelId,
    normalisedCommunityId,
    token,
    isAuthenticated,
    updateMessagesForChannel,
    setMessageState
  ]);

  const handleRealtimeMessage = useCallback(
    (payload = {}) => {
      const message = normaliseMessageEntry(payload.message ?? payload.data, payload.channelId);
      if (!message?.channelId) {
        return;
      }
      setRealtimeError(null);
      let messageWasNew = false;
      updateMessagesForChannel(message.channelId, (current) => {
        const hasExisting = current.some((item) => item.id === message.id);
        const next = upsertMessage(current, message);
        messageWasNew = !hasExisting;
        return next;
      });
      setChannels((previous) => {
        let mutated = false;
        const next = previous.map((channel) => {
          if (channel.id !== message.channelId) {
            return channel;
          }
          const actorId = Number(payload?.metadata?.actorId ?? payload?.actorId ?? 0);
          const isViewerActor = viewerId != null && Number(viewerId) === actorId;
          const isActive = channel.id === activeChannelId;
          const nextUnread = isActive || isViewerActor ? 0 : (channel.unreadCount ?? 0) + (messageWasNew ? 1 : 0);
          const nextMessageCount = messageWasNew ? (channel.messageCount ?? 0) + 1 : channel.messageCount ?? 0;
          const updated = {
            ...channel,
            latestMessage: message,
            unreadCount: nextUnread,
            messageCount: nextMessageCount
          };
          if (
            updated.latestMessage !== channel.latestMessage ||
            updated.unreadCount !== channel.unreadCount ||
            updated.messageCount !== channel.messageCount
          ) {
            mutated = true;
          }
          return updated;
        });
        return mutated ? next : previous;
      });
    },
    [activeChannelId, updateMessagesForChannel, viewerId]
  );

  const handleRealtimeTyping = useCallback(
    (event = {}) => {
      const channelKey = event.channelId ? String(event.channelId) : null;
      if (!channelKey) {
        return;
      }
      setRealtimeError(null);
      setTypingState((previous) => {
        const userId = event.user?.id ?? event.userId ?? event.metadata?.userId;
        const key = userId != null ? String(userId) : event.user?.email ?? event.user?.name ?? 'anonymous';
        if (!key) {
          return previous;
        }
        const currentChannel = previous[channelKey] ?? {};
        const nextChannel = { ...currentChannel };
        let changed = false;
        if (event.isTyping === false) {
          if (!(key in nextChannel)) {
            return previous;
          }
          delete nextChannel[key];
          changed = true;
        } else {
          nextChannel[key] = {
            user: event.user ?? { id: key, name: event.user?.name ?? 'Member' },
            timestamp: Date.now(),
            isSelf: viewerId != null && Number(event.user?.id ?? event.userId ?? -1) === Number(viewerId)
          };
          changed = true;
        }
        if (!changed) {
          return previous;
        }
        const nextState = { ...previous };
        if (Object.keys(nextChannel).length) {
          nextState[channelKey] = nextChannel;
        } else {
          delete nextState[channelKey];
        }
        return nextState;
      });
    },
    [viewerId]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTypingState((previous) => {
        const now = Date.now();
        let mutated = false;
        const nextState = {};
        Object.entries(previous).forEach(([channelId, entries]) => {
          const nextEntries = {};
          Object.entries(entries).forEach(([userId, entry]) => {
            if (now - entry.timestamp < 4_000) {
              nextEntries[userId] = entry;
            } else {
              mutated = true;
            }
          });
          if (Object.keys(nextEntries).length) {
            nextState[channelId] = nextEntries;
          } else if (Object.keys(entries).length) {
            mutated = true;
          }
        });
        return mutated ? nextState : previous;
      });
    }, 3_000);
    return () => clearInterval(interval);
  }, []);

  const {
    presence: realtimePresence,
    status: realtimeStatus,
    lastError: realtimeLastError,
    sendTyping
  } = useCommunityRealtime({
    communityId: normalisedCommunityId,
    channelId: activeChannelId,
    enabled: Boolean(normalisedCommunityId && token && isAuthenticated),
    onMessage: handleRealtimeMessage,
    onTyping: handleRealtimeTyping,
    onPresence: () => setRealtimeError(null),
    onError: (error) => setRealtimeError(error)
  });

  useEffect(() => {
    if (realtimeLastError) {
      setRealtimeError(realtimeLastError);
    }
  }, [realtimeLastError]);

  const presenceList = realtimePresence ?? [];

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) ?? null,
    [channels, activeChannelId]
  );

  const channelMessages = useMemo(() => {
    if (!activeChannelId) {
      return [];
    }
    const items = messagesByChannel[activeChannelId] ?? [];
    return sortMessagesByCreatedAt(items);
  }, [messagesByChannel, activeChannelId]);

  const typingSummary = useMemo(() => {
    if (!activeChannelId) {
      return null;
    }
    const entries = Object.values(typingState[activeChannelId] ?? {}).filter((entry) => !entry.isSelf);
    if (!entries.length) {
      return null;
    }
    if (entries.length === 1) {
      const [first] = entries;
      return `${first.user?.name ?? 'Someone'} is typing…`;
    }
    if (entries.length === 2) {
      return `${entries[0].user?.name ?? 'Someone'} and ${entries[1].user?.name ?? 'another member'} are typing…`;
    }
    return `${entries.length} members are typing…`;
  }, [typingState, activeChannelId]);

  const totalMessages = useMemo(
    () => Object.values(messagesByChannel).reduce((total, list) => total + list.length, 0),
    [messagesByChannel]
  );

  const privateChannels = useMemo(
    () => channels.filter((channel) => channel.isPrivate).length,
    [channels]
  );

  const handleTyping = useCallback(
    (isTyping) => {
      if (!activeChannelId) {
        return;
      }
      if (sendTyping) {
        sendTyping(isTyping, { channelId: activeChannelId });
      }
      if (!viewerId) {
        return;
      }
      setTypingState((previous) => {
        const channelKey = String(activeChannelId);
        const userKey = `self-${viewerId}`;
        const currentChannel = previous[channelKey] ?? {};
        const nextChannel = { ...currentChannel };
        let changed = false;
        if (!isTyping) {
          if (!(userKey in nextChannel)) {
            return previous;
          }
          delete nextChannel[userKey];
          changed = true;
        } else {
          nextChannel[userKey] = {
            user: { id: viewerId, name: viewerDisplayName },
            timestamp: Date.now(),
            isSelf: true
          };
          changed = true;
        }
        if (!changed) {
          return previous;
        }
        const nextState = { ...previous };
        if (Object.keys(nextChannel).length) {
          nextState[channelKey] = nextChannel;
        } else {
          delete nextState[channelKey];
        }
        return nextState;
      });
    },
    [activeChannelId, sendTyping, viewerId, viewerDisplayName]
  );

  const handlePostMessage = useCallback(
    async ({ content, attachments }) => {
      if (!activeChannelId) {
        return;
      }
      setComposerError(null);
      setRealtimeError(null);

      if (!normalisedCommunityId || !token || !isAuthenticated) {
        const optimisticMessage = normaliseMessageEntry(
          {
            id: crypto.randomUUID?.() ?? `message-${Date.now()}`,
            channelId: activeChannelId,
            body: content,
            attachments,
            author: { id: viewerId ?? 'preview', name: viewerDisplayName },
            authorId: viewerId ?? 'preview',
            createdAt: new Date().toISOString(),
            updatedAt: null,
            messageType: 'text'
          },
          activeChannelId
        );
        updateMessagesForChannel(activeChannelId, (current) => upsertMessage(current, optimisticMessage));
        setChannels((previous) =>
          previous.map((channel) =>
            channel.id === activeChannelId
              ? {
                  ...channel,
                  latestMessage: optimisticMessage,
                  messageCount: (channel.messageCount ?? 0) + 1
                }
              : channel
          )
        );
        return;
      }

      setIsPosting(true);
      try {
        const response = await postCommunityMessage({
          communityId: normalisedCommunityId,
          channelId: activeChannelId,
          token,
          payload: {
            body: content,
            attachments,
            metadata: { source: 'community-workspace' }
          }
        });
        const message = normaliseMessageEntry(response?.data, activeChannelId);
        updateMessagesForChannel(activeChannelId, (current) => upsertMessage(current, message));
        setChannels((previous) =>
          previous.map((channel) =>
            channel.id === activeChannelId
              ? {
                  ...channel,
                  latestMessage: message,
                  messageCount: (channel.messageCount ?? 0) + (message ? 1 : 0),
                  unreadCount: 0
                }
              : channel
          )
        );
      } catch (error) {
        setComposerError(toErrorMessage(error, 'Unable to send message. Please try again.'));
      } finally {
        setIsPosting(false);
      handleTyping(false);
    }
  },
  [
    activeChannelId,
    normalisedCommunityId,
    token,
    isAuthenticated,
    updateMessagesForChannel,
    viewerId,
    viewerDisplayName,
    handleTyping
  ]
  );

  const handleModerateMessage = useCallback(
    async (message, options = {}) => {
      if (!message) {
        return;
      }
      const targetChannelId = message.channelId ?? activeChannelId;
      if (!targetChannelId) {
        return;
      }
      const action = options.action ?? 'delete';
      setMessageState(targetChannelId, { error: null });

      if (!normalisedCommunityId || !token || !isAuthenticated) {
        updateMessagesForChannel(targetChannelId, (current) => removeMessageById(current, message.id));
        setChannels((previous) =>
          previous.map((channel) =>
            channel.id === targetChannelId
              ? {
                  ...channel,
                  messageCount: Math.max(0, (channel.messageCount ?? 0) - 1)
                }
              : channel
          )
        );
        return;
      }

      try {
        await moderateCommunityMessage({
          communityId: normalisedCommunityId,
          channelId: targetChannelId,
          messageId: message.id,
          token,
          payload: {
            action,
            metadata: { source: 'community-workspace' }
          }
        });
        if (action === 'delete') {
          updateMessagesForChannel(targetChannelId, (current) => removeMessageById(current, message.id));
          setChannels((previous) =>
            previous.map((channel) =>
              channel.id === targetChannelId
                ? {
                    ...channel,
                    messageCount: Math.max(0, (channel.messageCount ?? 0) - 1)
                  }
                : channel
            )
          );
        } else if (action === 'hide') {
          updateMessagesForChannel(targetChannelId, (current) =>
            current.map((item) => (item.id === message.id ? { ...item, status: 'hidden' } : item))
          );
        }
        setMessageState(targetChannelId, { status: 'ready', error: null });
      } catch (error) {
        setMessageState(targetChannelId, { error });
      }
    },
    [
      activeChannelId,
      normalisedCommunityId,
      token,
      isAuthenticated,
      updateMessagesForChannel,
      setMessageState
    ]
  );

  const handleCreateChannel = useCallback(
    async (payload) => {
      const metadata = {
        isPrivate: payload.isPrivate,
        allowVoice: payload.allowVoice,
        slowMode: Number.parseInt(payload.slowMode, 10) || 0,
        channelType: payload.type
      };
      const requestPayload = {
        name: payload.name,
        description: payload.description,
        channelType:
          payload.type === 'broadcast'
            ? 'announcements'
            : payload.type === 'voice'
            ? 'events'
            : 'general',
        metadata
      };
      setChannelActionError(null);

      if (!normalisedCommunityId || !token || !isAuthenticated) {
        const fallbackChannel = normaliseChannelEntry({
          id: crypto.randomUUID?.() ?? `channel-${Date.now()}`,
          name: payload.name,
          description: payload.description,
          channelType: requestPayload.channelType,
          metadata
        });
        setChannels((previous) => [...previous, fallbackChannel]);
        setMessagesByChannel((previous) => ({ ...previous, [fallbackChannel.id]: [] }));
        setActiveChannelId(fallbackChannel.id);
        setIsCreatingChannel(false);
        return;
      }

      try {
        const response = await createCommunityChatChannel({
          communityId: normalisedCommunityId,
          token,
          payload: requestPayload
        });
        const channel = normaliseChannelEntry(response?.data);
        setChannels((previous) => {
          const exists = previous.some((item) => item.id === channel.id);
          return exists
            ? previous.map((item) => (item.id === channel.id ? channel : item))
            : [...previous, channel];
        });
        setMessagesByChannel((previous) => (previous[channel.id] ? previous : { ...previous, [channel.id]: [] }));
        setActiveChannelId(channel.id);
        setIsCreatingChannel(false);
      } catch (error) {
        setChannelActionError(error);
      }
    },
    [normalisedCommunityId, token, isAuthenticated]
  );

  const handleUpdateChannel = useCallback(
    async (payload) => {
      if (!channelBeingEdited) {
        return;
      }
      const metadata = {
        ...channelBeingEdited.metadata,
        isPrivate: payload.isPrivate,
        allowVoice: payload.allowVoice,
        slowMode: Number.parseInt(payload.slowMode, 10) || 0,
        channelType: payload.type
      };
      const requestPayload = {
        name: payload.name,
        description: payload.description,
        channelType:
          payload.type === 'broadcast'
            ? 'announcements'
            : payload.type === 'voice'
            ? 'events'
            : 'general',
        metadata
      };
      setChannelActionError(null);

      if (!normalisedCommunityId || !token || !isAuthenticated) {
        const updated = normaliseChannelEntry({
          ...channelBeingEdited,
          ...requestPayload,
          metadata
        });
        setChannels((previous) => previous.map((channel) => (channel.id === updated.id ? updated : channel)));
        setChannelBeingEdited(null);
        return;
      }

      try {
        const response = await updateCommunityChatChannel({
          communityId: normalisedCommunityId,
          channelId: channelBeingEdited.id,
          token,
          payload: requestPayload
        });
        const channel = normaliseChannelEntry(response?.data);
        setChannels((previous) => previous.map((item) => (item.id === channel.id ? channel : item)));
        setChannelBeingEdited(null);
      } catch (error) {
        setChannelActionError(error);
      }
    },
    [channelBeingEdited, normalisedCommunityId, token, isAuthenticated]
  );

  const handleRemoveChannel = useCallback(
    async (channelId) => {
      if (!channelId) {
        return;
      }
      setChannelActionError(null);

      if (!normalisedCommunityId || !token || !isAuthenticated) {
        setChannels((previous) => {
          const next = previous.filter((channel) => channel.id !== channelId);
          if (activeChannelId === channelId) {
            setActiveChannelId(next[0]?.id ?? null);
          }
          return next;
        });
        setMessagesByChannel((previous) => {
          const next = { ...previous };
          delete next[channelId];
          return next;
        });
        return;
      }

      try {
        await deleteCommunityChatChannel({
          communityId: normalisedCommunityId,
          channelId,
          token
        });
        setChannels((previous) => {
          const next = previous.filter((channel) => channel.id !== channelId);
          if (activeChannelId === channelId) {
            setActiveChannelId(next[0]?.id ?? null);
          }
          return next;
        });
        setMessagesByChannel((previous) => {
          const next = { ...previous };
          delete next[channelId];
          return next;
        });
      } catch (error) {
        setChannelActionError(error);
      }
    },
    [
      normalisedCommunityId,
      token,
      isAuthenticated,
      activeChannelId
    ]
  );

  const channelState = activeChannelId ? messageStates[activeChannelId] ?? { status: 'idle', error: null } : { status: 'idle', error: null };
  const composerDisabled = !activeChannel || (Boolean(normalisedCommunityId) && (!isAuthenticated || !token));
  const realtimeStatusLabel =
    realtimeStatus === 'connecting'
      ? 'Connecting to realtime…'
      : realtimeStatus === 'ready'
      ? 'Realtime active'
      : realtimeStatus === 'loading'
      ? 'Loading presence…'
      : null;

  const channelErrorMessage = toErrorMessage(channelState.error, 'Unable to load messages.');
  const channelsErrorMessage = toErrorMessage(channelsError, 'Unable to load channels.');
  const actionErrorMessage = toErrorMessage(channelActionError, 'Channel operation failed.');
  const realtimeErrorMessage = toErrorMessage(realtimeError, 'Realtime connection issue.');

  return (
    <section className="space-y-6 rounded-4xl border border-slate-200 bg-white/70 p-6 shadow-xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Community chat</p>
          <h2 className="text-lg font-semibold text-slate-900">{communityName} · Channel operations</h2>
          <p className="mt-1 text-sm text-slate-600">
            Configure rooms, manage live tooling, and keep updates searchable across the community.
          </p>
          {realtimeStatusLabel ? (
            <p className="mt-2 text-xs font-semibold text-slate-500">{realtimeStatusLabel}</p>
          ) : null}
          {realtimeErrorMessage ? (
            <p className="mt-1 text-xs font-semibold text-rose-600">{realtimeErrorMessage}</p>
          ) : null}
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
            disabled={!canManageChannels}
            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusIcon className="h-5 w-5" /> New channel
          </button>

          {channelsStatus === 'loading' ? (
            <p className="text-xs font-semibold text-slate-500">Loading channels…</p>
          ) : null}
          {channelsErrorMessage ? (
            <p className="text-xs font-semibold text-rose-600">{channelsErrorMessage}</p>
          ) : null}

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
                        {channel.unreadCount ? (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">{channel.unreadCount} unread</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                  {canManageChannels ? (
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
                  ) : null}
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
          {actionErrorMessage ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-4 text-xs font-semibold text-rose-600">
              {actionErrorMessage}
            </div>
          ) : null}

          {isCreatingChannel ? (
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-lg">
              <p className="text-sm font-semibold text-slate-900">Create a channel</p>
              <p className="mt-1 text-xs text-slate-500">Set visibility, slow mode, and live tooling in one step.</p>
              <div className="mt-4">
                <ChannelForm channel={null} onSubmit={handleCreateChannel} onCancel={() => setIsCreatingChannel(false)} />
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
                  <div className="flex flex-col items-end gap-2 text-right text-[11px] font-semibold text-slate-500">
                    <div className="flex flex-wrap items-center gap-3">
                      <UsersIcon className="h-4 w-4" />{' '}
                      {activeChannel.isPrivate ? 'Private audience' : 'Open to all members'}
                      {activeChannel.allowVoice ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-violet-600">
                          <MicrophoneIcon className="h-4 w-4" /> Voice stage enabled
                        </span>
                      ) : null}
                      {activeChannel.slowMode ? <span>Slow mode {activeChannel.slowMode}s</span> : null}
                    </div>
                    {presenceList.length ? (
                      <div className="flex flex-wrap justify-end gap-1 text-[11px]">
                        {presenceList.slice(0, 3).map((entry) => {
                          const fallbackKey =
                            typeof crypto !== 'undefined' && crypto.randomUUID
                              ? crypto.randomUUID()
                              : `presence-${Math.random().toString(36).slice(2)}`;
                          const key = entry.sessionId ?? entry.userId ?? entry.user?.id ?? entry.id ?? entry.email ?? fallbackKey;
                          const name = entry.displayName ?? entry.name ?? entry.user?.name ?? 'Member';
                          return (
                            <span key={key} className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-600">
                              {name}
                            </span>
                          );
                        })}
                        {presenceList.length > 3 ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                            +{presenceList.length - 3} more online
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">No members currently online</span>
                    )}
                    {typingSummary ? (
                      <span className="text-[11px] font-medium text-primary">{typingSummary}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <MessageComposer
                onSubmit={handlePostMessage}
                onTyping={handleTyping}
                disabled={composerDisabled}
                isSubmitting={isPosting}
                error={composerError}
              />

              {channelErrorMessage ? (
                <p className="text-xs font-semibold text-rose-600">{channelErrorMessage}</p>
              ) : null}

              <div className="space-y-3">
                {channelState.status === 'loading' ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white/40 p-6 text-center text-sm text-slate-500">
                    Loading messages…
                  </div>
                ) : null}
                {channelState.status !== 'loading' && channelMessages.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white/40 p-6 text-center text-sm text-slate-500">
                    No messages yet. Share an update to kick things off.
                  </div>
                ) : null}
                {channelMessages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    viewerId={viewerId}
                    canModerate={canModerateMessages}
                    onModerate={handleModerateMessage}
                  />
                ))}
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


