import db from '../config/database.js';

const TABLE = 'field_service_orders';

const BASE_COLUMNS = [
  'orders.id',
  'orders.reference',
  'orders.customer_user_id as customerUserId',
  'orders.provider_id as providerId',
  'orders.status',
  'orders.priority',
  'orders.service_type as serviceType',
  'orders.summary',
  'orders.requested_at as requestedAt',
  'orders.scheduled_for as scheduledFor',
  'orders.eta_minutes as etaMinutes',
  'orders.sla_minutes as slaMinutes',
  'orders.distance_km as distanceKm',
  'orders.location_lat as locationLat',
  'orders.location_lng as locationLng',
  'orders.location_label as locationLabel',
  'orders.address_line_1 as addressLine1',
  'orders.address_line_2 as addressLine2',
  'orders.city',
  'orders.region',
  'orders.postal_code as postalCode',
  'orders.country',
  'orders.metadata',
  'orders.created_at as createdAt',
  'orders.updated_at as updatedAt',
  'customer.first_name as customerFirstName',
  'customer.last_name as customerLastName',
  'customer.email as customerEmail',
  'provider.user_id as providerUserId',
  'provider.name as providerName',
  'provider.email as providerEmail',
  'provider.phone as providerPhone',
  'provider.status as providerStatus',
  'provider.specialties as providerSpecialties',
  'provider.rating as providerRating',
  'provider.last_check_in_at as providerLastCheckInAt',
  'provider.location_lat as providerLocationLat',
  'provider.location_lng as providerLocationLng',
  'provider.location_label as providerLocationLabel',
  'provider.location_updated_at as providerLocationUpdatedAt',
  'provider.metadata as providerMetadata'
];

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value) ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    reference: row.reference,
    customerUserId: row.customerUserId,
    providerId: row.providerId,
    providerUserId: row.providerUserId ?? null,
    status: row.status,
    priority: row.priority,
    serviceType: row.serviceType,
    summary: row.summary,
    requestedAt: row.requestedAt,
    scheduledFor: row.scheduledFor,
    etaMinutes: row.etaMinutes != null ? Number(row.etaMinutes) : null,
    slaMinutes: row.slaMinutes != null ? Number(row.slaMinutes) : null,
    distanceKm: row.distanceKm != null ? Number(row.distanceKm) : null,
    locationLat: row.locationLat != null ? Number(row.locationLat) : null,
    locationLng: row.locationLng != null ? Number(row.locationLng) : null,
    locationLabel: row.locationLabel ?? null,
    addressLine1: row.addressLine1 ?? null,
    addressLine2: row.addressLine2 ?? null,
    city: row.city ?? null,
    region: row.region ?? null,
    postalCode: row.postalCode ?? null,
    country: row.country ?? 'GB',
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    customerFirstName: row.customerFirstName ?? null,
    customerLastName: row.customerLastName ?? null,
    customerEmail: row.customerEmail ?? null,
    providerName: row.providerName ?? null,
    providerEmail: row.providerEmail ?? null,
    providerPhone: row.providerPhone ?? null,
    providerStatus: row.providerStatus ?? null,
    providerSpecialties: parseJson(row.providerSpecialties, []),
    providerRating: row.providerRating != null ? Number(row.providerRating) : null,
    providerLastCheckInAt: row.providerLastCheckInAt ?? null,
    providerLocationLat: row.providerLocationLat != null ? Number(row.providerLocationLat) : null,
    providerLocationLng: row.providerLocationLng != null ? Number(row.providerLocationLng) : null,
    providerLocationLabel: row.providerLocationLabel ?? null,
    providerLocationUpdatedAt: row.providerLocationUpdatedAt ?? null,
    providerMetadata: parseJson(row.providerMetadata, {})
  };
}

function buildBaseQuery(connection = db) {
  return connection(`${TABLE} as orders`)
    .select(BASE_COLUMNS)
    .leftJoin('users as customer', 'customer.id', 'orders.customer_user_id')
    .leftJoin('field_service_providers as provider', 'provider.id', 'orders.provider_id');
}

export default class FieldServiceOrderModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async listForUser(userId, connection = db) {
    if (!userId) return [];
    const rows = await buildBaseQuery(connection)
      .where((builder) => {
        builder.where('orders.customer_user_id', userId).orWhere('provider.user_id', userId);
      })
      .orderBy('orders.created_at', 'desc');
    return rows.map(deserialize);
  }

  static async listByCustomerUserId(userId, connection = db) {
    if (!userId) return [];
    const rows = await buildBaseQuery(connection)
      .where('orders.customer_user_id', userId)
      .orderBy('orders.created_at', 'desc');
    return rows.map(deserialize);
  }

  static async findById(id, connection = db) {
    if (!id) return null;
    const row = await buildBaseQuery(connection).where('orders.id', id).first();
    return deserialize(row);
  }

  static async findByIdForCustomer(userId, id, connection = db) {
    if (!userId || !id) return null;
    const row = await buildBaseQuery(connection)
      .where('orders.id', id)
      .andWhere('orders.customer_user_id', userId)
      .first();
    return deserialize(row);
  }

  static async createAssignment(order, connection = db) {
    const payload = {
      reference: order.reference,
      customer_user_id: order.customerUserId,
      provider_id: order.providerId ?? null,
      status: order.status ?? 'dispatched',
      priority: order.priority ?? 'standard',
      service_type: order.serviceType,
      summary: order.summary ?? null,
      requested_at: order.requestedAt ?? connection.fn.now(),
      scheduled_for: order.scheduledFor ?? null,
      eta_minutes: order.etaMinutes ?? null,
      sla_minutes: order.slaMinutes ?? null,
      distance_km: order.distanceKm ?? null,
      location_lat: order.locationLat ?? 51.509865,
      location_lng: order.locationLng ?? -0.118092,
      location_label: order.locationLabel ?? null,
      address_line_1: order.addressLine1 ?? null,
      address_line_2: order.addressLine2 ?? null,
      city: order.city ?? null,
      region: order.region ?? null,
      postal_code: order.postalCode ?? null,
      country: order.country ?? 'GB',
      metadata: JSON.stringify(order.metadata ?? {})
    };
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    if (!id) return null;
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.serviceType !== undefined) payload.service_type = updates.serviceType;
    if (updates.summary !== undefined) payload.summary = updates.summary;
    if (updates.scheduledFor !== undefined) payload.scheduled_for = updates.scheduledFor;
    if (updates.etaMinutes !== undefined) payload.eta_minutes = updates.etaMinutes;
    if (updates.slaMinutes !== undefined) payload.sla_minutes = updates.slaMinutes;
    if (updates.distanceKm !== undefined) payload.distance_km = updates.distanceKm;
    if (updates.locationLat !== undefined) payload.location_lat = updates.locationLat;
    if (updates.locationLng !== undefined) payload.location_lng = updates.locationLng;
    if (updates.locationLabel !== undefined) payload.location_label = updates.locationLabel;
    if (updates.addressLine1 !== undefined) payload.address_line_1 = updates.addressLine1;
    if (updates.addressLine2 !== undefined) payload.address_line_2 = updates.addressLine2;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.region !== undefined) payload.region = updates.region;
    if (updates.postalCode !== undefined) payload.postal_code = updates.postalCode;
    if (updates.country !== undefined) payload.country = updates.country;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    if (updates.providerId !== undefined) payload.provider_id = updates.providerId;

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE).where({ id }).update(payload);
    return this.findById(id, connection);
  }
}
