import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '../models/UserModel.js';

export default class AuthService {
  static async register(payload) {
    const existing = await UserModel.findByEmail(payload.email);
    if (existing) {
      const error = new Error('Email already registered');
      error.status = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await UserModel.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      passwordHash,
      role: payload.role,
      age: payload.age,
      address: payload.address
    });

    return this.generateTokens({ id: user.id, email: user.email, role: user.role ?? 'user' });
  }

  static async login(email, password) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      const error = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const error = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }

    return this.generateTokens({ id: user.id, email: user.email, role: user.role });
  }

  static generateTokens(payload) {
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
    return { token, user: payload };
  }
}
