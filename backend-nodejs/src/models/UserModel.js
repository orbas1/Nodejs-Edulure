import { query } from '../config/database.js';

export default class UserModel {
  static async findByEmail(email) {
    const [rows] = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] ?? null;
  }

  static async create(user) {
    const [result] = await query(
      'INSERT INTO users (first_name, last_name, email, password_hash, role, age, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.firstName, user.lastName, user.email, user.passwordHash, user.role ?? 'user', user.age ?? null, user.address ?? null]
    );
    return { id: result.insertId, ...user };
  }

  static async findById(id) {
    const [rows] = await query('SELECT id, first_name, last_name, email, role, age, address, created_at FROM users WHERE id = ?', [id]);
    return rows[0] ?? null;
  }

  static async list(limit = 20, offset = 0) {
    const [rows] = await query(
      'SELECT id, first_name, last_name, email, role, age, address, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows;
  }
}
