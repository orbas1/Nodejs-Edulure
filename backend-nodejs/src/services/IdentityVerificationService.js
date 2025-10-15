import Joi from 'joi';

import db from '../config/database.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import KycAuditLogModel from '../models/KycAuditLogModel.js';
import KycDocumentModel from '../models/KycDocumentModel.js';
import KycVerificationModel from '../models/KycVerificationModel.js';
import storageService from './StorageService.js';
import DataEncryptionService from './DataEncryptionService.js';

const REQUIRED_DOCUMENT_TYPES = [
  {
    type: 'government-id-front',
    label: 'Government ID (front)',
    description: 'Upload the front of your passport, national ID, or driver licence.'
  },
  {
    type: 'government-id-back',
    label: 'Government ID (back)',
    description: 'Upload the back of your government-issued document where applicable.'
  },
  {
    type: 'identity-selfie',
    label: 'Selfie with ID',
    description: 'Take a live selfie holding the same document so we can verify liveness.'
  }
];

const REVIEWABLE_STATUSES = new Set(['submitted', 'pending_review', 'resubmission_required']);
const FINAL_STATUSES = new Set(['approved', 'rejected']);

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function parseDateIso(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
}

function parseCsvList(value, fallback = []) {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  const parts = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parts.length ? parts : fallback;
}

function parseJsonEnv(value, fallback) {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    logger.warn({ err: error }, 'Failed to parse GDPR compliance JSON override');
    return fallback;
  }
}

function buildGdprSnapshot({ pending, breakdown, now }) {
  const breaches = pending.filter((item) => item.hasBreachedSla).length;

  const dsarOpenDefault = pending.length + parsePositiveInteger(breakdown.manualReviewQueue, 0);
  const dsarDueSoonDefault = Math.max(0, Math.round(dsarOpenDefault * 0.35));
  const dsarOverdueDefault = Math.max(breaches, Math.round(dsarOpenDefault * 0.1));
  const dsarCompletedDefault = parsePositiveInteger(breakdown.approvalsWithinWindow, 0);

  const dsarConfig = {
    open: parsePositiveInteger(process.env.GDPR_DSAR_OPEN, dsarOpenDefault),
    dueSoon: parsePositiveInteger(process.env.GDPR_DSAR_DUE_SOON, dsarDueSoonDefault),
    overdue: parsePositiveInteger(process.env.GDPR_DSAR_OVERDUE, dsarOverdueDefault),
    completed30d: parsePositiveInteger(
      process.env.GDPR_DSAR_COMPLETED_30D,
      dsarCompletedDefault
    ),
    averageCompletionHours: parsePositiveInteger(
      process.env.GDPR_DSAR_AVG_COMPLETION_HOURS,
      64
    ),
    slaHours: parsePositiveInteger(process.env.GDPR_DSAR_SLA_HOURS, 72),
    owner:
      process.env.GDPR_DATA_PROTECTION_OFFICER ||
      process.env.GDPR_DPO ||
      'Data Protection Officer',
    nextIcoSubmission: parseDateIso(
      process.env.GDPR_NEXT_ICO_SUBMISSION,
      new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    )
  };

  const registersOverride = parseJsonEnv(process.env.GDPR_REGISTERS, null);
  const defaultRegisters = [
    {
      id: 'ropa',
      name: 'Record of Processing Activities',
      owner:
        process.env.GDPR_ROPA_OWNER ||
        process.env.GDPR_DATA_PROTECTION_OFFICER ||
        'Data Protection Officer',
      status: process.env.GDPR_ROPA_STATUS || 'current',
      lastReviewed: parseDateIso(
        process.env.GDPR_ROPA_LAST_REVIEWED,
        new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString()
      ),
      nextReviewDue: parseDateIso(
        process.env.GDPR_ROPA_NEXT_REVIEW,
        new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
      ),
      coverage: parseCsvList(
        process.env.GDPR_ROPA_COVERAGE,
        ['Core platform services', 'Marketing automation', 'Customer support']
      ),
      retentionPolicy:
        process.env.GDPR_ROPA_RETENTION ||
        'Reviewed quarterly and whenever the lawful basis or tooling changes.'
    },
    {
      id: 'retention-schedule',
      name: 'Data retention schedule',
      owner: process.env.GDPR_RETENTION_OWNER || 'Head of Compliance',
      status: process.env.GDPR_RETENTION_STATUS || 'in_review',
      lastReviewed: parseDateIso(
        process.env.GDPR_RETENTION_LAST_REVIEWED,
        new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ),
      nextReviewDue: parseDateIso(
        process.env.GDPR_RETENTION_NEXT_REVIEW,
        new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()
      ),
      coverage: parseCsvList(
        process.env.GDPR_RETENTION_COVERAGE,
        ['Learning analytics', 'Payments', 'Support tickets']
      ),
      retentionPolicy:
        process.env.GDPR_RETENTION_POLICY ||
        'System-enforced retention with automatic anonymisation after SLA expiry.'
    },
    {
      id: 'sub-processor-register',
      name: 'Sub-processor register',
      owner: process.env.GDPR_VENDOR_OWNER || 'Procurement Lead',
      status: process.env.GDPR_VENDOR_STATUS || 'current',
      lastReviewed: parseDateIso(
        process.env.GDPR_VENDOR_LAST_REVIEWED,
        new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString()
      ),
      nextReviewDue: parseDateIso(
        process.env.GDPR_VENDOR_NEXT_REVIEW,
        new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000).toISOString()
      ),
      coverage: parseCsvList(
        process.env.GDPR_VENDOR_COVERAGE,
        ['Cloud hosting', 'Email delivery', 'Identity verification']
      ),
      retentionPolicy:
        process.env.GDPR_VENDOR_POLICY ||
        'Vendors reviewed pre-contract, annually, and on incident notification.'
    }
  ];

  const registers = Array.isArray(registersOverride) && registersOverride.length
    ? registersOverride
    : defaultRegisters;

  const controlsOverride = parseJsonEnv(process.env.GDPR_CONTROLS, null);
  const defaultControls = {
    breachNotifications: {
      status: process.env.GDPR_BREACH_STATUS || 'tested',
      lastTested: parseDateIso(
        process.env.GDPR_BREACH_LAST_TESTED,
        new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString()
      ),
      responseWindowHours: parsePositiveInteger(
        process.env.GDPR_BREACH_RESPONSE_HOURS,
        24
      ),
      playbookOwner: process.env.GDPR_BREACH_OWNER || 'Incident Response Lead'
    },
    dataProtectionImpactAssessments: {
      status: process.env.GDPR_DPIA_STATUS || 'current',
      openItems: parsePositiveInteger(process.env.GDPR_DPIA_OPEN, 0),
      lastCompleted: parseDateIso(
        process.env.GDPR_DPIA_LAST_COMPLETED,
        new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
      ),
      upcomingReviews: parseCsvList(
        process.env.GDPR_DPIA_UPCOMING,
        ['Adaptive curriculum engine', 'Mobile application telemetry']
      )
    },
    training: {
      status: process.env.GDPR_TRAINING_STATUS || 'in_progress',
      completionRate: parsePositiveInteger(process.env.GDPR_TRAINING_COMPLETION, 94),
      overdue: parsePositiveInteger(process.env.GDPR_TRAINING_OVERDUE, 3),
      nextCycleStarts: parseDateIso(
        process.env.GDPR_TRAINING_NEXT_CYCLE,
        new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
      )
    },
    vendorAssessments: {
      status: process.env.GDPR_VENDOR_ASSESS_STATUS || 'current',
      pending: parsePositiveInteger(process.env.GDPR_VENDOR_ASSESS_PENDING, 1),
      lastCompleted: parseDateIso(
        process.env.GDPR_VENDOR_ASSESS_LAST_COMPLETED,
        new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
      )
    },
    encryption: {
      status: process.env.GDPR_ENCRYPTION_STATUS || 'fully_encrypted',
      keyRotationDays: parsePositiveInteger(process.env.GDPR_KEY_ROTATION_DAYS, 90),
      lastAudit: parseDateIso(
        process.env.GDPR_ENCRYPTION_LAST_AUDIT,
        new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
      )
    }
  };

  const controls = controlsOverride && typeof controlsOverride === 'object'
    ? { ...defaultControls, ...controlsOverride }
    : defaultControls;

  const ico = {
    registrationNumber: process.env.GDPR_ICO_REGISTRATION || 'ZB765432',
    status: process.env.GDPR_ICO_STATUS || 'Active',
    feeTier: process.env.GDPR_ICO_FEE_TIER || 'Tier 2 (small organisation)',
    renewalDue: parseDateIso(
      process.env.GDPR_ICO_RENEWAL_DUE,
      new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString()
    ),
    lastSubmitted: parseDateIso(
      process.env.GDPR_ICO_LAST_SUBMITTED,
      new Date(now.getTime() - 185 * 24 * 60 * 60 * 1000).toISOString()
    ),
    publicRegisterUrl:
      process.env.GDPR_ICO_REGISTER_URL ||
      'https://ico.org.uk/ESDWebPages/Search',
    reportingOwner: process.env.GDPR_ICO_OWNER || dsarConfig.owner
  };

  return {
    dsar: dsarConfig,
    registers,
    controls,
    ico
  };
}

const uploadRequestSchema = Joi.object({
  documentType: Joi.string()
    .valid(...REQUIRED_DOCUMENT_TYPES.map((doc) => doc.type))
    .required(),
  fileName: Joi.string().min(3).max(255).required(),
  mimeType: Joi.string().min(3).max(128).required(),
  sizeBytes: Joi.number().integer().positive().max(env.storage.maxUploadBytes).required()
});

const attachDocumentSchema = Joi.object({
  documentType: Joi.string()
    .valid(...REQUIRED_DOCUMENT_TYPES.map((doc) => doc.type))
    .required(),
  storageBucket: Joi.string().min(3).max(128).required(),
  storageKey: Joi.string().min(8).max(255).required(),
  fileName: Joi.string().min(3).max(255).required(),
  mimeType: Joi.string().min(3).max(128).required(),
  sizeBytes: Joi.number().integer().positive().max(env.storage.maxUploadBytes).required(),
  checksumSha256: Joi.string().hex().length(64).required()
});

const reviewSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected', 'resubmission_required').required(),
  riskScore: Joi.number().min(0).max(100).default(0),
  rejectionReason: Joi.when('status', {
    is: Joi.valid('rejected', 'resubmission_required'),
    then: Joi.string().min(5).max(2000).required(),
    otherwise: Joi.string().allow(null).max(2000)
  }),
  escalationLevel: Joi.string().valid('none', 't1', 't2', 't3').default('none'),
  policyReferences: Joi.array().items(Joi.string().min(2).max(120)).default([])
});

function mapDocument(row) {
  if (!row) return null;
  const decrypted = row.documentPayloadCiphertext
    ? DataEncryptionService.decryptStructured(row.documentPayloadCiphertext, row.documentEncryptionKeyVersion)
    : null;
  return {
    id: row.id,
    type: row.documentType,
    status: row.status,
    fileName: decrypted?.fileName ?? row.fileNameMask ?? null,
    mimeType: decrypted?.mimeType ?? row.mimeTypeMask ?? null,
    sizeBytes: Number(decrypted?.sizeBytes ?? row.sizeBytes ?? 0),
    submittedAt: row.submittedAt,
    reviewedAt: row.reviewedAt,
    storageBucket: decrypted?.storageBucket ?? null,
    storageKey: decrypted?.storageKey ?? null,
    checksumSha256: decrypted?.checksumSha256 ?? row.checksumMask ?? null
  };
}

function normaliseDocuments(documents = []) {
  return documents
    .map((doc) => {
      if (!doc) return null;
      if (doc.type && doc.fileName) {
        return doc;
      }
      return mapDocument(doc);
    })
    .filter(Boolean);
}

function mapVerification(row, documents = []) {
  if (!row) return null;
  const policyReferences = (() => {
    if (!row.policyReferences) return [];
    if (Array.isArray(row.policyReferences)) return row.policyReferences;
    try {
      return JSON.parse(row.policyReferences);
    } catch (error) {
      logger.warn({ err: error }, 'Failed to parse policy references for verification');
      return [];
    }
  })();

  const normalisedDocuments = normaliseDocuments(documents);

  const decryptedNotes = row.sensitiveNotesCiphertext
    ? DataEncryptionService.decryptStructured(row.sensitiveNotesCiphertext, row.encryptionKeyVersion)
    : null;

  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    documentsRequired: Number(row.documentsRequired ?? REQUIRED_DOCUMENT_TYPES.length),
    documentsSubmitted: Number(row.documentsSubmitted ?? normalisedDocuments.length),
    riskScore: Number(row.riskScore ?? 0),
    needsManualReview: Boolean(row.needsManualReview),
    escalationLevel: row.escalationLevel ?? 'none',
    lastSubmittedAt: row.lastSubmittedAt,
    lastReviewedAt: row.lastReviewedAt,
    reviewedBy: row.reviewedBy ?? null,
    rejectionReason: decryptedNotes?.rejectionReason ?? row.rejectionReason ?? null,
    policyReferences,
    documents: normalisedDocuments
  };
}

function getOutstandingDocuments(documents) {
  const submittedTypes = new Set(documents.map((doc) => doc.type));
  return REQUIRED_DOCUMENT_TYPES.filter((doc) => !submittedTypes.has(doc.type));
}

function determineNextStatus(currentStatus, hasAllDocuments) {
  if (FINAL_STATUSES.has(currentStatus) && !hasAllDocuments) {
    return 'collecting';
  }
  if (hasAllDocuments) {
    return currentStatus === 'pending_review' ? 'pending_review' : 'submitted';
  }
  return 'collecting';
}

export default class IdentityVerificationService {
  static getRequiredDocuments() {
    return REQUIRED_DOCUMENT_TYPES;
  }

  static async ensureVerification(userId, connection = db) {
    return KycVerificationModel.upsertForUser(userId, connection);
  }

  static async getVerificationSummaryForUser(userId, options = {}) {
    const verification = await this.ensureVerification(userId, options.connection);
    const documents = await KycDocumentModel.listForVerification(verification.id, options.connection);
    const mappedDocuments = documents.map(mapDocument);

    return {
      ...mapVerification(verification, mappedDocuments),
      requiredDocuments: REQUIRED_DOCUMENT_TYPES,
      outstandingDocuments: getOutstandingDocuments(mappedDocuments)
    };
  }

  static async requestUpload(userId, payload) {
    const { value, error } = uploadRequestSchema.validate(payload);
    if (error) {
      const validationError = new Error(`Invalid upload request: ${error.message}`);
      validationError.status = 400;
      throw validationError;
    }

    const verification = await this.ensureVerification(userId);
    const storageKey = storageService.generateStorageKey(`kyc/${verification.reference}`, value.fileName);
    const upload = await storageService.createUploadUrl({
      key: storageKey,
      contentType: value.mimeType,
      contentLength: value.sizeBytes,
      visibility: 'workspace'
    });

    await KycAuditLogModel.record({
      verificationId: verification.id,
      actorId: userId,
      action: 'upload_url_requested',
      metadata: {
        documentType: value.documentType,
        fileName: value.fileName,
        mimeType: value.mimeType,
        sizeBytes: value.sizeBytes,
        storageKey: upload.key,
        storageBucket: upload.bucket
      }
    });

    return {
      verificationReference: verification.reference,
      documentType: value.documentType,
      upload
    };
  }

  static async attachDocument(userId, payload) {
    const { value, error } = attachDocumentSchema.validate(payload);
    if (error) {
      const validationError = new Error(`Invalid document payload: ${error.message}`);
      validationError.status = 400;
      throw validationError;
    }

    return db.transaction(async (trx) => {
      const verification = await this.ensureVerification(userId, trx);

      try {
        await storageService.headObject({ bucket: value.storageBucket, key: value.storageKey });
      } catch (storageError) {
        logger.error({ err: storageError, bucket: value.storageBucket, key: value.storageKey }, 'Missing uploaded KYC object');
        const notFoundError = new Error('Uploaded file not found. Please retry the upload step.');
        notFoundError.status = 404;
        throw notFoundError;
      }

      const document = await KycDocumentModel.upsertDocument(
        verification.id,
        value.documentType,
        {
          status: 'pending',
          storageBucket: value.storageBucket,
          storageKey: value.storageKey,
          fileName: value.fileName,
          mimeType: value.mimeType,
          sizeBytes: value.sizeBytes,
          checksumSha256: value.checksumSha256,
          submittedAt: trx.fn.now()
        },
        trx
      );

      const documents = await KycDocumentModel.listForVerification(verification.id, trx);
      const hasAllDocuments = documents.length >= verification.documentsRequired;
      const nextStatus = determineNextStatus(verification.status, hasAllDocuments);

      const updatedVerification = await KycVerificationModel.update(
        verification.id,
        {
          status: nextStatus,
          documents_submitted: documents.length,
          needs_manual_review: nextStatus !== 'collecting'
        },
        trx
      );

      await KycAuditLogModel.record(
        {
          verificationId: verification.id,
          actorId: userId,
          action: 'document_attached',
          metadata: {
            documentType: value.documentType,
            storageKey: value.storageKey,
            storageBucket: value.storageBucket,
            sizeBytes: value.sizeBytes
          }
        },
        trx
      );

      return {
        verification: mapVerification(updatedVerification, documents),
        document: mapDocument(document)
      };
    });
  }

  static async submitForReview(userId) {
    return db.transaction(async (trx) => {
      const verification = await this.ensureVerification(userId, trx);
      const documents = await KycDocumentModel.listForVerification(verification.id, trx);
      const hasAllDocuments = documents.length >= verification.documentsRequired;
      if (!hasAllDocuments) {
        const error = new Error('Upload all required documents before submitting for review.');
        error.status = 400;
        throw error;
      }

      const nextStatus = 'pending_review';
      const updatedVerification = await KycVerificationModel.update(
        verification.id,
        {
          status: nextStatus,
          documents_submitted: documents.length,
          needs_manual_review: true,
          last_submitted_at: trx.fn.now()
        },
        trx
      );

      await KycAuditLogModel.record(
        {
          verificationId: verification.id,
          actorId: userId,
          action: 'submitted_for_review',
          metadata: {
            documentsSubmitted: documents.length
          }
        },
        trx
      );

      return mapVerification(updatedVerification, documents);
    });
  }

  static async listAuditTrail(verificationId) {
    const rows = await KycAuditLogModel.listForVerification(verificationId);
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      notes: row.notes ?? null,
      actor: row.actorId
        ? {
            id: row.actorId,
            name: [row.actorFirstName, row.actorLastName].filter(Boolean).join(' '),
            email: row.actorEmail
          }
        : null,
      metadata: row.metadata
        ? (() => {
            if (typeof row.metadata === 'object') return row.metadata;
            try {
              return JSON.parse(row.metadata);
            } catch (error) {
              logger.warn({ err: error }, 'Failed to parse audit log metadata');
              return {};
            }
          })()
        : {},
      createdAt: row.createdAt
    }));
  }

  static async reviewVerification(verificationId, reviewerId, payload) {
    const { value, error } = reviewSchema.validate(payload);
    if (error) {
      const validationError = new Error(`Invalid review payload: ${error.message}`);
      validationError.status = 400;
      throw validationError;
    }

    return db.transaction(async (trx) => {
      const verification = await KycVerificationModel.findById(verificationId, trx);
      if (!verification) {
        const notFound = new Error('Verification record not found');
        notFound.status = 404;
        throw notFound;
      }

      if (!REVIEWABLE_STATUSES.has(verification.status) && !FINAL_STATUSES.has(verification.status)) {
        const invalidState = new Error('Verification cannot be reviewed in its current state');
        invalidState.status = 409;
        throw invalidState;
      }

      const encryptedNotes = DataEncryptionService.encryptStructured(
        value.status === 'approved' ? null : { rejectionReason: value.rejectionReason },
        {
          classificationTag: 'kyc.review.notes',
          fingerprintValues: [String(verificationId), value.rejectionReason ?? '']
        }
      );

      const updates = {
        status: value.status,
        risk_score: value.riskScore,
        rejection_reason: null,
        escalation_level: value.escalationLevel,
        reviewed_by: reviewerId,
        last_reviewed_at: trx.fn.now(),
        needs_manual_review: false,
        policy_references: value.policyReferences.length ? JSON.stringify(value.policyReferences) : null,
        sensitive_notes_ciphertext: encryptedNotes.ciphertext,
        sensitive_notes_hash: encryptedNotes.hash,
        sensitive_notes_classification: encryptedNotes.classificationTag,
        encryption_key_version: encryptedNotes.keyId
      };

      const updated = await KycVerificationModel.update(verificationId, updates, trx);
      await KycAuditLogModel.record(
        {
          verificationId,
          actorId: reviewerId,
          action: `review_${value.status}`,
          notes: value.rejectionReason ?? undefined,
          metadata: {
            riskScore: value.riskScore,
            escalationLevel: value.escalationLevel,
            policyReferences: value.policyReferences
          }
        },
        trx
      );

      const documents = await KycDocumentModel.listForVerification(verificationId, trx);

      return mapVerification(updated, documents);
    });
  }

  static async getAdminOverview({ limit = 8, now = new Date() } = {}) {
    const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000);
    const queue = await KycVerificationModel.listQueue({
      statuses: ['pending_review', 'submitted', 'resubmission_required'],
      limit
    });

    const pending = queue.map((row) => {
      const verification = mapVerification(row);
      const submittedAt = row.lastSubmittedAt ?? row.updatedAt;
      const waitingHours = submittedAt ? Math.max(0, (now.getTime() - new Date(submittedAt).getTime()) / (1000 * 60 * 60)) : 0;
      return {
        id: row.id,
        reference: row.reference,
        status: row.status,
        user: {
          id: row.userId,
          name: [row.userFirstName, row.userLastName].filter(Boolean).join(' ') || row.userEmail,
          email: row.userEmail
        },
        riskScore: Number(row.riskScore ?? 0),
        escalationLevel: row.escalationLevel ?? 'none',
        documentsSubmitted: Number(row.documentsSubmitted ?? 0),
        documentsRequired: Number(row.documentsRequired ?? REQUIRED_DOCUMENT_TYPES.length),
        lastSubmittedAt: row.lastSubmittedAt,
        waitingHours: Number(waitingHours.toFixed(1)),
        hasBreachedSla: submittedAt ? new Date(submittedAt) < thirtyHoursAgo : false,
        verification
      };
    });

    const breakdown = await KycVerificationModel.getStatusBreakdown({
      windowStart: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    });

    const counts = Object.fromEntries(
      breakdown.breakdown.map((row) => [row.status, Number(row.total ?? 0)])
    );

    const awaitingDocuments = counts.collecting ?? 0;
    const pendingReview = (counts.submitted ?? 0) + (counts.pending_review ?? 0);
    const resubmissions = counts.resubmission_required ?? 0;

    const slaBreaches = pending.filter((item) => item.hasBreachedSla).length;

    const gdpr = buildGdprSnapshot({ pending, breakdown, now });

    return {
      metrics: [
        {
          id: 'kyc-pending-review',
          label: 'Pending KYC reviews',
          value: String(pendingReview),
          change: `${breakdown.approvalsWithinWindow} approved (30d)`,
          trend: breakdown.approvalsWithinWindow > 0 ? 'up' : 'down'
        },
        {
          id: 'kyc-awaiting-documents',
          label: 'Awaiting documents',
          value: String(awaitingDocuments)
        },
        {
          id: 'kyc-resubmissions',
          label: 'Resubmissions queued',
          value: String(resubmissions)
        }
      ],
      queue: pending,
      slaBreaches,
      manualReviewQueue: breakdown.manualReviewQueue,
      lastGeneratedAt: now.toISOString(),
      gdpr
    };
  }
}
