import db from '../config/database.js';

const BASE_COLUMNS = [
  'kd.id',
  'kd.verification_id as verificationId',
  'kd.document_type as documentType',
  'kd.status',
  'kd.storage_bucket as storageBucket',
  'kd.storage_key as storageKey',
  'kd.file_name as fileName',
  'kd.mime_type as mimeType',
  'kd.size_bytes as sizeBytes',
  'kd.checksum_sha256 as checksumSha256',
  'kd.submitted_at as submittedAt',
  'kd.reviewed_at as reviewedAt'
];

export default class KycDocumentModel {
  static async listForVerification(verificationId, connection = db) {
    return connection('kyc_documents as kd')
      .select(BASE_COLUMNS)
      .where('kd.verification_id', verificationId)
      .orderBy('kd.document_type', 'asc');
  }

  static async upsertDocument(verificationId, documentType, payload, connection = db) {
    await connection('kyc_documents')
      .insert({
        verification_id: verificationId,
        document_type: documentType,
        status: payload.status ?? 'pending',
        storage_bucket: payload.storageBucket,
        storage_key: payload.storageKey,
        file_name: payload.fileName,
        mime_type: payload.mimeType,
        size_bytes: payload.sizeBytes,
        checksum_sha256: payload.checksumSha256,
        submitted_at: payload.submittedAt ?? connection.fn.now(),
        reviewed_at: payload.reviewedAt ?? null
      })
      .onConflict(['verification_id', 'document_type'])
      .merge({
        status: payload.status ?? 'pending',
        storage_bucket: payload.storageBucket,
        storage_key: payload.storageKey,
        file_name: payload.fileName,
        mime_type: payload.mimeType,
        size_bytes: payload.sizeBytes,
        checksum_sha256: payload.checksumSha256,
        submitted_at: payload.submittedAt ?? connection.fn.now(),
        reviewed_at: payload.reviewedAt ?? null
      });

    return connection('kyc_documents as kd')
      .select(BASE_COLUMNS)
      .where('kd.verification_id', verificationId)
      .andWhere('kd.document_type', documentType)
      .first();
  }

  static async countByStatus(verificationId, status, connection = db) {
    const row = await connection('kyc_documents')
      .where({ verification_id: verificationId, status })
      .count({ total: '*' })
      .first();
    return Number(row?.total ?? 0);
  }
}
