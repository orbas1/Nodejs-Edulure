import { describe, expect, it, vi, beforeEach } from 'vitest';

const transactionMock = vi.hoisted(() => vi.fn());
const userModel = vi.hoisted(() => ({
  list: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn()
}));
const userProfileModel = vi.hoisted(() => ({
  findByUserId: vi.fn(),
  upsert: vi.fn()
}));

vi.mock('../src/config/database.js', () => ({
  default: { transaction: transactionMock }
}));

vi.mock('../src/models/UserModel.js', () => ({
  default: userModel
}));

vi.mock('../src/models/UserProfileModel.js', () => ({
  default: userProfileModel
}));

import UserService from '../src/services/UserService.js';

describe('UserService', () => {
  const trxStub = {
    fn: { now: () => new Date() }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(async (handler) => handler(trxStub));
  });

  it('returns a composed user profile when found', async () => {
    userModel.findById.mockResolvedValueOnce({ id: 7, address: '{"city":"Paris"}' });
    userProfileModel.findByUserId.mockResolvedValueOnce({
      id: 12,
      displayName: 'Learner',
      socialLinks: JSON.stringify([{ label: 'LinkedIn', url: 'https://linkedin.com/in/test' }]),
      metadata: JSON.stringify({ locale: 'fr' })
    });

    const result = await UserService.getById(7);
    expect(result.profile.displayName).toBe('Learner');
    expect(result.address).toEqual({ city: 'Paris' });
    expect(result.profile.socialLinks).toEqual([
      { label: 'LinkedIn', url: 'https://linkedin.com/in/test', handle: null }
    ]);
  });

  it('throws a 404 when the user record does not exist', async () => {
    userModel.findById.mockResolvedValue(null);
    await expect(UserService.getById(99)).rejects.toMatchObject({ status: 404 });
  });

  it('updates user and profile records inside a transaction', async () => {
    userModel.updateById.mockResolvedValue();
    userProfileModel.upsert.mockResolvedValue();
    userModel.findById.mockResolvedValue({ id: 8, address: '{"city":"Berlin"}' });
    userProfileModel.findByUserId.mockResolvedValue({
      id: 5,
      displayName: 'Updated Learner',
      socialLinks: JSON.stringify([{ url: 'https://twitter.com/edulure', label: 'Twitter' }]),
      metadata: JSON.stringify({ locale: 'de' })
    });

    const updated = await UserService.updateById(8, {
      firstName: 'Jane',
      lastName: 'Doe',
      age: 30,
      address: { city: 'Berlin' },
      profile: {
        displayName: 'Updated Learner',
        tagline: 'Always learning',
        location: 'Berlin',
        avatarUrl: 'https://cdn/avatar.png',
        bannerUrl: null,
        bio: 'Bio',
        socialLinks: [{ label: 'Twitter', url: 'https://twitter.com/edulure' }],
        metadata: { locale: 'de' }
      }
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(userModel.updateById).toHaveBeenCalledWith(8, {
      firstName: 'Jane',
      lastName: 'Doe',
      age: 30,
      address: { city: 'Berlin' }
    }, trxStub);
    expect(userProfileModel.upsert).toHaveBeenCalledWith(
      8,
      expect.objectContaining({
        displayName: 'Updated Learner',
        metadata: { locale: 'de' }
      }),
      trxStub
    );
    expect(updated.profile).toEqual(
      expect.objectContaining({
        displayName: 'Updated Learner',
        socialLinks: [{ label: 'Twitter', url: 'https://twitter.com/edulure', handle: null }]
      })
    );
  });
});
