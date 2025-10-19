import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const db = vi.fn();
  db.transaction = vi.fn();
  const trx = {};

  return {
    db,
    trx,
    userModel: {
      list: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    domainEventModel: {
      record: vi.fn()
    },
    bcrypt: {
      default: {
        hash: vi.fn()
      }
    },
    crypto: {
      randomBytes: vi.fn()
    }
  };
});

vi.mock('../src/config/database.js', () => ({
  default: mocks.db
}));

vi.mock('../src/models/UserModel.js', () => ({
  default: mocks.userModel
}));

vi.mock('../src/models/DomainEventModel.js', () => ({
  default: mocks.domainEventModel
}));

vi.mock('bcrypt', () => mocks.bcrypt);

vi.mock('crypto', () => ({
  default: { randomBytes: mocks.crypto.randomBytes },
  randomBytes: mocks.crypto.randomBytes
}));

const { db, trx, userModel, domainEventModel, bcrypt, crypto } = mocks;

import UserService from '../src/services/UserService.js';

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.transaction.mockImplementation(async (handler) => handler(trx));
    crypto.randomBytes.mockReturnValue({ toString: () => 'TempPass123' });
    bcrypt.default.hash.mockResolvedValue('hashed-password');
  });

  it('creates new users with generated passwords and emits domain events', async () => {
    userModel.findByEmail.mockResolvedValue(null);
    userModel.create.mockResolvedValue({
      id: 1,
      firstName: 'Alex',
      lastName: null,
      email: 'alex@example.com',
      role: 'user'
    });

    const result = await UserService.create(
      {
        firstName: ' Alex ',
        email: 'alex@example.com',
        address: { city: 'New York', empty: '' },
        twoFactorEnabled: true
      },
      { id: 22 }
    );

    expect(userModel.findByEmail).toHaveBeenCalledWith('alex@example.com', trx);
    expect(bcrypt.default.hash).toHaveBeenCalledWith('TempPass123', 12);
    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Alex',
        email: 'alex@example.com',
        address: { city: 'New York' },
        passwordHash: 'hashed-password',
        twoFactorEnabled: true
      }),
      trx
    );
    expect(domainEventModel.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'user.created',
        payload: expect.objectContaining({ createdBy: 22, email: 'alex@example.com' })
      }),
      trx
    );
    expect(result).toEqual({
      user: expect.objectContaining({ email: 'alex@example.com' }),
      password: 'TempPass123',
      temporaryPassword: 'TempPass123'
    });
  });

  it('updates users, rehashes passwords, and records audit metadata', async () => {
    const existing = { id: 5, email: 'existing@example.com', role: 'user' };
    userModel.findById.mockResolvedValue(existing);
    userModel.findByEmail.mockResolvedValue(null);
    bcrypt.default.hash.mockResolvedValue('hashed-updated');
    userModel.update.mockResolvedValue({
      ...existing,
      email: 'updated@example.com',
      firstName: 'Jamie',
      address: { city: 'Paris' }
    });

    const result = await UserService.update(
      5,
      {
        firstName: 'Jamie',
        email: 'updated@example.com',
        password: '  NewPass123  ',
        address: { city: 'Paris', blank: '' }
      },
      { id: 44 }
    );

    expect(userModel.findById).toHaveBeenCalledWith(5, trx);
    expect(userModel.findByEmail).toHaveBeenCalledWith('updated@example.com', trx);
    expect(bcrypt.default.hash).toHaveBeenCalledWith('NewPass123', 12);
    expect(userModel.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        firstName: 'Jamie',
        email: 'updated@example.com',
        passwordHash: 'hashed-updated',
        address: { city: 'Paris' }
      }),
      trx
    );
    expect(domainEventModel.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'user.updated',
        payload: expect.objectContaining({
          updatedBy: 44,
          changes: expect.arrayContaining(['firstName', 'email', 'password', 'address'])
        })
      }),
      trx
    );
    expect(result.email).toBe('updated@example.com');
  });

  it('removes users and emits deletion events', async () => {
    const existing = { id: 9, email: 'remove@example.com' };
    userModel.findById.mockResolvedValue(existing);
    userModel.delete.mockResolvedValue(1);

    const result = await UserService.remove(9, { id: 33 });

    expect(userModel.findById).toHaveBeenCalledWith(9, trx);
    expect(userModel.delete).toHaveBeenCalledWith(9, trx);
    expect(domainEventModel.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'user.deleted',
        payload: expect.objectContaining({ deletedBy: 33 })
      }),
      trx
    );
    expect(result).toEqual({ success: true });
  });
});
