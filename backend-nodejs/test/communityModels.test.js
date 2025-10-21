import { describe, expect, it } from 'vitest';

import CommunityMessageModel from '../src/models/CommunityMessageModel.js';
import CommunityPostModel from '../src/models/CommunityPostModel.js';
import CommunityResourceModel from '../src/models/CommunityResourceModel.js';
import ContentAssetModel from '../src/models/ContentAssetModel.js';
import ContentAssetEventModel from '../src/models/ContentAssetEventModel.js';

describe('CommunityMessageModel', () => {
  it('sanitises list options with large limits', () => {
    const options = CommunityMessageModel.sanitiseListOptions({ limit: 5000 });
    expect(options.limit).toBe(200);
  });

  it('maps attachments from JSON string to array', () => {
    const record = {
      id: 1,
      communityId: 2,
      channelId: 3,
      authorId: 4,
      messageType: 'text',
      body: 'hello',
      attachments: '["file"]',
      metadata: '{"foo":"bar"}',
      status: 'visible',
      pinned: 0,
      threadRootId: null,
      replyToMessageId: null,
      deliveredAt: null,
      deletedAt: null,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
      authorFirstName: 'Jane',
      authorLastName: 'Doe',
      authorEmail: 'jane@example.com',
      authorRole: 'member'
    };

    const message = CommunityMessageModel.toDomain(record);
    expect(message.attachments).toEqual(['file']);
    expect(message.metadata).toEqual({ foo: 'bar' });
  });
});

describe('CommunityPostModel', () => {
  it('normalises JSON columns and pagination defaults', () => {
    const domain = CommunityPostModel.toDomain({
      id: 10,
      communityId: 22,
      channelId: null,
      authorId: 5,
      postType: 'update',
      title: 'Weekly update',
      body: 'Summary',
      tags: '["alpha","beta"]',
      visibility: 'members',
      status: 'published',
      moderationState: 'clean',
      moderationMetadata: '{"flags":["spam"]}',
      lastModeratedAt: null,
      scheduledAt: null,
      publishedAt: '2024-03-10',
      commentCount: '4',
      reactionSummary: '{"👍":2}',
      metadata: '{"cta":"Read"}',
      createdAt: '2024-03-01',
      updatedAt: '2024-03-02',
      deletedAt: null
    });

    expect(domain.tags).toEqual(['alpha', 'beta']);
    expect(domain.commentCount).toBe(4);
    expect(domain.reactionSummary).toEqual({ '👍': 2 });
    expect(domain.metadata).toEqual({ cta: 'Read' });

    const pagination = CommunityPostModel.sanitisePagination({ page: -1, perPage: 5000 });
    expect(pagination).toEqual({ page: 1, perPage: 100 });
  });
});

describe('CommunityResourceModel', () => {
  it('normalises resource tags and metadata', () => {
    const record = {
      id: 5,
      communityId: 8,
      createdBy: 1,
      title: 'Resource',
      description: null,
      resourceType: 'link',
      assetId: null,
      linkUrl: 'https://example.com',
      classroomReference: null,
      tags: '["guides"]',
      metadata: '{"level":"beginner"}',
      visibility: 'members',
      status: 'published',
      publishedAt: '2024-01-01',
      createdAt: '2023-12-31',
      updatedAt: '2024-01-02',
      deletedAt: null,
      createdByName: 'Jane Doe',
      createdByRole: 'moderator',
      assetPublicId: null,
      assetFilename: null
    };

    const domain = CommunityResourceModel.toDomain(record);
    expect(domain.tags).toEqual(['guides']);
    expect(domain.metadata).toEqual({ level: 'beginner' });
  });

  it('clamps list options to safe values', () => {
    const { limit, offset } = CommunityResourceModel.sanitiseListOptions({ limit: 1000, offset: -5 });
    expect(limit).toBe(100);
    expect(offset).toBe(0);
  });
});

describe('ContentAssetModel', () => {
  it('deserialises metadata safely when invalid JSON is provided', () => {
    const row = {
      id: 1,
      publicId: 'asset_1',
      metadata: '{invalid json',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02'
    };

    const asset = ContentAssetModel.deserialize(row);
    expect(asset.metadata).toEqual({});
  });
});

describe('ContentAssetEventModel', () => {
  it('returns numeric totals from aggregateByEvent', async () => {
    const rows = [{ eventType: 'download', total: '3' }];
    const builder = {
      select() {
        return this;
      },
      count() {
        return this;
      },
      where() {
        return this;
      },
      groupBy() {
        return Promise.resolve(rows);
      }
    };
    const connection = () => builder;

    const result = await ContentAssetEventModel.aggregateByEvent(1, connection);
    expect(result).toEqual([{ eventType: 'download', total: 3 }]);
  });

  it('normalises malformed metadata in latestForAsset', async () => {
    const rows = [
      { id: 1, assetId: 2, userId: 3, eventType: 'view', metadata: '{broken', occurredAt: '2024-01-01' }
    ];
    const builder = {
      select() {
        return this;
      },
      where() {
        return this;
      },
      orderBy() {
        return this;
      },
      limit() {
        return Promise.resolve(rows);
      }
    };
    const connection = () => builder;

    const events = await ContentAssetEventModel.latestForAsset(2, 10, connection);
    expect(events).toHaveLength(1);
    expect(events[0].metadata).toEqual({});
  });
});
