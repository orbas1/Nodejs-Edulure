import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const BASE_COLUMNS = [
  'kv.id',
  'kv.reference',
  'kv.user_id as userId',
  'kv.status',
  'kv.documents_required as documentsRequired',
  'kv.documents_submitted as documentsSubmitted',
  'kv.risk_score as riskScore',
  'kv.needs_manual_review as needsManualReview',
  'kv.escalation_level as escalationLevel',
  'kv.last_submitted_at as lastSubmittedAt',
  'kv.last_reviewed_at as lastReviewedAt',
  'kv.reviewed_by as reviewedBy',
  'kv.rejection_reason as rejectionReason',
  'kv.policy_references as policyReferences',
  'kv.sensitive_notes_ciphertext as sensitiveNotesCiphertext',
  'kv.sensitive_notes_hash as sensitiveNotesHash',
  'kv.sensitive_notes_classification as sensitiveNotesClassification',
  'kv.encryption_key_version as encryptionKeyVersion',
  'kv.created_at as createdAt',
  'kv.updated_at as updatedAt'
];

export default class KycVerificationModel {
  static async findById(id, connection = db) {
    return connection('kyc_verifications as kv').select(BASE_COLUMNS).where('kv.id', id).first();
  }

  static async findByReference(reference, connection = db) {
    return connection('kyc_verifications as kv')
      .select(BASE_COLUMNS)
      .where('kv.reference', reference)
      .first();
  }

  static async findByUserId(userId, connection = db) {
    return connection('kyc_verifications as kv').select(BASE_COLUMNS).where('kv.user_id', userId).first();
  }

  static async createForUser(userId, connection = db) {
    const [id] = await connection('kyc_verifications').insert({
      user_id: userId,
      reference: `kyc_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      status: 'collecting',
      documents_required: 3,
      documents_submitted: 0,
      risk_score: 0,
      needs_manual_review: false,
      escalation_level: 'none'
    });
    return this.findById(id, connection);
  }

  static async upsertForUser(userId, connection = db) {
    const existing = await this.findByUserId(userId, connection);
    if (existing) {
      return existing;
    }
    return this.createForUser(userId, connection);
  }

  static async update(id, updates, connection = db) {
    await connection('kyc_verifications')
      .where({ id })
      .update({ ...updates, updated_at: connection.fn.now() });
    return this.findById(id, connection);
  }

  static async incrementSubmittedDocuments(id, delta, connection = db) {
    await connection('kyc_verifications')
      .where({ id })
      .increment('documents_submitted', delta)
      .update({ updated_at: connection.fn.now() });
    return this.findById(id, connection);
  }

  static async setSubmittedDocuments(id, value, connection = db) {
    await connection('kyc_verifications')
      .where({ id })
      .update({ documents_submitted: value, updated_at: connection.fn.now() });
    return this.findById(id, connection);
  }

  static async listQueue({ statuses, limit = 20, offset = 0, connection = db }) {
    const query = connection('kyc_verifications as kv')
      .innerJoin('users as u', 'u.id', 'kv.user_id')
      .leftJoin('users as reviewer', 'reviewer.id', 'kv.reviewed_by')
      .select([
        ...BASE_COLUMNS,
        'u.first_name as userFirstName',
        'u.last_name as userLastName',
        'u.email as userEmail',
        'reviewer.first_name as reviewerFirstName',
        'reviewer.last_name as reviewerLastName'
      ])
      .orderBy('kv.last_submitted_at', 'asc')
      .limit(limit)
      .offset(offset);

    if (statuses?.length) {
      query.whereIn('kv.status', statuses);
    }

    return query;
  }

  static async getStatusBreakdown({ windowStart, connection = db }) {
    const breakdown = await connection('kyc_verifications as kv')
      .select('kv.status')
      .count({ total: '*' })
      .groupBy('kv.status');

    const approvalsWithinWindow = windowStart
      ? await connection('kyc_verifications as kv')
          .where('kv.status', 'approved')
          .andWhere('kv.last_reviewed_at', '>=', windowStart)
          .count({ total: '*' })
          .first()
      : { total: 0 };

    const manualReviewQueue = await connection('kyc_verifications as kv')
      .where('kv.needs_manual_review', true)
      .andWhere('kv.status', 'pending_review')
      .count({ total: '*' })
      .first();

    return {
      breakdown,
      approvalsWithinWindow: Number(approvalsWithinWindow?.total ?? 0),
      manualReviewQueue: Number(manualReviewQueue?.total ?? 0)
    };
  }
}
