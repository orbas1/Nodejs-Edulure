import db from '../config/database.js';
import { safeJsonParse, safeJsonStringify } from '../utils/modelUtils.js';

const TABLE = 'blog_media';

const BASE_COLUMNS = [
  'id',
  'post_id as postId',
  'media_url as mediaUrl',
  'alt_text as altText',
  'media_type as mediaType',
  'display_order as displayOrder',
  'metadata',
  'created_at as createdAt'
];

function serialise(media) {
  return {
    post_id: media.postId,
    media_url: media.mediaUrl,
    alt_text: media.altText ?? null,
    media_type: media.mediaType ?? 'image',
    display_order: media.displayOrder ?? 0,
    metadata: safeJsonStringify(media.metadata)
  };
}

export default class BlogMediaModel {
  static async listForPost(postId, connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ post_id: postId })
      .orderBy('display_order', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static async replaceForPost(postId, mediaEntries = [], connection = db) {
    await connection(TABLE).where({ post_id: postId }).delete();
    if (!mediaEntries.length) return [];
    const payload = mediaEntries.map((entry, index) =>
      serialise({
        postId,
        mediaUrl: entry.mediaUrl,
        altText: entry.altText,
        mediaType: entry.mediaType,
        displayOrder: entry.displayOrder ?? index,
        metadata: entry.metadata
      })
    );
    await connection(TABLE).insert(payload);
    return this.listForPost(postId, connection);
  }

  static deserialize(row) {
    return {
      ...row,
      metadata: safeJsonParse(row.metadata, {})
    };
  }
}
