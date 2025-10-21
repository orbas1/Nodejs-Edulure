import bcrypt from 'bcrypt';
import crypto from 'crypto';

import db from '../config/database.js';
import UserModel from '../models/UserModel.js';
import UserProfileModel from '../models/UserProfileModel.js';
import DomainEventModel from '../models/DomainEventModel.js';

const ALLOWED_ROLES = new Set(['user', 'instructor', 'admin', 'moderator', 'staff', 'service']);

const PASSWORD_SALT_ROUNDS = 12;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normaliseString(value) {
  if (typeof value !== 'string') {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normaliseEmail(value) {
  const trimmed = normaliseString(value);
  return trimmed ? trimmed.toLowerCase() : null;
}

function stripEmptyEntries(object) {
  if (!isPlainObject(object)) {
    return null;
  }

  const result = {};
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed.length) {
        continue;
      }
      result[key] = trimmed;
      continue;
    }

    if (Array.isArray(value)) {
      const filtered = value.filter((entry) => entry !== undefined && entry !== null && `${entry}`.trim().length);
      if (filtered.length) {
        result[key] = filtered;
      }
      continue;
    }

    if (isPlainObject(value)) {
      const cleaned = stripEmptyEntries(value);
      if (cleaned && Object.keys(cleaned).length) {
        result[key] = cleaned;
      }
      continue;
    }

    result[key] = value;
  }

  return Object.keys(result).length ? result : null;
}

function normaliseAddress(address) {
  if (!address) {
    return null;
  }

  if (typeof address === 'string') {
    const trimmed = address.trim();
    return trimmed.length ? trimmed : null;
  }

  if (typeof address !== 'object') {
    return null;
  }

  return stripEmptyEntries(address);
}

function normaliseSocialLinks(links) {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .map((link) => ({
      label: normaliseString(link?.label) ?? null,
      url: normaliseString(link?.url),
      handle: normaliseString(link?.handle) ?? null
    }))
    .filter((link) => Boolean(link.url));
}

function normaliseProfileInput(profile) {
  if (profile === null) {
    return null;
  }

  if (!isPlainObject(profile)) {
    return null;
  }

  const normalised = {};

  if (Object.prototype.hasOwnProperty.call(profile, 'displayName')) {
    normalised.displayName = normaliseString(profile.displayName);
  }
  if (Object.prototype.hasOwnProperty.call(profile, 'tagline')) {
    normalised.tagline = normaliseString(profile.tagline);
  }
  if (Object.prototype.hasOwnProperty.call(profile, 'location')) {
    normalised.location = normaliseString(profile.location);
  }
  if (Object.prototype.hasOwnProperty.call(profile, 'avatarUrl')) {
    normalised.avatarUrl = normaliseString(profile.avatarUrl);
  }
  if (Object.prototype.hasOwnProperty.call(profile, 'bannerUrl')) {
    normalised.bannerUrl = normaliseString(profile.bannerUrl);
  }
  if (Object.prototype.hasOwnProperty.call(profile, 'bio')) {
    if (typeof profile.bio === 'string') {
      const trimmed = profile.bio.trim();
      normalised.bio = trimmed.length ? trimmed : null;
    } else {
      normalised.bio = profile.bio ?? null;
    }
  }
  if (Object.prototype.hasOwnProperty.call(profile, 'socialLinks')) {
    normalised.socialLinks = normaliseSocialLinks(profile.socialLinks);
  }
  if (Object.prototype.hasOwnProperty.call(profile, 'metadata')) {
    normalised.metadata = isPlainObject(profile.metadata) ? profile.metadata : {};
  }

  return Object.keys(normalised).length ? normalised : null;
}

function generateTemporaryPassword() {
  const candidate = crypto
    .randomBytes(16)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '');

  if (candidate.length >= 8 && /[a-z]/i.test(candidate) && /\d/.test(candidate)) {
    return candidate.slice(0, 32);
  }

  const fallback = `${candidate}A9`;
  return fallback.slice(0, 32);
}

function normaliseProfileForComparison(profile) {
  if (!profile) {
    return null;
  }

  const base = {
    displayName: profile.displayName ?? null,
    tagline: profile.tagline ?? null,
    location: profile.location ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    bannerUrl: profile.bannerUrl ?? null,
    bio: profile.bio ?? null,
    socialLinks: Array.isArray(profile.socialLinks) ? profile.socialLinks : [],
    metadata: isPlainObject(profile.metadata) ? profile.metadata : {}
  };

  return base;
}

function deepEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => deepEqual(value, b[index]));
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
      return false;
    }
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

function determineChangedFields(before, after, { includePassword = false } = {}) {
  const changes = [];

  if (before.firstName !== after.firstName) {
    changes.push('firstName');
  }
  if (before.lastName !== after.lastName) {
    changes.push('lastName');
  }
  if (before.email !== after.email) {
    changes.push('email');
  }
  if (before.role !== after.role) {
    changes.push('role');
  }
  if (before.age !== after.age) {
    changes.push('age');
  }

  if (!deepEqual(before.address ?? null, after.address ?? null)) {
    changes.push('address');
  }

  if (before.twoFactorEnabled !== after.twoFactorEnabled) {
    changes.push('twoFactorEnabled');
  }

  if (includePassword) {
    changes.push('password');
  }

  const comparableBeforeProfile = normaliseProfileForComparison(before.profile);
  const comparableAfterProfile = normaliseProfileForComparison(after.profile);
  if (!deepEqual(comparableBeforeProfile, comparableAfterProfile)) {
    changes.push('profile');
  }

  return Array.from(new Set(changes));
}

function parseJson(value, fallback) {
  if (!value && value !== 0) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

  return fallback;
}

function parseAddress(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  const parsed = parseJson(value, null);
  if (parsed) {
    return parsed;
  }

  return { formatted: value };
}

function parseSocialLinks(raw) {
  const parsed = parseJson(raw, []);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((entry) => ({
      label: entry?.label ?? null,
      url: entry?.url ?? null,
      handle: entry?.handle ?? null
    }))
    .filter((entry) => entry.url);
}

function composeUser(userRecord, profileRecord) {
  if (!userRecord) {
    return null;
  }

  const { twoFactorEnabled, ...rest } = userRecord;
  const profile = profileRecord
    ? {
        id: profileRecord.id,
        displayName: profileRecord.displayName ?? null,
        tagline: profileRecord.tagline ?? null,
        location: profileRecord.location ?? null,
        avatarUrl: profileRecord.avatarUrl ?? null,
        bannerUrl: profileRecord.bannerUrl ?? null,
        bio: profileRecord.bio ?? null,
        socialLinks: parseSocialLinks(profileRecord.socialLinks),
        metadata: parseJson(profileRecord.metadata, {}),
        createdAt: profileRecord.createdAt ?? null,
        updatedAt: profileRecord.updatedAt ?? null
      }
    : null;

  return {
    ...rest,
    twoFactorEnabled: Boolean(twoFactorEnabled),
    address: parseAddress(userRecord.address),
    profile
  };
}

function normaliseTwoFactorSecret(secret, { fieldName = 'twoFactorSecret' } = {}) {
  if (secret === undefined) {
    return undefined;
  }

  const cleaned = normaliseString(secret);
  if (cleaned === null) {
    return null;
  }

  const stripped = cleaned.replace(/\s+/g, '').toUpperCase();
  if (stripped.length < 16) {
    const error = new Error('Two-factor secret must be at least 16 characters long');
    error.status = 422;
    error.field = fieldName;
    throw error;
  }

  if (!/^[A-Z2-7]+=*$/.test(stripped)) {
    const error = new Error('Two-factor secret must be base32 encoded');
    error.status = 422;
    error.field = fieldName;
    throw error;
  }

  return stripped;
}

function parseIsoDate(value, { fieldName }) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const input = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(input.getTime())) {
    const error = new Error(`Invalid date provided for ${fieldName}`);
    error.status = 422;
    error.field = fieldName;
    throw error;
  }

  return input;
}

export default class UserService {
  static async list(limit, offset) {
    const users = await UserModel.list({ limit, offset });
    if (users.length === 0) {
      return [];
    }

    const profiles = await UserProfileModel.findByUserIds(users.map((user) => user.id));
    const profileMap = new Map(profiles.map((profile) => [profile.userId, profile]));
    return users.map((user) => composeUser(user, profileMap.get(user.id)));
  }

  static async getById(id) {
    const user = await UserModel.findById(id);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    const profile = await UserProfileModel.findByUserId(id);
    return composeUser(user, profile);
  }

  static async updateById(id, payload) {
    return db.transaction(async (trx) => {
      const existing = await UserModel.findById(id, trx);
      if (!existing) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }

      const existingProfile = await UserProfileModel.findByUserId(id, trx);
      const before = composeUser(existing, existingProfile);

      const updates = {};
      if (payload.firstName !== undefined) {
        updates.firstName = normaliseString(payload.firstName);
      }
      if (payload.lastName !== undefined) {
        updates.lastName = normaliseString(payload.lastName);
      }
      if (payload.age !== undefined) {
        updates.age = payload.age ?? null;
      }
      if (payload.address !== undefined) {
        updates.address = normaliseAddress(payload.address);
      }

      if (Object.keys(updates).length > 0) {
        await UserModel.updateById(id, updates, trx);
      }

      if (payload.profile === null) {
        await UserProfileModel.deleteByUserId(id, trx);
      } else if (payload.profile !== undefined) {
        const profilePayload = normaliseProfileInput(payload.profile);
        if (profilePayload) {
          await UserProfileModel.upsert(id, profilePayload, trx);
        }
      }

      const nextUser = await UserModel.findById(id, trx);
      if (!nextUser) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }
      const nextProfile = await UserProfileModel.findByUserId(id, trx);
      return composeUser(nextUser, nextProfile);
    });
  }

  static async create(payload = {}, actor = {}) {
    return db.transaction(async (trx) => {
      const email = normaliseEmail(payload.email);
      if (!email) {
        const error = new Error('Email address is required');
        error.status = 422;
        throw error;
      }

      const firstName = normaliseString(payload.firstName);
      if (!firstName) {
        const error = new Error('First name is required');
        error.status = 422;
        throw error;
      }

      const existing = await UserModel.findByEmail(email, trx);
      if (existing) {
        const error = new Error('Email already in use');
        error.status = 409;
        throw error;
      }

      const providedPassword = normaliseString(payload.password);
      const temporaryPassword = providedPassword && providedPassword.length >= 8 ? providedPassword : generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(temporaryPassword, PASSWORD_SALT_ROUNDS);

      const role = normaliseString(payload.role);
      if (role && !ALLOWED_ROLES.has(role.toLowerCase())) {
        const error = new Error('Invalid role specified');
        error.status = 422;
        throw error;
      }

      const twoFactorSecret = normaliseTwoFactorSecret(payload.twoFactorSecret, { fieldName: 'twoFactorSecret' });
      const twoFactorEnrolledAt = parseIsoDate(payload.twoFactorEnrolledAt, { fieldName: 'twoFactorEnrolledAt' });
      const twoFactorLastVerifiedAt = parseIsoDate(payload.twoFactorLastVerifiedAt, {
        fieldName: 'twoFactorLastVerifiedAt'
      });

      if (payload.twoFactorEnabled && !twoFactorSecret) {
        const error = new Error('Two-factor secret is required when enabling two-factor authentication');
        error.status = 422;
        throw error;
      }

      const createdUser = await UserModel.create(
        {
          firstName,
          lastName: normaliseString(payload.lastName),
          email,
          passwordHash,
          role: role ? role.toLowerCase() : 'user',
          age: payload.age ?? null,
          address: normaliseAddress(payload.address),
          twoFactorEnabled: Boolean(payload.twoFactorEnabled),
          twoFactorSecret: twoFactorSecret ?? null,
          twoFactorEnrolledAt: twoFactorEnrolledAt ?? null,
          twoFactorLastVerifiedAt: twoFactorLastVerifiedAt ?? null
        },
        trx
      );

      let profileRecord = null;
      const profilePayload = normaliseProfileInput(payload.profile);
      if (profilePayload) {
        profileRecord = await UserProfileModel.upsert(createdUser.id, profilePayload, trx);
      }

      const composed = composeUser(createdUser, profileRecord);

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: createdUser.id,
          eventType: 'user.created',
          payload: {
            createdBy: actor?.id ?? actor?.sub ?? null,
            email: composed.email,
            role: composed.role
          }
        },
        trx
      );

      return {
        user: composed,
        password: temporaryPassword,
        temporaryPassword
      };
    });
  }

  static async update(id, payload = {}, actor = {}) {
    return db.transaction(async (trx) => {
      const existing = await UserModel.findById(id, trx);
      if (!existing) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }

      const existingProfile = await UserProfileModel.findByUserId(id, trx);
      const before = composeUser(existing, existingProfile);

      const updates = {};
      let passwordUpdated = false;

      if (payload.firstName !== undefined) {
        updates.firstName = normaliseString(payload.firstName);
      }
      if (payload.lastName !== undefined) {
        updates.lastName = normaliseString(payload.lastName);
      }
      if (payload.age !== undefined) {
        updates.age = payload.age ?? null;
      }

      if (payload.email !== undefined) {
        const email = normaliseEmail(payload.email);
        if (!email) {
          const error = new Error('Email address is required');
          error.status = 422;
          throw error;
        }

        if (email !== existing.email) {
          const conflict = await UserModel.findByEmail(email, trx);
          if (conflict && conflict.id !== id) {
            const error = new Error('Email already in use');
            error.status = 409;
            throw error;
          }
        }

        updates.email = email;
      }

      if (payload.role !== undefined) {
        const role = normaliseString(payload.role);
        if (role && !ALLOWED_ROLES.has(role.toLowerCase())) {
          const error = new Error('Invalid role specified');
          error.status = 422;
          throw error;
        }
        updates.role = role ? role.toLowerCase() : existing.role;
      }

      if (payload.address !== undefined) {
        updates.address = normaliseAddress(payload.address);
      }

      if (payload.twoFactorEnabled !== undefined) {
        updates.twoFactorEnabled = Boolean(payload.twoFactorEnabled);
      }

      const nextTwoFactorSecret = normaliseTwoFactorSecret(payload.twoFactorSecret, { fieldName: 'twoFactorSecret' });
      if (nextTwoFactorSecret !== undefined) {
        updates.twoFactorSecret = nextTwoFactorSecret;
      }

      const nextTwoFactorEnrolledAt = parseIsoDate(payload.twoFactorEnrolledAt, { fieldName: 'twoFactorEnrolledAt' });
      if (nextTwoFactorEnrolledAt !== undefined) {
        updates.twoFactorEnrolledAt = nextTwoFactorEnrolledAt;
      }

      const nextTwoFactorLastVerifiedAt = parseIsoDate(payload.twoFactorLastVerifiedAt, {
        fieldName: 'twoFactorLastVerifiedAt'
      });
      if (nextTwoFactorLastVerifiedAt !== undefined) {
        updates.twoFactorLastVerifiedAt = nextTwoFactorLastVerifiedAt;
      }

      if (payload.password !== undefined) {
        const nextPassword = normaliseString(payload.password);
        if (!nextPassword || nextPassword.length < 8) {
          const error = new Error('Password must be at least 8 characters long');
          error.status = 422;
          throw error;
        }

        updates.passwordHash = await bcrypt.hash(nextPassword, PASSWORD_SALT_ROUNDS);
        passwordUpdated = true;
      }

      const effectiveTwoFactorEnabled =
        updates.twoFactorEnabled !== undefined ? updates.twoFactorEnabled : existing.twoFactorEnabled;

      if (updates.twoFactorSecret === null && effectiveTwoFactorEnabled) {
        const error = new Error('Two-factor secret cannot be cleared while two-factor authentication is enabled');
        error.status = 422;
        throw error;
      }

      const enablingTwoFactor = updates.twoFactorEnabled === true && !existing.twoFactorEnabled;
      if (enablingTwoFactor && !updates.twoFactorSecret) {
        const error = new Error('Two-factor secret is required when enabling two-factor authentication');
        error.status = 422;
        throw error;
      }

      if (enablingTwoFactor && updates.twoFactorEnrolledAt === undefined) {
        updates.twoFactorEnrolledAt = new Date();
      }

      if (updates.twoFactorEnabled === false || (!effectiveTwoFactorEnabled && updates.twoFactorSecret === null)) {
        updates.twoFactorSecret = null;
        updates.twoFactorLastVerifiedAt = null;
      }

      if (Object.keys(updates).length > 0) {
        await UserModel.updateById(id, updates, trx);
      }

      if (payload.profile === null) {
        await UserProfileModel.deleteByUserId(id, trx);
      } else if (payload.profile !== undefined) {
        const profilePayload = normaliseProfileInput(payload.profile);
        if (profilePayload) {
          await UserProfileModel.upsert(id, profilePayload, trx);
        }
      }

      const refreshedUser = await UserModel.findById(id, trx);
      const refreshedProfile = await UserProfileModel.findByUserId(id, trx);
      const composed = composeUser(refreshedUser, refreshedProfile);

      const changes = determineChangedFields(before, composed, {
        includePassword: passwordUpdated
      });

      if (changes.length > 0) {
        await DomainEventModel.record(
          {
            entityType: 'user',
            entityId: id,
            eventType: 'user.updated',
            payload: {
              updatedBy: actor?.id ?? actor?.sub ?? null,
              changes
            }
          },
          trx
        );
      }

      return composed;
    });
  }

  static async remove(id, actor = {}) {
    return db.transaction(async (trx) => {
      const existing = await UserModel.findById(id, trx);
      if (!existing) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }

      await UserProfileModel.deleteByUserId(id, trx);
      await UserModel.deleteById(id, trx);

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: id,
          eventType: 'user.deleted',
          payload: {
            deletedBy: actor?.id ?? actor?.sub ?? null,
            email: existing.email
          }
        },
        trx
      );

      return { success: true };
    });
  }
}
