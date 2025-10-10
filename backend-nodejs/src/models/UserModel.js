import db from '../config/database.js';

const BASE_COLUMNS = [
  'id',
  'first_name as firstName',
  'last_name as lastName',
  'email',
  'role',
  'age',
  'address',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

export default class UserModel {
  static async findByEmail(email, connection = db) {
    return connection('users').where({ email }).first();
  }

  static async create(user, connection = db) {
    const payload = {
      first_name: user.firstName,
      last_name: user.lastName ?? null,
      email: user.email,
      password_hash: user.passwordHash,
      role: user.role ?? 'user',
      age: user.age ?? null,
      address: user.address ?? null
    };
    const [id] = await connection('users').insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    return connection('users').select(BASE_COLUMNS).where({ id }).first();
  }

  static async list({ limit = 20, offset = 0 } = {}) {
    return db('users')
      .select(BASE_COLUMNS)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }
}
