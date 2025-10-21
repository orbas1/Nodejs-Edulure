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
      updateById: vi.fn(),
      deleteById: vi.fn()
    },
    userProfileModel: {
      findByUserId: vi.fn(),
      findByUserIds: vi.fn(),
      upsert: vi.fn(),
      deleteByUserId: vi.fn()
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

vi.mock('../src/models/UserProfileModel.js', () => ({
  default: mocks.userProfileModel
}));

vi.mock('bcrypt', () => mocks.bcrypt);

vi.mock('crypto', () => ({
  default: { randomBytes: mocks.crypto.randomBytes },
  randomBytes: mocks.crypto.randomBytes
}));

const { db, trx, userModel, userProfileModel, domainEventModel, bcrypt, crypto } = mocks;

import UserService from '../src/services/UserService.js';

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.transaction.mockImplementation(async (handler) => handler(trx));
    crypto.randomBytes.mockReturnValue({ toString: () => 'TempPass123' });
    bcrypt.default.hash.mockResolvedValue('hashed-password');
    domainEventModel.record.mockResolvedValue();
    userProfileModel.findByUserId.mockResolvedValue(null);
    userProfileModel.findByUserIds.mockResolvedValue([]);
    userProfileModel.upsert.mockResolvedValue(null);
    userProfileModel.deleteByUserId.mockResolvedValue(1);
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
    userProfileModel.findByUserId.mockResolvedValue(null);

    const result = await UserService.create(
      {
        firstName: ' Alex ',
        email: 'alex@example.com',
        address: { city: 'New York', empty: '' },
        twoFactorEnabled: true,
        twoFactorSecret: 'jbswy3dpehpk3pxp'
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
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP'
      }),
      trx
    );
    expect(userProfileModel.upsert).not.toHaveBeenCalled();
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
    const existing = {
      id: 5,
      email: 'existing@example.com',
      role: 'user',
      firstName: 'Existing',
      address: null
    };
    userModel.findById.mockResolvedValueOnce(existing);
    userModel.findByEmail.mockResolvedValue(null);
    bcrypt.default.hash.mockResolvedValue('hashed-updated');
    userProfileModel.findByUserId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    userModel.findById.mockResolvedValueOnce({
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
    expect(userModel.updateById).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        firstName: 'Jamie',
        email: 'updated@example.com',
        passwordHash: 'hashed-updated',
        address: { city: 'Paris' }
      }),
      trx
    );
    expect(userProfileModel.upsert).not.toHaveBeenCalled();
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

    const result = await UserService.remove(9, { id: 33 });

    expect(userModel.findById).toHaveBeenCalledWith(9, trx);
    expect(userProfileModel.deleteByUserId).toHaveBeenCalledWith(9, trx);
    expect(userModel.deleteById).toHaveBeenCalledWith(9, trx);
    expect(domainEventModel.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'user.deleted',
        payload: expect.objectContaining({ deletedBy: 33 })
      }),
      trx
    );
    expect(result).toEqual({ success: true });
  });

  it('rejects creation when enabling two-factor without providing a secret', async () => {
    userModel.findByEmail.mockResolvedValue(null);

    await expect(
      UserService.create(
        {
          firstName: 'Sam',
          email: 'sam@example.com',
          twoFactorEnabled: true
        },
        { id: 99 }
      )
    ).rejects.toMatchObject({ status: 422 });

    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('deletes an existing profile when null is provided and records profile change', async () => {
    const existing = { id: 7, email: 'profile@example.com', firstName: 'Casey', role: 'user' };
    const existingProfile = { id: 70, userId: 7, displayName: 'Casey', metadata: '{}' };
    userModel.findById.mockResolvedValueOnce(existing);
    userProfileModel.findByUserId
      .mockResolvedValueOnce(existingProfile)
      .mockResolvedValueOnce(null);
    userModel.findById.mockResolvedValueOnce(existing);

    const result = await UserService.update(7, { profile: null }, { id: 11 });

    expect(userProfileModel.deleteByUserId).toHaveBeenCalledWith(7, trx);
    expect(result.profile).toBeNull();
    expect(domainEventModel.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'user.updated',
        payload: expect.objectContaining({
          updatedBy: 11,
          changes: expect.arrayContaining(['profile'])
        })
      }),
      trx
    );
  });

  it('rejects admin updates when enabling two-factor without secret', async () => {
    const existing = { id: 2, email: 'nofactor@example.com', twoFactorEnabled: false };
    userModel.findById.mockResolvedValueOnce(existing);
    userProfileModel.findByUserId
      .mockResolvedValueOnce(null);

    await expect(UserService.update(2, { twoFactorEnabled: true }, { id: 1 })).rejects.toMatchObject({ status: 422 });
    expect(userModel.updateById).not.toHaveBeenCalled();
  });

  it('updates two-factor metadata and records change list when toggled', async () => {
    const existing = {
      id: 3,
      email: 'toggle@example.com',
      twoFactorEnabled: false,
      firstName: 'Toggle',
      address: null
    };
    userModel.findById.mockResolvedValueOnce(existing);
    userProfileModel.findByUserId.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    bcrypt.default.hash.mockResolvedValue('hashed-updated');
    userModel.findByEmail.mockResolvedValue(null);
    userModel.findById.mockResolvedValueOnce({
      ...existing,
      twoFactorEnabled: true,
      twoFactorEnrolledAt: new Date('2024-01-01T00:00:00Z')
    });

    const result = await UserService.update(
      3,
      { twoFactorEnabled: true, twoFactorSecret: 'JBSWY3DPEHPK3PXP', password: 'SecurePass99' },
      { id: 55 }
    );

    expect(userModel.updateById).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        twoFactorEnrolledAt: expect.any(Date),
        passwordHash: 'hashed-updated'
      }),
      trx
    );
    expect(result.twoFactorEnabled).toBe(true);
    expect(domainEventModel.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'user.updated',
        payload: expect.objectContaining({
          changes: expect.arrayContaining(['twoFactorEnabled', 'password'])
        })
      }),
      trx
    );
  });
});
