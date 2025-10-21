import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityMemberAdminService from '../src/services/CommunityMemberAdminService.js';

const databaseMock = vi.hoisted(() => {
  const transactionSpy = vi.fn(async (handler) => handler({}));
  const dbFn = Object.assign(vi.fn(), { transaction: transactionSpy });
  return { dbFn, transactionSpy };
});

const communityModelMock = vi.hoisted(() => ({
  findById: vi.fn(),
  findBySlug: vi.fn()
}));

const memberModelMock = vi.hoisted(() => ({
  findMembership: vi.fn(),
  listByCommunity: vi.fn(),
  ensureMembership: vi.fn(),
  updateRole: vi.fn(),
  updateStatus: vi.fn(),
  updateMetadata: vi.fn(),
  markLeft: vi.fn()
}));

const domainEventMock = vi.hoisted(() => ({
  record: vi.fn()
}));

const userModelMock = vi.hoisted(() => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findByIds: vi.fn()
}));

vi.mock('../src/config/database.js', () => ({
  default: databaseMock.dbFn
}));

vi.mock('../src/models/CommunityModel.js', () => ({
  default: communityModelMock
}));

vi.mock('../src/models/CommunityMemberModel.js', () => ({
  default: memberModelMock
}));

vi.mock('../src/models/DomainEventModel.js', () => ({
  default: domainEventMock
}));

vi.mock('../src/models/UserModel.js', () => ({
  default: userModelMock
}));

describe('CommunityMemberAdminService', () => {
  beforeEach(() => {
    communityModelMock.findById.mockReset();
    communityModelMock.findBySlug.mockReset();

    memberModelMock.findMembership.mockReset();
    memberModelMock.listByCommunity.mockReset();
    memberModelMock.ensureMembership.mockReset();
    memberModelMock.updateRole.mockReset();
    memberModelMock.updateStatus.mockReset();
    memberModelMock.updateMetadata.mockReset();
    memberModelMock.markLeft.mockReset();

    domainEventMock.record.mockReset();

    userModelMock.findById.mockReset();
    userModelMock.findByEmail.mockReset();
    userModelMock.findByIds.mockReset();

    databaseMock.transactionSpy.mockClear();
  });

  it('lists members with hydrated user data and metadata filtering', async () => {
    communityModelMock.findById.mockResolvedValue({ id: 42, slug: 'growth-guild' });
    memberModelMock.findMembership.mockResolvedValue({ userId: 7, status: 'active', role: 'owner' });
    memberModelMock.listByCommunity.mockResolvedValue([
      {
        communityId: 42,
        userId: 99,
        role: 'member',
        status: 'active',
        metadata: { title: 'Growth Hacker', tags: ['growth', 'ops'] }
      },
      {
        communityId: 42,
        userId: 55,
        role: 'member',
        status: 'active',
        metadata: { title: 'Designer', location: 'Remote' }
      }
    ]);
    userModelMock.findByIds.mockResolvedValue([
      { id: 99, email: 'learner@edulure.test', firstName: 'Leah', lastName: 'Growth' },
      { id: 55, email: 'designer@edulure.test', firstName: 'Dana', lastName: 'Lines' }
    ]);

    const members = await CommunityMemberAdminService.listMembers('42', 7, { search: 'growth' }, { actorRole: 'owner' });

    expect(userModelMock.findByIds).toHaveBeenCalledWith([99, 55]);
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({
      userId: 99,
      metadata: { title: 'Growth Hacker', tags: ['growth', 'ops'] },
      user: {
        id: 99,
        email: 'learner@edulure.test',
        name: 'Leah Growth'
      }
    });
  });

  it('creates members with normalised metadata and emits audit events', async () => {
    communityModelMock.findById.mockResolvedValue({ id: 42, slug: 'ops-guild' });
    memberModelMock.findMembership.mockResolvedValue({ userId: 7, status: 'active', role: 'owner' });

    userModelMock.findByEmail.mockResolvedValue({
      id: 99,
      email: 'new@edulure.test',
      firstName: 'Neo',
      lastName: 'Member'
    });
    userModelMock.findByIds.mockResolvedValue([
      { id: 99, email: 'new@edulure.test', firstName: 'Neo', lastName: 'Member' }
    ]);

    const ensuredMembership = {
      communityId: 42,
      userId: 99,
      role: 'member',
      status: 'pending',
      metadata: {}
    };
    const roleUpdated = { ...ensuredMembership, role: 'moderator' };
    const statusUpdated = { ...roleUpdated, status: 'active' };

    memberModelMock.ensureMembership.mockResolvedValue(ensuredMembership);
    memberModelMock.updateRole.mockResolvedValue(roleUpdated);
    memberModelMock.updateStatus.mockResolvedValue(statusUpdated);

    const payload = {
      email: 'new@edulure.test',
      role: 'moderator',
      status: 'active',
      title: 'Operations Analyst',
      tags: ['growth ', ' operations', ''],
      notes: 'Invited via community drive'
    };

    const member = await CommunityMemberAdminService.createMember('42', 7, payload, { actorRole: 'owner' });

    expect(memberModelMock.ensureMembership).toHaveBeenCalledWith(
      42,
      99,
      expect.objectContaining({
        role: 'moderator',
        status: 'active',
        metadata: expect.objectContaining({
          title: 'Operations Analyst',
          tags: ['growth', 'operations'],
          notes: 'Invited via community drive'
        })
      }),
      expect.any(Object)
    );
    expect(memberModelMock.updateMetadata).toHaveBeenCalledWith(
      42,
      99,
      expect.objectContaining({ tags: ['growth', 'operations'] }),
      expect.any(Object)
    );
    expect(domainEventMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'community.member.invited',
        payload: expect.objectContaining({ role: 'moderator', status: 'active' })
      }),
      expect.any(Object)
    );
    expect(member).toMatchObject({
      userId: 99,
      metadata: expect.objectContaining({ tags: ['growth', 'operations'] }),
      user: {
        id: 99,
        email: 'new@edulure.test',
        name: 'Neo Member'
      }
    });
  });

  it('prevents removing community owners and records removals', async () => {
    communityModelMock.findById.mockResolvedValue({ id: 42, slug: 'ops-guild' });
    memberModelMock.findMembership
      .mockResolvedValueOnce({ userId: 7, status: 'active', role: 'owner' })
      .mockResolvedValueOnce({ userId: 88, status: 'active', role: 'owner' });

    await expect(
      CommunityMemberAdminService.removeMember('42', 7, 88, { actorRole: 'owner' })
    ).rejects.toMatchObject({ status: 422 });

    memberModelMock.findMembership
      .mockResolvedValueOnce({ userId: 7, status: 'active', role: 'owner' })
      .mockResolvedValueOnce({ userId: 88, status: 'active', role: 'member' });
    userModelMock.findByIds.mockResolvedValue([
      { id: 88, email: 'departing@edulure.test', firstName: 'Derek', lastName: 'Ops' }
    ]);
    memberModelMock.markLeft.mockResolvedValue({ userId: 88, status: 'removed' });

    const result = await CommunityMemberAdminService.removeMember('42', 7, 88, { actorRole: 'owner' });

    expect(memberModelMock.markLeft).toHaveBeenCalledWith(42, 88, expect.any(Object));
    expect(domainEventMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.member.removed', performedBy: 7 }),
      expect.any(Object)
    );
    expect(result).toMatchObject({
      userId: 88,
      user: {
        id: 88,
        email: 'departing@edulure.test',
        name: 'Derek Ops'
      }
    });
  });
});
