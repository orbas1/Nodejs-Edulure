import db from '../config/database.js';
import { TABLES } from '../database/domains/telemetry.js';
import { buildEnvironmentColumns } from '../utils/environmentContext.js';
import { readJsonColumn, writeJsonColumn } from '../utils/modelUtils.js';

function toDomain(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    environment: {
      key: row.environment_key ?? null,
      name: row.environment_name ?? null,
      tier: row.environment_tier ?? null,
      region: row.environment_region ?? null,
      workspace: row.environment_workspace ?? null
    },
    consentScope: row.consent_scope,
    consentVersion: row.consent_version,
    status: row.status,
    isActive: Boolean(row.is_active),
    recordedAt: row.recorded_at,
    effectiveAt: row.effective_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    recordedBy: row.recorded_by,
    evidence: readJsonColumn(row.evidence, {}),
    metadata: readJsonColumn(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class TelemetryConsentLedgerModel {
  static async findById(id, connection = db) {
    const row = await connection(TABLES.CONSENT_LEDGER).where({ id }).first();
    return toDomain(row);
  }

  static async getActiveConsent(
    { userId, consentScope, tenantId = 'global', environment } = {},
    connection = db
  ) {
    if (!userId || !consentScope) {
      return null;
    }

    const envColumns = buildEnvironmentColumns(environment ?? {});

    const row = await connection(TABLES.CONSENT_LEDGER)
      .where({
        user_id: userId,
        tenant_id: tenantId,
        consent_scope: consentScope,
        is_active: true,
        environment_key: envColumns.environment_key
      })
      .orderBy('effective_at', 'desc')
      .first();

    return toDomain(row);
  }

  static async listActiveConsents({ userId, tenantId = 'global', environment } = {}, connection = db) {
    const envColumns = buildEnvironmentColumns(environment ?? {});
    const query = connection(TABLES.CONSENT_LEDGER).where({
      tenant_id: tenantId,
      is_active: true,
      environment_key: envColumns.environment_key
    });
    if (userId) {
      query.andWhere({ user_id: userId });
    }
    const rows = await query.orderBy('effective_at', 'desc');
    return rows.map(toDomain);
  }

  static async recordDecision(
    {
      userId,
      tenantId = 'global',
      consentScope,
      consentVersion,
      status = 'granted',
      recordedBy,
      evidence = {},
      metadata = {},
      recordedAt = new Date(),
      effectiveAt = recordedAt,
      expiresAt,
      environment
    },
    connection = db
  ) {
    if (!userId || !consentScope || !consentVersion) {
      throw new Error('TelemetryConsentLedgerModel.recordDecision requires userId, consentScope, and consentVersion.');
    }

    return connection.transaction(async (trx) => {
      const envColumns = buildEnvironmentColumns(environment ?? {});
      await trx(TABLES.CONSENT_LEDGER)
        .where({
          user_id: userId,
          tenant_id: tenantId,
          consent_scope: consentScope,
          is_active: true,
          environment_key: envColumns.environment_key
        })
        .update({
          is_active: false,
          revoked_at: trx.fn.now(),
          updated_at: trx.fn.now()
        });

      const insertPayload = {
        user_id: userId,
        tenant_id: tenantId,
        consent_scope: consentScope,
        consent_version: consentVersion,
        status,
        is_active: status === 'granted',
        recorded_at: recordedAt,
        effective_at: effectiveAt,
        expires_at: expiresAt ?? null,
        revoked_at: status === 'revoked' ? recordedAt : status === 'expired' ? recordedAt : null,
        recorded_by: recordedBy ?? null,
        evidence: writeJsonColumn(evidence ?? {}),
        metadata: writeJsonColumn(metadata ?? {}),
        ...envColumns
      };

      const [id] = await trx(TABLES.CONSENT_LEDGER).insert(insertPayload);
      return this.findById(id, trx);
    });
  }
}
