import { useCallback, useEffect, useMemo } from 'react';

import { fetchSupportTickets } from '../api/learnerDashboardApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import usePersistentCollection from './usePersistentCollection.js';

const STORAGE_NAMESPACE = 'edulure.dashboard.supportCases.v1';

const STATUS_NORMALISATION = {
  open: 'open',
  'in-progress': 'open',
  'waiting-on-learner': 'waiting',
  waiting: 'waiting',
  resolved: 'resolved',
  closed: 'closed',
  archived: 'closed'
};

const PRIORITY_NORMALISATION = {
  urgent: 'urgent',
  high: 'high',
  normal: 'normal',
  low: 'low'
};

const STATUS_ORDER = ['open', 'waiting', 'resolved', 'closed'];

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toISOString(value) {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

function normaliseMessage(message) {
  if (!message) return null;
  const createdAt = toISOString(message.createdAt ?? message.sentAt ?? new Date());
  const author = message.author ?? message.sender ?? 'support';
  const attachments = Array.isArray(message.attachments)
    ? message.attachments
    : Array.isArray(message.files)
      ? message.files
      : [];
  const id = message.id ?? message.messageId ?? `${author}-${createdAt ?? Date.now()}`;

  return {
    id,
    author,
    body: message.body ?? message.message ?? '',
    createdAt,
    attachments: attachments.map((attachment, index) => {
      if (typeof attachment === 'string') {
        return { id: `${id}-attachment-${index}`, name: attachment, size: null };
      }
      return {
        id: attachment.id ?? `${id}-attachment-${index}`,
        name: attachment.name ?? attachment.filename ?? 'Attachment',
        size: attachment.size ?? attachment.bytes ?? null,
        url: attachment.url ?? attachment.href ?? null
      };
    })
  };
}

function normaliseSupportCase(caseItem) {
  if (!caseItem) return null;

  const id = caseItem.id ?? caseItem.caseId ?? caseItem.ticketId ?? null;
  if (!id) {
    return null;
  }

  const createdAt = toISOString(caseItem.createdAt ?? caseItem.created ?? new Date());
  const updatedAt = toISOString(caseItem.updatedAt ?? caseItem.updated ?? createdAt);
  const statusKey = (caseItem.status ?? caseItem.state ?? 'open').toString().toLowerCase();
  const status = STATUS_NORMALISATION[statusKey] ?? 'open';
  const priorityKey = (caseItem.priority ?? 'normal').toString().toLowerCase();
  const priority = PRIORITY_NORMALISATION[priorityKey] ?? 'normal';
  const messagesRaw = Array.isArray(caseItem.messages)
    ? caseItem.messages
    : Array.isArray(caseItem.timeline)
      ? caseItem.timeline
      : [];

  return {
    id,
    reference: caseItem.reference ?? caseItem.ref ?? null,
    subject: caseItem.subject ?? caseItem.title ?? 'Support request',
    category: caseItem.category ?? caseItem.type ?? 'General',
    priority,
    status,
    createdAt,
    updatedAt,
    channel: caseItem.channel ?? caseItem.source ?? 'Portal',
    owner: caseItem.owner ?? caseItem.assignedTo ?? null,
    lastAgent: caseItem.lastAgent ?? caseItem.agent ?? null,
    satisfaction: caseItem.satisfaction ?? null,
    tags: Array.isArray(caseItem.tags) ? caseItem.tags : [],
    messages: messagesRaw
      .map((message) => normaliseMessage(message))
      .filter(Boolean)
      .sort((a, b) => new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0))
  };
}

function enrichSupportCase(caseItem) {
  const messages = Array.isArray(caseItem.messages) ? caseItem.messages : [];
  const latestMessage = messages[messages.length - 1] ?? null;
  const lastLearnerMessage = [...messages].reverse().find((message) => message.author === 'learner');
  const lastSupportMessage = [...messages].reverse().find((message) => message.author !== 'learner');
  const updatedAt = toDate(caseItem.updatedAt ?? latestMessage?.createdAt ?? caseItem.createdAt);

  return {
    ...caseItem,
    messageCount: messages.length,
    lastMessageAt: latestMessage?.createdAt ?? null,
    lastMessageAuthor: latestMessage?.author ?? null,
    lastLearnerMessageAt: lastLearnerMessage?.createdAt ?? null,
    lastSupportMessageAt: lastSupportMessage?.createdAt ?? null,
    updatedAtLabel: updatedAt ? DATE_FORMATTER.format(updatedAt) : 'Moments ago'
  };
}

function calculateStats(cases) {
  if (cases.length === 0) {
    return {
      open: 0,
      waiting: 0,
      resolved: 0,
      closed: 0,
      awaitingLearner: 0,
      averageResponseMinutes: 0,
      latestUpdatedAt: null
    };
  }

  let awaitingLearner = 0;
  let responseDurations = [];
  let latest = null;

  cases.forEach((supportCase) => {
    const messages = Array.isArray(supportCase.messages) ? supportCase.messages : [];
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.author !== 'learner' && supportCase.status !== 'resolved' && supportCase.status !== 'closed') {
        awaitingLearner += 1;
      }
      const agentMessages = messages.filter((message) => message.author !== 'learner');
      agentMessages.forEach((agentMessage) => {
        const agentDate = toDate(agentMessage.createdAt);
        const learnerBeforeAgent = [...messages]
          .reverse()
          .find((message) => {
            if (message.author !== 'learner') {
              return false;
            }
            const learnerDate = toDate(message.createdAt);
            if (!agentDate || !learnerDate) {
              return false;
            }
            return learnerDate <= agentDate;
          });
        if (agentDate && learnerBeforeAgent) {
          const learnerDate = toDate(learnerBeforeAgent.createdAt);
          if (learnerDate) {
            const diffMinutes = Math.max(0, Math.round((agentDate - learnerDate) / (60 * 1000)));
            responseDurations.push(diffMinutes);
          }
        }
      });
    }

    const updatedAt = toDate(supportCase.updatedAt ?? supportCase.lastMessageAt);
    if (updatedAt && (!latest || updatedAt > latest)) {
      latest = updatedAt;
    }
  });

  const averageResponseMinutes = responseDurations.length
    ? Math.round(responseDurations.reduce((sum, value) => sum + value, 0) / responseDurations.length)
    : 0;

  return {
    open: cases.filter((item) => item.status === 'open').length,
    waiting: cases.filter((item) => item.status === 'waiting').length,
    resolved: cases.filter((item) => item.status === 'resolved').length,
    closed: cases.filter((item) => item.status === 'closed').length,
    awaitingLearner,
    averageResponseMinutes,
    latestUpdatedAt: latest ? latest.toISOString() : null
  };
}

export default function useLearnerSupportCases(initialCases = [], options = {}) {
  const { session: sessionOverride, userId: userIdOverride } = options;
  const auth = sessionOverride ? null : useAuth();
  const session = sessionOverride ?? auth?.session ?? null;
  const token = session?.tokens?.accessToken ?? null;
  const userId = userIdOverride ?? session?.user?.id ?? 'anonymous';
  const storageKey = `${STORAGE_NAMESPACE}:${userId}`;

  const normalisedInitial = useMemo(() => {
    if (!Array.isArray(initialCases)) {
      return [];
    }
    return initialCases.map((item) => normaliseSupportCase(item)).filter(Boolean);
  }, [initialCases]);

  const { items, addItem, updateItem, removeItem, replaceItems, reset } = usePersistentCollection(
    storageKey,
    normalisedInitial
  );

  useEffect(() => {
    if (!token) {
      return undefined;
    }
    const controller = new AbortController();
    fetchSupportTickets({ token, signal: controller.signal })
      .then((response) => {
        const remoteTickets = Array.isArray(response?.data?.tickets)
          ? response.data.tickets
          : Array.isArray(response?.tickets)
            ? response.tickets
            : [];
        if (remoteTickets.length) {
          replaceItems(remoteTickets.map((item) => normaliseSupportCase(item)).filter(Boolean));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [replaceItems, token]);

  useEffect(() => {
    if (!Array.isArray(initialCases) || initialCases.length === 0) {
      return;
    }
    const incoming = initialCases.map((item) => normaliseSupportCase(item)).filter(Boolean);
    if (!incoming.length) {
      return;
    }
    const existingIds = new Set(items.map((item) => item.id));
    const missing = incoming.filter((item) => !existingIds.has(item.id));
    if (missing.length > 0) {
      replaceItems([...items, ...missing]);
      return;
    }

    const needsUpdate = incoming.some((incomingCase) => {
      const existing = items.find((item) => item.id === incomingCase.id);
      return existing && existing.updatedAt !== incomingCase.updatedAt;
    });

    if (needsUpdate) {
      const merged = items.map((existing) => {
        const fromRemote = incoming.find((item) => item.id === existing.id);
        if (!fromRemote) {
          return existing;
        }
        return {
          ...existing,
          ...fromRemote,
          messages: fromRemote.messages.length ? fromRemote.messages : existing.messages
        };
      });
      replaceItems(merged);
    }
  }, [initialCases, items, replaceItems]);

  const cases = useMemo(() => {
    return [...items]
      .map((item) => enrichSupportCase(item))
      .sort((a, b) => {
        const statusComparison = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
        if (statusComparison !== 0) {
          return statusComparison;
        }
        return new Date(b.updatedAt ?? b.lastMessageAt ?? 0) - new Date(a.updatedAt ?? a.lastMessageAt ?? 0);
      });
  }, [items]);

  const stats = useMemo(() => calculateStats(cases), [cases]);

  const createCase = useCallback(
    (payload) => {
      const timestamp = new Date().toISOString();
      const record = normaliseSupportCase({
        ...payload,
        id: payload.id,
        createdAt: payload.createdAt ?? timestamp,
        updatedAt: payload.updatedAt ?? timestamp,
        messages: payload.messages ?? [],
        status: payload.status ?? 'open'
      });
      if (!record) {
        return null;
      }
      const created = addItem(record);
      return enrichSupportCase(created);
    },
    [addItem]
  );

  const updateCase = useCallback(
    (id, updates) => {
      updateItem(id, (current) => {
        const merged = normaliseSupportCase({ ...current, ...updates, id });
        if (!merged) {
          return current;
        }
        return {
          ...current,
          ...merged,
          updatedAt: new Date().toISOString()
        };
      });
    },
    [updateItem]
  );

  const appendMessage = useCallback(
    (id, message) => {
      const normalisedMessage = normaliseMessage(message);
      if (!normalisedMessage) {
        return null;
      }
      updateItem(id, (current) => {
        const messages = Array.isArray(current.messages) ? current.messages : [];
        return {
          ...current,
          messages: [...messages, normalisedMessage],
          updatedAt: normalisedMessage.createdAt ?? new Date().toISOString()
        };
      });
      return normalisedMessage;
    },
    [updateItem]
  );

  const closeCase = useCallback(
    (id, resolutionNote) => {
      updateCase(id, {
        status: 'resolved',
        resolutionNote,
        resolvedAt: new Date().toISOString()
      });
    },
    [updateCase]
  );

  const reopenCase = useCallback(
    (id) => {
      updateCase(id, {
        status: 'open',
        reopenedAt: new Date().toISOString()
      });
    },
    [updateCase]
  );

  const deleteCase = useCallback(
    (id) => {
      removeItem(id);
    },
    [removeItem]
  );

  return {
    cases,
    stats,
    createCase,
    updateCase,
    addMessage: appendMessage,
    closeCase,
    reopenCase,
    deleteCase,
    reset
  };
}
