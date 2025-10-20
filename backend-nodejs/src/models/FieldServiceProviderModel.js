import db from '../config/database.js';

const TABLE = 'field_service_providers';

const BASE_COLUMNS = [
  'id',
  'user_id as userId',
  'name',
  'email',
  'phone',
  'status',
  'specialties',
  'rating',
  'last_check_in_at as lastCheckInAt',
  'location_lat as locationLat',
  'location_lng as locationLng',
  'location_label as locationLabel',
  'location_updated_at as locationUpdatedAt',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback = []) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value) ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId ?? null,
    name: row.name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    status: row.status ?? 'active',
    specialties: parseJson(row.specialties, []),
    rating: row.rating != null ? Number(row.rating) : null,
    lastCheckInAt: row.lastCheckInAt ?? null,
    locationLat: row.locationLat != null ? Number(row.locationLat) : null,
    locationLng: row.locationLng != null ? Number(row.locationLng) : null,
    locationLabel: row.locationLabel ?? null,
    locationUpdatedAt: row.locationUpdatedAt ?? null,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export default class FieldServiceProviderModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async listActive(connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereIn('status', ['active'])
      .orderBy('updated_at', 'desc');
    return rows.map(deserialize);
  }

  static async listByIds(ids, connection = db) {
    if (!ids || ids.length === 0) return [];
    const rows = await connection(TABLE).select(BASE_COLUMNS).whereIn('id', ids);
    return rows.map(deserialize);
  }
}
