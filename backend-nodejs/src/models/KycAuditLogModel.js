import db from '../config/database.js';

const BASE_COLUMNS = [
  'kal.id',
  'kal.verification_id as verificationId',
  'kal.actor_id as actorId',
  'kal.action',
  'kal.notes',
  'kal.metadata',
  'kal.created_at as createdAt'
];

export default class KycAuditLogModel {
  static async record(entry, connection = db) {
    const payload = {
      verification_id: entry.verificationId,
      actor_id: entry.actorId ?? null,
      action: entry.action,
      notes: entry.notes ?? null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null
    };

    const [id] = await connection('kyc_audit_logs').insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    return connection('kyc_audit_logs as kal').select(BASE_COLUMNS).where('kal.id', id).first();
  }

  static async listForVerification(verificationId, connection = db) {
    return connection('kyc_audit_logs as kal')
      .leftJoin('users as actor', 'actor.id', 'kal.actor_id')
      .select([
        ...BASE_COLUMNS,
        'actor.first_name as actorFirstName',
        'actor.last_name as actorLastName',
        'actor.email as actorEmail'
      ])
      .where('kal.verification_id', verificationId)
      .orderBy('kal.created_at', 'desc');
  }

  static async listRecent({ limit = 25 } = {}, connection = db) {
    const safeLimit = Math.max(1, Math.min(200, Number.parseInt(limit, 10) || 25));
    return connection('kyc_audit_logs as kal')
      .leftJoin('users as actor', 'actor.id', 'kal.actor_id')
      .select([
        ...BASE_COLUMNS,
        'actor.first_name as actorFirstName',
        'actor.last_name as actorLastName',
        'actor.email as actorEmail'
      ])
      .orderBy('kal.created_at', 'desc')
      .limit(safeLimit);
  }
}
