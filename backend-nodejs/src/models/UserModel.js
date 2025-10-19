import db from '../config/database.js';

const BASE_COLUMNS = [
  'id',
  'first_name as firstName',
  'last_name as lastName',
  'email',
  'role',
  'age',
  'address',
  'two_factor_enabled as twoFactorEnabled',
  'two_factor_enrolled_at as twoFactorEnrolledAt',
  'two_factor_last_verified_at as twoFactorLastVerifiedAt',
  'email_verified_at as emailVerifiedAt',
  'last_login_at as lastLoginAt',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

export default class UserModel {
  static async findByEmail(email, connection = db) {
    return connection('users').where({ email }).first();
  }

  static async forUpdateByEmail(email, connection = db) {
    return connection('users').where({ email }).forUpdate().first();
  }

  static async create(user, connection = db) {
    const payload = {
      first_name: user.firstName,
      last_name: user.lastName ?? null,
      email: user.email,
      password_hash: user.passwordHash,
      role: user.role ?? 'user',
      age: user.age ?? null,
      address:
        user.address && typeof user.address === 'object'
          ? JSON.stringify(user.address)
          : user.address ?? null,
      two_factor_enabled: user.twoFactorEnabled ? 1 : 0,
      two_factor_secret: user.twoFactorSecret ?? null,
      two_factor_enrolled_at: user.twoFactorEnrolledAt ?? null,
      two_factor_last_verified_at: user.twoFactorLastVerifiedAt ?? null
    };
    const [id] = await connection('users').insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    return connection('users').select(BASE_COLUMNS).where({ id }).first();
  }

  static async findByIds(ids, connection = db) {
    if (!ids?.length) return [];
    return connection('users').select(BASE_COLUMNS).whereIn('id', ids);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.firstName !== undefined) {
      payload.first_name = updates.firstName ?? null;
    }
    if (updates.lastName !== undefined) {
      payload.last_name = updates.lastName ?? null;
    }
    if (updates.email !== undefined) {
      payload.email = updates.email ?? null;
    }
    if (updates.role !== undefined) {
      payload.role = updates.role ?? 'user';
    }
    if (updates.age !== undefined) {
      payload.age = updates.age ?? null;
    }
    if (updates.address !== undefined) {
      payload.address =
        updates.address && typeof updates.address === 'object'
          ? JSON.stringify(updates.address)
          : updates.address ?? null;
    }

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection('users').where({ id }).update(payload);
    return this.findById(id, connection);
  }

  static async list({ limit = 20, offset = 0 } = {}) {
    return db('users')
      .select(BASE_COLUMNS)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  static async recordLoginFailure(user, options, connection = db) {
    const now = new Date();
    const windowMs = options.windowMinutes * 60 * 1000;
    const lastFailure = user.last_failed_login_at ? new Date(user.last_failed_login_at) : null;
    let attempts = user.failed_login_attempts ?? 0;

    if (!lastFailure || now.getTime() - lastFailure.getTime() > windowMs) {
      attempts = 0;
    }

    attempts += 1;
    let lockedUntil = null;
    let storedAttempts = attempts;
    const updates = {
      failed_login_attempts: storedAttempts,
      last_failed_login_at: connection.fn.now()
    };

    if (attempts >= options.threshold) {
      lockedUntil = new Date(now.getTime() + options.lockoutDurationMinutes * 60 * 1000);
      updates.locked_until = lockedUntil;
      storedAttempts = 0;
      updates.failed_login_attempts = 0;
    }

    await connection('users').where({ id: user.id }).update(updates);

    return {
      attempts: storedAttempts,
      failureCount: attempts,
      lockedUntil
    };
  }

  static async clearLoginFailures(userId, connection = db) {
    await connection('users')
      .where({ id: userId })
      .update({
        failed_login_attempts: 0,
        last_failed_login_at: null,
        locked_until: null,
        last_login_at: connection.fn.now()
      });
  }

  static async markTwoFactorVerified(userId, connection = db) {
    await connection('users')
      .where({ id: userId })
      .update({ two_factor_last_verified_at: connection.fn.now() });
  }

  static async markEmailVerified(userId, connection = db) {
    await connection('users')
      .where({ id: userId })
      .update({
        email_verified_at: connection.fn.now(),
        failed_login_attempts: 0,
        last_failed_login_at: null,
        locked_until: null
      });
    return this.findById(userId, connection);
  }

  static async touchVerificationSentAt(userId, connection = db) {
    await connection('users')
      .where({ id: userId })
      .update({ last_verification_sent_at: connection.fn.now() });
  }
}
