import db from '../config/database.js';

const TABLE = 'qa_manual_checklist_items';

const BASE_COLUMNS = [
  'id',
  'checklist_id as checklistId',
  'item_key as itemKey',
  'label',
  'category',
  'owner_team as ownerTeam',
  'requires_evidence as requiresEvidence',
  'default_status as defaultStatus',
  'automation_type as automationType',
  'display_order as displayOrder',
  'description',
  'evidence_examples as evidenceExamples',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function deserialize(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    checklistId: row.checklistId,
    itemKey: row.itemKey,
    label: row.label,
    category: row.category,
    ownerTeam: row.ownerTeam,
    requiresEvidence: Boolean(row.requiresEvidence),
    defaultStatus: row.defaultStatus,
    automationType: row.automationType ?? null,
    displayOrder: Number.parseInt(row.displayOrder ?? 0, 10) || 0,
    description: row.description ?? null,
    evidenceExamples: parseJson(row.evidenceExamples, []),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export default class QaManualChecklistItemModel {
  static deserialize = deserialize;

  static async listByChecklistId(checklistId, connection = db) {
    if (!checklistId) {
      return [];
    }

    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ checklist_id: checklistId })
      .orderBy([{ column: 'display_order', order: 'asc' }, { column: 'item_key', order: 'asc' }]);

    return rows.map(deserialize);
  }
}
