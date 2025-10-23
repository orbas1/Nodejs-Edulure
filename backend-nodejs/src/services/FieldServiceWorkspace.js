import crypto from 'node:crypto';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function safeJsonParse(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function normaliseStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      const parsed = safeJsonParse(trimmed, []);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => String(entry).trim())
          .filter((entry) => entry.length > 0);
      }
    }
    return trimmed
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === 'object') {
    return Object.values(value)
      .map((entry) => String(entry).trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
}

function buildAvatarUrl(email) {
  const hash = crypto.createHash('md5').update(String(email).trim().toLowerCase()).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=160`;
}

function parseDateSafe(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseCoordinate(value) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

function formatDateTime(date, options = {}) {
  const parsed = parseDateSafe(date);
  if (!parsed) return 'Not recorded';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options
    }).format(parsed);
  } catch (_error) {
    return parsed.toISOString();
  }
}

function humanizeRelativeTime(date, referenceDate = new Date()) {
  const parsed = parseDateSafe(date);
  if (!parsed) return 'Unknown';
  const diffMs = referenceDate.getTime() - parsed.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  const diffYears = Math.round(diffDays / 365);
  return `${diffYears}y ago`;
}

function computeBounds(points = []) {
  const valid = points.filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng));
  if (valid.length === 0) {
    return null;
  }
  const latitudes = valid.map((point) => point.lat);
  const longitudes = valid.map((point) => point.lng);
  return {
    minLat: Math.min(...latitudes),
    maxLat: Math.max(...latitudes),
    minLng: Math.min(...longitudes),
    maxLng: Math.max(...longitudes)
  };
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return null;
  }
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const latRad1 = toRadians(lat1);
  const latRad2 = toRadians(lat2);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(latRad1) * Math.cos(latRad2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function normalisePreferenceTags(value) {
  if (!value) {
    return [];
  }
  const list = Array.isArray(value) ? value : String(value).split(',');
  const seen = new Set();
  return list
    .map((entry) => String(entry ?? '').trim())
    .filter((entry) => entry.length > 0)
    .filter((entry) => {
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normaliseUpsellOffers(value, preferenceTags = [], serviceType = 'Field service engagement') {
  if (Array.isArray(value) && value.length) {
    return value
      .map((offer, index) => {
        if (!offer) return null;
        if (typeof offer === 'string') {
          return {
            id: `offer-${index}`,
            title: offer,
            cta: 'View details',
            href: null
          };
        }
        if (typeof offer === 'object') {
          return {
            id: offer.id ?? `offer-${index}`,
            title: offer.title ?? serviceType,
            cta: offer.cta ?? offer.action ?? 'Open',
            href: offer.href ?? offer.url ?? null
          };
        }
        return null;
      })
      .filter(Boolean);
  }
  const recommendations = [];
  if (preferenceTags.includes('training')) {
    recommendations.push({
      id: 'offer-training',
      title: 'Schedule onsite training follow-up',
      cta: 'Book session',
      href: '/dashboard/learner/bookings'
    });
  }
  if (preferenceTags.includes('hardware')) {
    recommendations.push({
      id: 'offer-hardware',
      title: 'Quote replacement hardware bundle',
      cta: 'View packages',
      href: '/dashboard/learner/financial'
    });
  }
  if (!recommendations.length) {
    recommendations.push({
      id: 'offer-survey',
      title: `${serviceType} follow-up survey`,
      cta: 'Send survey',
      href: '/dashboard/learner/support'
    });
  }
  return recommendations;
}

function buildReminderSchedule({ metadata = {}, scheduledFor, now }) {
  const reminders = Array.isArray(metadata.reminders)
    ? metadata.reminders
    : [];

  const baseList = reminders.length
    ? reminders
    : (() => {
        const scheduledDate = parseDateSafe(scheduledFor);
        if (!scheduledDate) {
          return [];
        }
        return [
          {
            id: 'reminder-prep',
            label: 'Pre-visit checklist',
            sendAt: new Date(scheduledDate.getTime() - 60 * 60 * 1000).toISOString()
          },
          {
            id: 'reminder-arrival',
            label: 'Technician arrival confirmation',
            sendAt: scheduledDate.toISOString()
          },
          {
            id: 'reminder-followup',
            label: 'Post-visit satisfaction survey',
            sendAt: new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000).toISOString()
          }
        ];
      })();

  const referenceTime = now instanceof Date ? now : new Date();
  return baseList
    .map((entry, index) => {
      if (!entry) return null;
      const sendAtDate = parseDateSafe(entry.sendAt ?? entry.send_at);
      const sendAt = sendAtDate ? sendAtDate.toISOString() : null;
      return {
        id: entry.id ?? `reminder-${index}`,
        label: entry.label ?? 'Reminder',
        sendAt,
        sendAtLabel: sendAtDate ? formatDateTime(sendAtDate) : null,
        status: sendAtDate && sendAtDate < referenceTime ? 'sent' : 'scheduled'
      };
    })
    .filter((entry) => entry && entry.sendAt);
}

function buildRoutePreview({ provider, location, metadata }) {
  const providerLocation = provider?.location;
  if (!providerLocation || !location) {
    const fallback = metadata?.routePreview;
    if (fallback && typeof fallback === 'object') {
      return {
        distanceKm: fallback.distanceKm ?? null,
        estimatedDurationMinutes: fallback.estimatedDurationMinutes ?? null,
        summary: fallback.summary ?? null,
        departureWindow: fallback.departureWindow ?? null,
        waypoints: Array.isArray(fallback.waypoints) ? fallback.waypoints : []
      };
    }
    return null;
  }

  const distanceKm = haversineDistance(
    providerLocation.lat,
    providerLocation.lng,
    location.lat,
    location.lng
  );
  if (!Number.isFinite(distanceKm)) {
    return null;
  }
  const estimatedDurationMinutes = Math.max(5, Math.round((distanceKm / 38) * 60));
  const summary = `${distanceKm.toFixed(1)} km • ~${estimatedDurationMinutes} min drive`;
  const departureWindow = providerLocation.updatedAt
    ? formatDateTime(providerLocation.updatedAt)
    : null;
  return {
    distanceKm: Number(distanceKm.toFixed(1)),
    estimatedDurationMinutes,
    summary,
    departureWindow,
    waypoints: [
      {
        label: providerLocation.label ?? provider?.name ?? 'Technician',
        lat: providerLocation.lat,
        lng: providerLocation.lng
      },
      {
        label: location.label ?? 'Customer site',
        lat: location.lat,
        lng: location.lng
      }
    ]
  };
}

const FIELD_SERVICE_STATUS_LABELS = {
  pending: 'Pending',
  pending_assignment: 'Pending assignment',
  scheduled: 'Scheduled',
  dispatched: 'Dispatched',
  accepted: 'Accepted',
  en_route: 'En route',
  on_site: 'On site',
  investigating: 'Investigating',
  awaiting_parts: 'Awaiting parts',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
  closed: 'Closed'
};

const FIELD_SERVICE_EVENT_LABELS = {
  dispatch_created: 'Dispatch created',
  technician_en_route: 'Technician en route',
  technician_on_site: 'Technician on site',
  incident_flagged: 'Incident flagged',
  change_control: 'Change control executed',
  quality_assurance: 'Quality assurance',
  provider_assigned: 'Provider assigned',
  customer_update: 'Customer update',
  job_completed: 'Job completed'
};

function normaliseProvider(row, existingMap) {
  if (!row.providerId) return null;
  const providerId = Number(row.providerId);
  if (!Number.isFinite(providerId)) return null;
  const existing = existingMap.get(providerId);
  if (existing) {
    return existing;
  }
  const metadata = safeJsonParse(row.providerMetadata, {});
  const specialtiesRaw = row.providerSpecialties ?? metadata.specialties ?? [];
  const specialties = Array.isArray(specialtiesRaw)
    ? specialtiesRaw.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0)
    : normaliseStringArray(specialtiesRaw);
  const provider = {
    id: providerId,
    userId: row.providerUserId ? Number(row.providerUserId) : null,
    name: row.providerName ?? `Provider ${providerId}`,
    email: row.providerEmail ?? null,
    phone: row.providerPhone ?? null,
    status: row.providerStatus ?? 'active',
    rating: row.providerRating != null ? Number(row.providerRating) : null,
    specialties,
    lastCheckInAt: parseDateSafe(row.providerLastCheckInAt),
    location: {
      label: row.providerLocationLabel ?? metadata.locationLabel ?? null,
      lat: parseCoordinate(row.providerLocationLat),
      lng: parseCoordinate(row.providerLocationLng),
      updatedAt: parseDateSafe(row.providerLocationUpdatedAt)
    },
    metadata,
    avatar: row.providerEmail ? buildAvatarUrl(row.providerEmail) : null
  };
  existingMap.set(providerId, provider);
  return provider;
}

function buildFieldServiceWorkspace({ now, user, orders = [], events = [], providers = [] } = {}) {
  const safeNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();

  const providerMap = new Map();
  const providersNormalised = providers.map((row) => {
    const metadata = safeJsonParse(row.metadata, {});
    const specialtiesRaw = row.specialties ?? metadata.specialties ?? [];
    const specialties = Array.isArray(specialtiesRaw)
      ? specialtiesRaw.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0)
      : normaliseStringArray(specialtiesRaw);
    const location = {
      label: row.locationLabel ?? metadata.locationLabel ?? null,
      lat: parseCoordinate(row.locationLat),
      lng: parseCoordinate(row.locationLng),
      updatedAt: parseDateSafe(row.locationUpdatedAt)
    };
    const provider = {
      id: Number(row.id),
      userId: row.userId ? Number(row.userId) : null,
      name: row.name ?? `Provider ${row.id}`,
      email: row.email ?? null,
      phone: row.phone ?? null,
      status: row.status ?? 'active',
      rating: row.rating != null ? Number(row.rating) : null,
      specialties,
      lastCheckInAt: parseDateSafe(row.lastCheckInAt),
      location,
      metadata,
      avatar: row.email ? buildAvatarUrl(row.email) : null
    };
    if (Number.isFinite(provider.id)) {
      providerMap.set(provider.id, provider);
    }
    return provider;
  });

  const eventsByOrder = new Map();
  events.forEach((row) => {
    const orderId = Number(row.orderId ?? row.order_id);
    if (!Number.isFinite(orderId)) return;
    const metadata = safeJsonParse(row.metadata, {});
    const occurredAt = parseDateSafe(row.occurredAt ?? row.occurred_at);
    const type = String(row.eventType ?? row.event_type ?? '').toLowerCase();
    const status = row.status ? String(row.status).toLowerCase() : null;
    const normalised = {
      id: Number(row.id),
      orderId,
      type,
      status,
      notes: row.notes ?? '',
      author: row.author ?? null,
      occurredAt,
      metadata
    };
    const list = eventsByOrder.get(orderId) ?? [];
    list.push(normalised);
    eventsByOrder.set(orderId, list);
  });
  eventsByOrder.forEach((list) => {
    list.sort((a, b) => {
      const aTime = a.occurredAt ? a.occurredAt.getTime() : 0;
      const bTime = b.occurredAt ? b.occurredAt.getTime() : 0;
      return aTime - bTime;
    });
  });

  const ordersNormalised = orders
    .map((row) => {
      const orderId = Number(row.id ?? row.orderId);
      if (!Number.isFinite(orderId)) return null;
      const metadata = safeJsonParse(row.metadata, {});
      const requestedAt = parseDateSafe(row.requestedAt ?? row.requested_at);
      const scheduledFor = parseDateSafe(row.scheduledFor ?? row.scheduled_for);
      const provider = normaliseProvider({
        providerId: row.providerId,
        providerUserId: row.providerUserId,
        providerName: row.providerName,
        providerEmail: row.providerEmail,
        providerPhone: row.providerPhone,
        providerStatus: row.providerStatus,
        providerSpecialties: row.providerSpecialties,
        providerRating: row.providerRating,
        providerLastCheckInAt: row.providerLastCheckInAt,
        providerLocationLat: row.providerLocationLat,
        providerLocationLng: row.providerLocationLng,
        providerLocationLabel: row.providerLocationLabel,
        providerLocationUpdatedAt: row.providerLocationUpdatedAt,
        providerMetadata: row.providerMetadata
      }, providerMap);
      const timeline = eventsByOrder.get(orderId) ?? [];
      const eventTimeline = timeline.map((event) => {
        const typeKey = event.type || 'update';
        const label = FIELD_SERVICE_EVENT_LABELS[typeKey] ?? typeKey.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
        const timestamp = event.occurredAt
          ? formatDateTime(event.occurredAt, { dateStyle: 'medium', timeStyle: 'short' })
          : 'Not recorded';
        const relativeTime = event.occurredAt ? humanizeRelativeTime(event.occurredAt, safeNow) : 'Unknown';
        const severity = event.metadata?.severity ?? event.metadata?.riskLevel ?? null;
        const isIncident = Boolean(event.metadata?.isIncident) || typeKey.includes('incident') || (severity ?? '').toLowerCase() === 'high';
        return {
          ...event,
          label,
          timestamp,
          relativeTime,
          severity,
          isIncident
        };
      });
      const statusRaw = String(row.status ?? '').toLowerCase();
      const fallbackStatus = eventTimeline.length ? eventTimeline[eventTimeline.length - 1]?.status ?? null : null;
      const status = (statusRaw || fallbackStatus || 'pending').replace(/[^a-z_]/g, '_');
      const statusLabel = FIELD_SERVICE_STATUS_LABELS[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
      const location = {
        label: row.locationLabel ?? metadata.locationLabel ?? null,
        lat: parseCoordinate(row.locationLat),
        lng: parseCoordinate(row.locationLng),
        address: {
          line1: row.addressLine1 ?? null,
          line2: row.addressLine2 ?? null,
          city: row.city ?? null,
          region: row.region ?? null,
          postalCode: row.postalCode ?? null,
          country: row.country ?? 'GB'
        }
      };
      const customerId = Number(row.customerUserId ?? row.customer_user_id ?? 0) || null;
      const customerName = `${row.customerFirstName ?? ''} ${row.customerLastName ?? ''}`.trim();
      const customer = {
        id: customerId,
        name: customerName || row.customerEmail || 'Service requester',
        email: row.customerEmail ?? null
      };
      const lastTimelineEvent = eventTimeline.length ? eventTimeline[eventTimeline.length - 1] : null;
      const etaMinutes = row.etaMinutes != null ? Number(row.etaMinutes) : lastTimelineEvent?.metadata?.etaMinutes ?? null;
      const slaMinutes = row.slaMinutes != null ? Number(row.slaMinutes) : metadata.slaMinutes ?? null;
      const distanceKm = row.distanceKm != null ? Number(row.distanceKm) : lastTimelineEvent?.metadata?.distanceKm ?? null;
      const lastUpdate = lastTimelineEvent?.occurredAt ?? parseDateSafe(row.updatedAt ?? row.updated_at) ?? requestedAt;
      const completionEvent = eventTimeline.find((event) => event.status === 'completed' || event.type === 'job_completed');
      const completedAt = completionEvent?.occurredAt ?? (status === 'completed' ? lastUpdate : null);
      const elapsedMinutes = requestedAt ? Math.max(0, Math.round((safeNow.getTime() - requestedAt.getTime()) / 60000)) : null;
      const resolutionMinutes = completedAt && requestedAt ? Math.max(0, Math.round((completedAt.getTime() - requestedAt.getTime()) / 60000)) : null;
      const incidents = eventTimeline.filter((event) => event.isIncident);
      const hasCriticalIncident = incidents.some((event) => (event.severity ?? '').toLowerCase() === 'high');
      let riskLevel = metadata.riskLevel ?? 'on_track';
      if (hasCriticalIncident) {
        riskLevel = 'critical';
      }
      if (!['completed', 'cancelled'].includes(status)) {
        if (slaMinutes && elapsedMinutes !== null) {
          if (elapsedMinutes >= slaMinutes) {
            riskLevel = 'critical';
          } else if (elapsedMinutes >= Math.round(slaMinutes * 0.75) && riskLevel !== 'critical') {
            riskLevel = riskLevel === 'critical' ? 'critical' : 'warning';
          }
        }
      } else {
        riskLevel = status === 'completed' ? 'closed' : 'cancelled';
      }
      const slaBreached = !['completed', 'cancelled'].includes(status) && slaMinutes && elapsedMinutes !== null && elapsedMinutes > slaMinutes;
      const preferenceTags = normalisePreferenceTags(metadata.preferenceTags);
      const upsellOffers = normaliseUpsellOffers(metadata.upsellOffers, preferenceTags, row.serviceType ?? 'Field service request');
      const reminderSchedule = buildReminderSchedule({ metadata, scheduledFor, now: safeNow });
      const routePreview = buildRoutePreview({ provider, location, metadata });
      const nextAction = (() => {
        if (['completed', 'cancelled'].includes(status)) {
          return 'Review service report';
        }
        if (status === 'pending_assignment') {
          return 'Assign a provider';
        }
        if (status === 'scheduled') {
          return 'Confirm access instructions';
        }
        if (status === 'en_route') {
          return etaMinutes ? `Technician arriving in ${etaMinutes} minutes` : 'Monitor technician arrival';
        }
        if (status === 'on_site') {
          return 'Validate completion checklist';
        }
        if (status === 'investigating') {
          return 'Coordinate incident response';
        }
        return 'Monitor service progression';
      })();
      return {
        id: orderId,
        reference: row.reference ?? `FS-${orderId}`,
        customerUserId: customerId,
        providerId: row.providerId ? Number(row.providerId) : null,
        providerUserId: row.providerUserId ? Number(row.providerUserId) : provider?.userId ?? null,
        status,
        statusLabel,
        priority: row.priority ?? 'standard',
        serviceType: row.serviceType ?? 'Field service request',
        summary: row.summary ?? metadata.summary ?? '',
        requestedAt,
        scheduledFor,
        etaMinutes,
        slaMinutes,
        distanceKm,
        location,
        customer,
        provider,
        metadata,
        preferences: {
          tags: preferenceTags,
          followUpChannel: metadata.followUpChannel ?? metadata.supportChannel ?? null
        },
        upsellOffers,
        reminders: reminderSchedule,
        routePreview,
        timeline: eventTimeline,
        incidents: incidents.map((event) => ({
          id: `${orderId}-${event.id}`,
          eventId: event.id,
          occurredAt: event.occurredAt,
          timestamp: event.timestamp,
          relativeTime: event.relativeTime,
          severity: (event.severity ?? (riskLevel === 'critical' ? 'high' : 'medium')).toString(),
          notes: event.notes,
          status: event.status ?? 'investigating',
          author: event.author ?? provider?.name ?? 'Operations desk'
        })),
        lastUpdate,
        completedAt,
        riskLevel,
        slaBreached,
        nextAction,
        metrics: {
          elapsedMinutes,
          resolutionMinutes,
          onTime: completedAt && slaMinutes ? (resolutionMinutes !== null ? resolutionMinutes <= slaMinutes : false) : null
        }
      };
    })
    .filter(Boolean);

  const providerMetrics = new Map();
  ordersNormalised.forEach((order) => {
    if (!order?.providerId) return;
    const entry = providerMetrics.get(order.providerId) ?? {
      total: 0,
      active: 0,
      completed: 0,
      onTime: 0,
      incidents: 0,
      etaTotal: 0,
      etaCount: 0,
      resolutionTotal: 0,
      resolutionCount: 0,
      last30Days: 0
    };
    entry.total += 1;
    if (!['completed', 'cancelled'].includes(order.status)) {
      entry.active += 1;
    } else if (order.status === 'completed') {
      entry.completed += 1;
      if (order.metrics?.onTime) {
        entry.onTime += 1;
      }
    }
    entry.incidents += order.incidents.length;
    if (order.etaMinutes != null) {
      entry.etaTotal += Number(order.etaMinutes);
      entry.etaCount += 1;
    }
    if (order.metrics?.resolutionMinutes != null) {
      entry.resolutionTotal += Number(order.metrics.resolutionMinutes);
      entry.resolutionCount += 1;
    }
    if (order.requestedAt && order.requestedAt >= new Date(safeNow.getTime() - 30 * DAY_IN_MS)) {
      entry.last30Days += 1;
    }
    providerMetrics.set(order.providerId, entry);
  });

  const providerSummariesMap = new Map();
  providerMetrics.forEach((metrics, providerId) => {
    const provider = providerMap.get(providerId) ?? null;
    const averageEta = metrics.etaCount > 0 ? Math.round(metrics.etaTotal / metrics.etaCount) : null;
    const averageResolution = metrics.resolutionCount > 0 ? Math.round(metrics.resolutionTotal / metrics.resolutionCount) : null;
    const onTimeRate = metrics.completed > 0 ? Math.round((metrics.onTime / metrics.completed) * 100) : null;
    providerSummariesMap.set(providerId, {
      id: providerId,
      userId: provider?.userId ?? null,
      name: provider?.name ?? `Provider ${providerId}`,
      email: provider?.email ?? null,
      phone: provider?.phone ?? null,
      status: provider?.status ?? 'active',
      rating: provider?.rating ?? null,
      specialties: provider?.specialties ?? [],
      avatar: provider?.avatar ?? (provider?.email ? buildAvatarUrl(provider.email) : null),
      location: provider?.location
        ? {
            label: provider.location.label,
            lat: provider.location.lat,
            lng: provider.location.lng,
            updatedAt: provider.location.updatedAt ? provider.location.updatedAt.toISOString() : null,
            relative: provider.location.updatedAt ? humanizeRelativeTime(provider.location.updatedAt, safeNow) : null
          }
        : null,
      lastCheckInAt: provider?.lastCheckInAt ? provider.lastCheckInAt.toISOString() : null,
      lastCheckInRelative: provider?.lastCheckInAt ? humanizeRelativeTime(provider.lastCheckInAt, safeNow) : null,
      metrics: {
        totalAssignments: metrics.total,
        activeAssignments: metrics.active,
        completedAssignments: metrics.completed,
        assignments30d: metrics.last30Days,
        incidentCount: metrics.incidents,
        averageEtaMinutes: averageEta,
        averageResolutionMinutes: averageResolution,
        onTimeRate
      }
    });
  });

  providersNormalised.forEach((provider) => {
    if (!Number.isFinite(provider.id)) return;
    if (providerSummariesMap.has(provider.id)) return;
    providerSummariesMap.set(provider.id, {
      id: provider.id,
      userId: provider.userId,
      name: provider.name,
      email: provider.email,
      phone: provider.phone,
      status: provider.status,
      rating: provider.rating,
      specialties: provider.specialties,
      avatar: provider.avatar ?? (provider.email ? buildAvatarUrl(provider.email) : null),
      location: provider.location
        ? {
            label: provider.location.label,
            lat: provider.location.lat,
            lng: provider.location.lng,
            updatedAt: provider.location.updatedAt ? provider.location.updatedAt.toISOString() : null,
            relative: provider.location.updatedAt ? humanizeRelativeTime(provider.location.updatedAt, safeNow) : null
          }
        : null,
      lastCheckInAt: provider.lastCheckInAt ? provider.lastCheckInAt.toISOString() : null,
      lastCheckInRelative: provider.lastCheckInAt ? humanizeRelativeTime(provider.lastCheckInAt, safeNow) : null,
      metrics: {
        totalAssignments: 0,
        activeAssignments: 0,
        completedAssignments: 0,
        assignments30d: 0,
        incidentCount: 0,
        averageEtaMinutes: null,
        averageResolutionMinutes: null,
        onTimeRate: null
      }
    });
  });

  const providerSummaries = Array.from(providerSummariesMap.values());

  function buildSummary(orderList) {
    if (!orderList.length) {
      return {
        totals: { total: 0, active: 0, completed: 0, incidents: 0, slaBreaches: 0 },
        averages: { etaMinutes: null, resolutionMinutes: null },
        performance: { onTimeRate: null },
        cards: [
          { key: 'active', label: 'Active services', value: '0', hint: 'All clear', tone: 'success' },
          { key: 'eta', label: 'Average ETA', value: '—', hint: 'No live jobs', tone: 'muted' },
          { key: 'onTime', label: 'On-time rate', value: '—', hint: 'No completions yet', tone: 'muted' },
          { key: 'incidents', label: 'Incident queue', value: '0', hint: 'No incidents', tone: 'success' }
        ],
        updatedAt: safeNow.toISOString()
      };
    }
    const totals = { total: orderList.length, active: 0, completed: 0, incidents: 0, slaBreaches: 0 };
    let etaAccumulator = 0;
    let etaCount = 0;
    let resolutionAccumulator = 0;
    let resolutionCount = 0;
    let onTimeCount = 0;
    orderList.forEach((order) => {
      if (!['completed', 'cancelled'].includes(order.status)) {
        totals.active += 1;
      } else if (order.status === 'completed') {
        totals.completed += 1;
      }
      totals.incidents += order.incidents.length;
      if (order.slaBreached) {
        totals.slaBreaches += 1;
      }
      if (order.etaMinutes != null) {
        etaAccumulator += Number(order.etaMinutes);
        etaCount += 1;
      }
      if (order.metrics?.resolutionMinutes != null) {
        resolutionAccumulator += Number(order.metrics.resolutionMinutes);
        resolutionCount += 1;
      }
      if (order.metrics?.onTime) {
        onTimeCount += 1;
      }
    });
    const averageEta = etaCount > 0 ? Math.round(etaAccumulator / etaCount) : null;
    const averageResolution = resolutionCount > 0 ? Math.round(resolutionAccumulator / resolutionCount) : null;
    const onTimeRate = totals.completed > 0 ? Math.round((onTimeCount / totals.completed) * 100) : null;
    const criticalIncidents = orderList.reduce(
      (count, order) =>
        count + order.incidents.filter((incident) => (incident.severity ?? '').toLowerCase() === 'high').length,
      0
    );
    const cards = [
      {
        key: 'active',
        label: 'Active services',
        value: `${totals.active}`,
        hint: `${totals.total} total`,
        tone: totals.active > 0 ? 'primary' : 'muted'
      },
      {
        key: 'eta',
        label: 'Average ETA',
        value: averageEta !== null ? `${averageEta} min` : '—',
        hint: etaCount > 0 ? 'Across en route jobs' : 'No active routes',
        tone: averageEta !== null && averageEta <= 25 ? 'success' : 'info'
      },
      {
        key: 'onTime',
        label: 'On-time rate',
        value: onTimeRate !== null ? `${onTimeRate}%` : '—',
        hint: totals.completed > 0 ? `${totals.completed} completed` : 'Awaiting completions',
        tone: onTimeRate === null ? 'muted' : onTimeRate >= 90 ? 'success' : onTimeRate >= 70 ? 'warning' : 'critical'
      },
      {
        key: 'incidents',
        label: 'Incident queue',
        value: `${totals.incidents}`,
        hint: criticalIncidents > 0 ? `${criticalIncidents} critical` : 'Monitoring stability',
        tone: criticalIncidents > 0 ? 'critical' : totals.incidents > 0 ? 'warning' : 'success'
      }
    ];
    return {
      totals: {
        total: totals.total,
        active: totals.active,
        completed: totals.completed,
        incidents: totals.incidents,
        slaBreaches: totals.slaBreaches
      },
      averages: {
        etaMinutes: averageEta,
        resolutionMinutes: averageResolution
      },
      performance: {
        onTimeRate
      },
      cards,
      updatedAt: safeNow.toISOString()
    };
  }

  function buildTimeline(orderList) {
    const items = [];
    orderList.forEach((order) => {
      order.timeline.forEach((event) => {
        items.push({
          id: `${order.id}-${event.id}`,
          orderId: order.id,
          orderReference: order.reference,
          serviceType: order.serviceType,
          status: event.status ?? 'update',
          label: event.label,
          timestamp: event.timestamp,
          occurredAt: event.occurredAt ? event.occurredAt.toISOString() : null,
          relativeTime: event.relativeTime,
          notes: event.notes,
          author: event.author ?? order.provider?.name ?? 'Operations desk',
          isIncident: event.isIncident,
          severity: event.severity ?? null,
          metadata: event.metadata ?? {}
        });
      });
    });
    return items
      .sort((a, b) => {
        const aTime = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
        const bTime = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 40);
  }

  function buildIncidents(orderList) {
    const incidents = [];
    orderList.forEach((order) => {
      order.incidents.forEach((incident) => {
        incidents.push({
          id: incident.id,
          orderId: order.id,
          orderReference: order.reference,
          serviceType: order.serviceType,
          severity: incident.severity,
          occurredAt: incident.occurredAt ? incident.occurredAt.toISOString() : null,
          timestamp: incident.timestamp,
          relativeTime: incident.relativeTime,
          notes: incident.notes,
          status: incident.status,
          owner: incident.author,
          nextAction: order.nextAction
        });
      });
    });
    return incidents.sort((a, b) => {
      const aTime = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
      const bTime = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  function buildMap(assignments) {
    const points = [];
    const items = assignments.map((assignment) => {
      const customerPoint = assignment.location?.lat != null && assignment.location?.lng != null
        ? {
            lat: assignment.location.lat,
            lng: assignment.location.lng,
            label: assignment.location.label ?? assignment.reference
          }
        : null;
      if (customerPoint) {
        points.push(customerPoint);
      }
      const providerPoint = assignment.provider?.location?.lat != null && assignment.provider?.location?.lng != null
        ? {
            lat: assignment.provider.location.lat,
            lng: assignment.provider.location.lng,
            label: assignment.provider.name
          }
        : null;
      if (providerPoint) {
        points.push(providerPoint);
      }
      return {
        orderId: assignment.id,
        reference: assignment.reference,
        status: assignment.status,
        priority: assignment.priority,
        etaMinutes: assignment.etaMinutes,
        riskLevel: assignment.riskLevel,
        customer: customerPoint,
        provider: providerPoint,
        path:
          customerPoint && providerPoint
            ? [
                [providerPoint.lng, providerPoint.lat],
                [customerPoint.lng, customerPoint.lat]
              ]
            : []
      };
    });
    const bounds = computeBounds(points);
    const center = bounds
      ? {
          lat: (bounds.minLat + bounds.maxLat) / 2,
          lng: (bounds.minLng + bounds.maxLng) / 2
        }
      : { lat: 51.509865, lng: -0.118092 };
    return {
      center,
      bounds,
      assignments: items
    };
  }

  function createWorkspace(scope, orderList) {
    const summary = buildSummary(orderList);
    const timeline = buildTimeline(orderList);
    const incidents = buildIncidents(orderList);
    const assignments = orderList.map((order) => ({
      id: order.id,
      reference: order.reference,
      status: order.status,
      statusLabel: order.statusLabel,
      priority: order.priority,
      serviceType: order.serviceType,
      summary: order.summary,
      requestedAt: order.requestedAt ? order.requestedAt.toISOString() : null,
      requestedAtLabel: order.requestedAt ? formatDateTime(order.requestedAt, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded',
      scheduledFor: order.scheduledFor ? order.scheduledFor.toISOString() : null,
      scheduledForLabel: order.scheduledFor ? formatDateTime(order.scheduledFor, { dateStyle: 'medium', timeStyle: 'short' }) : 'Pending confirmation',
      etaMinutes: order.etaMinutes,
      slaMinutes: order.slaMinutes,
      distanceKm: order.distanceKm != null && Number.isFinite(order.distanceKm) ? Number(order.distanceKm.toFixed(1)) : null,
      riskLevel: order.riskLevel,
      slaBreached: order.slaBreached,
      nextAction: order.nextAction,
      lastUpdate: order.lastUpdate ? order.lastUpdate.toISOString() : null,
      lastUpdateLabel: order.lastUpdate ? humanizeRelativeTime(order.lastUpdate, safeNow) : 'Unknown',
      metrics: order.metrics,
      supportChannel: order.metadata?.supportChannel ?? null,
      briefUrl: order.metadata?.briefUrl ?? null,
      fieldNotes: order.metadata?.fieldNotes ?? null,
      equipment: order.metadata?.equipment ?? null,
      attachments: Array.isArray(order.metadata?.attachments) ? order.metadata.attachments : [],
      debriefHost: order.metadata?.debriefHost ?? order.metadata?.owner ?? null,
      debriefAt: order.metadata?.debriefAt ?? null,
      debriefAtLabel: order.metadata?.debriefAt ? formatDateTime(order.metadata.debriefAt) : null,
      preferences: order.preferences,
      upsellOffers: order.upsellOffers,
      reminders: order.reminders,
      routePreview: order.routePreview,
      location: {
        ...order.location,
        lat: order.location.lat,
        lng: order.location.lng
      },
      customer: order.customer,
      provider: order.provider
        ? {
            id: order.provider.id,
            userId: order.provider.userId,
            name: order.provider.name,
            email: order.provider.email,
            phone: order.provider.phone,
            status: order.provider.status,
            rating: order.provider.rating,
            specialties: order.provider.specialties,
            avatar: order.provider.avatar,
            location: order.provider.location
              ? {
                  label: order.provider.location.label,
                  lat: order.provider.location.lat,
                  lng: order.provider.location.lng,
                  updatedAt: order.provider.location.updatedAt ? order.provider.location.updatedAt.toISOString() : null,
                  relative: order.provider.location.updatedAt ? humanizeRelativeTime(order.provider.location.updatedAt, safeNow) : null
                }
              : null,
            lastCheckInAt: order.provider.lastCheckInAt ? order.provider.lastCheckInAt.toISOString() : null,
            lastCheckInRelative: order.provider.lastCheckInAt ? humanizeRelativeTime(order.provider.lastCheckInAt, safeNow) : null
          }
        : null,
      timeline: order.timeline.map((event) => ({
        id: event.id,
        type: event.type,
        label: event.label,
        status: event.status,
        timestamp: event.timestamp,
        occurredAt: event.occurredAt ? event.occurredAt.toISOString() : null,
        relativeTime: event.relativeTime,
        notes: event.notes,
        author: event.author,
        isIncident: event.isIncident,
        severity: event.severity ?? null
      }))
    }));

    const providerIds = new Set(assignments.map((assignment) => assignment.provider?.id).filter(Boolean));
    const providersForScope = providerSummaries.filter((provider) => {
      if (scope === 'provider' && provider.userId === user.id) {
        return true;
      }
      return providerIds.has(provider.id);
    });

    const map = buildMap(assignments);

    return {
      scope,
      summary,
      assignments,
      timeline,
      incidents,
      providers: providersForScope,
      map,
      lastUpdated: safeNow.toISOString()
    };
  }

  const customerOrders = ordersNormalised.filter((order) => order.customerUserId === user.id);
  const providerOrders = ordersNormalised.filter((order) => order.providerUserId === user.id);

  const customerWorkspace = createWorkspace('customer', customerOrders);
  const providerWorkspace = createWorkspace('provider', providerOrders);

  const searchIndex = [];
  if (customerWorkspace.assignments.length) {
    customerWorkspace.assignments.forEach((assignment) => {
      searchIndex.push({
        id: `search-field-service-${assignment.id}`,
        role: 'learner',
        type: 'Field service',
        title: `${assignment.serviceType} · ${assignment.statusLabel}`,
        url: '/dashboard/learner/field-services'
      });
    });
  }
  if (providerWorkspace.assignments.length) {
    providerWorkspace.assignments.forEach((assignment) => {
      searchIndex.push({
        id: `search-field-service-provider-${assignment.id}`,
        role: 'instructor',
        type: 'Field service',
        title: `${assignment.reference} · ${assignment.statusLabel}`,
        url: '/dashboard/instructor/field-services'
      });
    });
  }

  return {
    customer: customerWorkspace,
    provider: providerWorkspace,
    searchIndex
  };
}

export { buildFieldServiceWorkspace };

export default buildFieldServiceWorkspace;
