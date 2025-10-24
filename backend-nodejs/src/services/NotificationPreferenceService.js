import logger from '../config/logger.js';
import NotificationPreferenceModel from '../models/NotificationPreferenceModel.js';
import NotificationDeviceModel from '../models/NotificationDeviceModel.js';

const serviceLogger = logger.child({ module: 'notification-preference-service' });

const DEFAULT_CHANNELS = {
  email: { enabled: true },
  push: { enabled: true },
  sms: { enabled: false },
  slack: { enabled: false }
};

function normaliseChannels(channels = {}) {
  const merged = { ...DEFAULT_CHANNELS };
  Object.entries(channels).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') {
      return;
    }
    merged[key] = { ...merged[key], ...value };
  });
  if (typeof merged.slack.enabled !== 'boolean') {
    merged.slack.enabled = false;
  }
  return merged;
}

function toIso(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default class NotificationPreferenceService {
  static async getPreferences(userId) {
    let record = await NotificationPreferenceModel.findByUserId(userId);
    if (!record) {
      record = await NotificationPreferenceModel.upsert(userId, {
        channels: DEFAULT_CHANNELS,
        categories: {},
        metadata: { defaults: true },
        lastSyncedAt: new Date().toISOString()
      });
      serviceLogger.info({ userId }, 'Provisioned default notification preferences');
    }

    return {
      channels: normaliseChannels(record.channels),
      categories: record.categories ?? {},
      slack: {
        channel: record.slackChannel ?? null,
        workspace: record.slackWorkspace ?? null
      },
      updatedAt: toIso(record.updatedAt) ?? new Date().toISOString(),
      lastSyncedAt: toIso(record.lastSyncedAt) ?? toIso(record.updatedAt)
    };
  }

  static async updatePreferences(userId, payload = {}) {
    const channels = normaliseChannels(payload.channels);
    const categories = payload.categories ?? {};

    const record = await NotificationPreferenceModel.upsert(userId, {
      channels,
      categories,
      slackChannel: channels.slack?.channel ?? payload.slack?.channel ?? null,
      slackWorkspace: channels.slack?.workspace ?? payload.slack?.workspace ?? null,
      lastSyncedAt: new Date().toISOString(),
      metadata: payload.metadata ?? {}
    });

    serviceLogger.info({ userId }, 'Updated notification preferences');
    return {
      channels: normaliseChannels(record.channels),
      categories: record.categories ?? {},
      slack: {
        channel: record.slackChannel ?? null,
        workspace: record.slackWorkspace ?? null
      },
      updatedAt: toIso(record.updatedAt) ?? new Date().toISOString(),
      lastSyncedAt: toIso(record.lastSyncedAt) ?? toIso(record.updatedAt)
    };
  }

  static async registerDevice(userId, payload = {}) {
    if (!payload.token) {
      throw new Error('Device token is required for registration.');
    }

    const record = await NotificationDeviceModel.register({
      userId,
      deviceToken: payload.token,
      platform: payload.platform,
      appVersion: payload.appVersion,
      osVersion: payload.osVersion,
      locale: payload.locale,
      metadata: {
        appBuild: payload.appBuild ?? null,
        environment: payload.environment ?? 'production',
        ...payload.metadata
      },
      lastRegisteredAt: new Date()
    });

    serviceLogger.debug({ userId, token: payload.token }, 'Registered notification device');
    return record;
  }
}

