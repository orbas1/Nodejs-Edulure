import db from '../config/database.js';

export default class CommunityMessageReactionModel {
  static async addReaction({ messageId, userId, emoji }, connection = db) {
    await connection('community_message_reactions')
      .insert({ message_id: messageId, user_id: userId, emoji })
      .onConflict(['message_id', 'user_id', 'emoji'])
      .ignore();
    return this.listForMessages([messageId], connection).then((summary) => summary[messageId] ?? []);
  }

  static async removeReaction({ messageId, userId, emoji }, connection = db) {
    await connection('community_message_reactions')
      .where({ message_id: messageId, user_id: userId, emoji })
      .delete();
    return this.listForMessages([messageId], connection).then((summary) => summary[messageId] ?? []);
  }

  static async listForMessages(messageIds, connection = db) {
    if (!messageIds?.length) return {};
    const rows = await connection('community_message_reactions')
      .select(['message_id as messageId', 'emoji'])
      .count({ count: '*' })
      .whereIn('message_id', messageIds)
      .groupBy('message_id', 'emoji');

    const result = {};
    rows.forEach((row) => {
      if (!result[row.messageId]) {
        result[row.messageId] = [];
      }
      result[row.messageId].push({ emoji: row.emoji, count: Number(row.count) });
    });
    return result;
  }

  static async listUserReactions(messageIds, userId, connection = db) {
    if (!messageIds?.length) return {};
    const rows = await connection('community_message_reactions')
      .select(['message_id as messageId', 'emoji'])
      .whereIn('message_id', messageIds)
      .andWhere('user_id', userId);

    const map = {};
    rows.forEach((row) => {
      if (!map[row.messageId]) {
        map[row.messageId] = new Set();
      }
      map[row.messageId].add(row.emoji);
    });
    return map;
  }
}
