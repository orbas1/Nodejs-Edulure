import db from '../config/database.js';
import DataEncryptionService from '../services/DataEncryptionService.js';

const BASE_COLUMNS = [
  'kd.id',
  'kd.verification_id as verificationId',
  'kd.document_type as documentType',
  'kd.status',
  'kd.storage_bucket as storageBucketMask',
  'kd.storage_key as storageKeyMask',
  'kd.file_name as fileNameMask',
  'kd.mime_type as mimeTypeMask',
  'kd.size_bytes as sizeBytes',
  'kd.checksum_sha256 as checksumMask',
  'kd.submitted_at as submittedAt',
  'kd.reviewed_at as reviewedAt',
  'kd.document_payload_ciphertext as documentPayloadCiphertext',
  'kd.document_payload_hash as documentPayloadHash',
  'kd.classification_tag as documentClassificationTag',
  'kd.encryption_key_version as documentEncryptionKeyVersion'
];

function buildSensitiveDocumentPayload(payload) {
  const data = {
    storageBucket: payload.storageBucket ?? null,
    storageKey: payload.storageKey ?? null,
    fileName: payload.fileName ?? null,
    mimeType: payload.mimeType ?? null,
    sizeBytes: payload.sizeBytes ?? null,
    checksumSha256: payload.checksumSha256 ?? null
  };

  const encrypted = DataEncryptionService.encryptStructured(data, {
    classificationTag: 'kyc.document',
    fingerprintValues: [payload.storageKey ?? '', payload.checksumSha256 ?? '']
  });

  return {
    encrypted,
    masked: {
      storage_bucket: data.storageBucket ? 'encrypted' : null,
      storage_key: data.storageKey ? `enc:${DataEncryptionService.hash(data.storageKey).slice(0, 48)}` : null,
      file_name: data.fileName ? 'encrypted' : null,
      mime_type: data.mimeType ? 'encrypted' : null,
      checksum_sha256: data.checksumSha256
        ? DataEncryptionService.hash(data.checksumSha256)
        : DataEncryptionService.hash(`${payload.documentType ?? 'doc'}:${payload.verificationId ?? ''}`)
    }
  };
}

export default class KycDocumentModel {
  static async listForVerification(verificationId, connection = db) {
    return connection('kyc_documents as kd')
      .select(BASE_COLUMNS)
      .where('kd.verification_id', verificationId)
      .orderBy('kd.document_type', 'asc');
  }

  static async upsertDocument(verificationId, documentType, payload, connection = db) {
    const { encrypted, masked } = buildSensitiveDocumentPayload({
      ...payload,
      verificationId,
      documentType
    });

    await connection('kyc_documents')
      .insert({
        verification_id: verificationId,
        document_type: documentType,
        status: payload.status ?? 'pending',
        storage_bucket: masked.storage_bucket ?? 'encrypted',
        storage_key: masked.storage_key ?? `enc:${documentType}`,
        file_name: masked.file_name ?? 'encrypted',
        mime_type: masked.mime_type ?? 'encrypted',
        size_bytes: payload.sizeBytes,
        checksum_sha256: masked.checksum_sha256,
        submitted_at: payload.submittedAt ?? connection.fn.now(),
        reviewed_at: payload.reviewedAt ?? null,
        document_payload_ciphertext: encrypted.ciphertext,
        document_payload_hash: encrypted.hash,
        classification_tag: encrypted.classificationTag,
        encryption_key_version: encrypted.keyId
      })
      .onConflict(['verification_id', 'document_type'])
      .merge({
        status: payload.status ?? 'pending',
        storage_bucket: masked.storage_bucket ?? 'encrypted',
        storage_key: masked.storage_key ?? `enc:${documentType}`,
        file_name: masked.file_name ?? 'encrypted',
        mime_type: masked.mime_type ?? 'encrypted',
        size_bytes: payload.sizeBytes,
        checksum_sha256: masked.checksum_sha256,
        submitted_at: payload.submittedAt ?? connection.fn.now(),
        reviewed_at: payload.reviewedAt ?? null,
        document_payload_ciphertext: encrypted.ciphertext,
        document_payload_hash: encrypted.hash,
        classification_tag: encrypted.classificationTag,
        encryption_key_version: encrypted.keyId
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
