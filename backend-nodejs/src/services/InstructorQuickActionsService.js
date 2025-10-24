import db from '../config/database.js';
import InstructorQuickActionEventModel from '../models/InstructorQuickActionEventModel.js';
import InstructorQuickActionModel from '../models/InstructorQuickActionModel.js';

const QUICK_ACTION_STATUSES = new Set(['pending', 'in_progress', 'completed', 'failed']);

function ensureStatus(status) {
  if (!status) {
    return null;
  }
  const normalised = String(status).toLowerCase();
  if (!QUICK_ACTION_STATUSES.has(normalised)) {
    const error = new Error('Invalid quick action status');
    error.status = 422;
    throw error;
  }
  return normalised;
}

function mergeMetadata(existing, updates) {
  if (!updates) {
    return existing;
  }
  if (typeof updates !== 'object' || updates === null) {
    return existing;
  }
  return { ...existing, ...updates };
}

class InstructorQuickActionsService {
  static getSupportedStatuses() {
    return Array.from(QUICK_ACTION_STATUSES);
  }

  static async list(instructorUserId, { status, includeHistory = false, limit } = {}) {
    const actions = await InstructorQuickActionModel.listByInstructorId(instructorUserId, { status, limit });
    if (!includeHistory || !actions.length) {
      return actions;
    }
    const actionIds = actions.map((action) => action.id);
    const events = await InstructorQuickActionEventModel.listByActionIds(actionIds);
    const grouped = new Map();
    events.forEach((event) => {
      const list = grouped.get(event.actionId) ?? [];
      list.push(event);
      grouped.set(event.actionId, list);
    });
    return actions.map((action) => ({
      ...action,
      history: grouped.get(action.id) ?? []
    }));
  }

  static async create(instructorUserId, payload = {}) {
    return db.transaction(async (trx) => {
      const status = payload.status ? ensureStatus(payload.status) : 'pending';
      const action = await InstructorQuickActionModel.create(
        {
          instructorId: instructorUserId,
          title: payload.title ?? 'Untitled quick action',
          description: payload.description ?? null,
          actionType: payload.actionType ?? 'generic',
          status,
          priority: payload.priority ?? 3,
          dueAt: payload.dueAt ?? null,
          requiresSync: Boolean(payload.requiresSync),
          lastSyncedAt: payload.lastSyncedAt ?? null,
          completedAt: payload.completedAt ?? null,
          metadata: payload.metadata ?? {}
        },
        trx
      );
      await InstructorQuickActionEventModel.create(
        {
          actionId: action.id,
          eventKey: 'action.created',
          performedBy: instructorUserId,
          details: {
            status: action.status,
            priority: action.priority,
            requiresSync: action.requiresSync,
            note: payload.note ?? null
          }
        },
        trx
      );
      return action;
    });
  }

  static async transition(instructorUserId, actionPublicId, updates = {}) {
    return db.transaction(async (trx) => {
      const action = await InstructorQuickActionModel.findByPublicId(actionPublicId, trx);
      if (!action || action.instructorId !== instructorUserId) {
        const error = new Error('Quick action not found');
        error.status = 404;
        throw error;
      }

      const patch = {};
      if (updates.title !== undefined) patch.title = updates.title;
      if (updates.description !== undefined) patch.description = updates.description ?? null;
      if (updates.actionType !== undefined) patch.actionType = updates.actionType ?? 'generic';
      if (updates.priority !== undefined) patch.priority = updates.priority;
      if (updates.dueAt !== undefined) patch.dueAt = updates.dueAt ?? null;
      if (updates.metadata) {
        patch.metadata = mergeMetadata(action.metadata, updates.metadata);
      }

      let newStatus = null;
      if (updates.status !== undefined) {
        newStatus = ensureStatus(updates.status);
        patch.status = newStatus;
        if (newStatus === 'completed') {
          patch.completedAt = updates.completedAt ?? new Date();
          patch.requiresSync = updates.requiresSync ?? false;
          patch.lastSyncedAt = updates.lastSyncedAt ?? patch.completedAt;
        } else {
          if (updates.completedAt !== undefined) {
            patch.completedAt = updates.completedAt;
          }
        }
      }

      if (updates.requiresSync !== undefined) {
        const requiresSync = Boolean(updates.requiresSync);
        patch.requiresSync = requiresSync;
        if (!requiresSync) {
          patch.lastSyncedAt = updates.lastSyncedAt ?? new Date();
        } else if (updates.lastSyncedAt !== undefined) {
          patch.lastSyncedAt = updates.lastSyncedAt;
        }
      } else if (updates.lastSyncedAt !== undefined) {
        patch.lastSyncedAt = updates.lastSyncedAt;
      }

      const updated = await InstructorQuickActionModel.updateById(action.id, patch, trx);
      await InstructorQuickActionEventModel.create(
        {
          actionId: action.id,
          eventKey: 'status.transition',
          performedBy: instructorUserId,
          details: {
            previousStatus: action.status,
            status: updated.status,
            requiresSync: updated.requiresSync,
            note: updates.note ?? null,
            metadata: updates.metadata ?? null
          }
        },
        trx
      );
      return updated;
    });
  }

  static async markSynced(instructorUserId, actionPublicId, payload = {}) {
    return db.transaction(async (trx) => {
      const action = await InstructorQuickActionModel.findByPublicId(actionPublicId, trx);
      if (!action || action.instructorId !== instructorUserId) {
        const error = new Error('Quick action not found');
        error.status = 404;
        throw error;
      }
      const patch = {
        requiresSync: false,
        lastSyncedAt: payload.syncedAt ?? new Date()
      };
      if (payload.status) {
        patch.status = ensureStatus(payload.status);
        if (patch.status === 'completed' && !payload.completedAt && !action.completedAt) {
          patch.completedAt = new Date();
        }
      }
      if (payload.completedAt !== undefined) {
        patch.completedAt = payload.completedAt;
      }
      if (payload.metadata) {
        patch.metadata = mergeMetadata(action.metadata, payload.metadata);
      }
      const updated = await InstructorQuickActionModel.updateById(action.id, patch, trx);
      await InstructorQuickActionEventModel.create(
        {
          actionId: action.id,
          eventKey: 'sync.completed',
          performedBy: instructorUserId,
          details: {
            status: updated.status,
            syncedAt: updated.lastSyncedAt?.toISOString?.() ?? updated.lastSyncedAt ?? null,
            note: payload.note ?? null
          }
        },
        trx
      );
      return updated;
    });
  }
}

const instructorQuickActionsService = InstructorQuickActionsService;

export default instructorQuickActionsService;
