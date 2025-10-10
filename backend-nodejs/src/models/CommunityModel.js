import { query } from '../config/database.js';

export default class CommunityModel {
  static async listByUser(userId) {
    const [rows] = await query(
      `SELECT c.id, c.name, c.slug, c.description, c.cover_image_url, c.created_at
       FROM communities c
       INNER JOIN community_members cm ON cm.community_id = c.id
       WHERE cm.user_id = ?
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return rows;
  }

  static async create(data) {
    const [result] = await query(
      'INSERT INTO communities (name, slug, description, cover_image_url, owner_id) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.slug, data.description, data.coverImageUrl, data.ownerId]
    );
    return { id: result.insertId, ...data };
  }
}
