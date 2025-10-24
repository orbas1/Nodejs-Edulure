const COMMUNITY_MESSAGE_TYPES = Object.freeze(['text', 'system', 'event', 'file', 'live']);
const COMMUNITY_MESSAGE_STATUSES = Object.freeze(['visible', 'hidden', 'deleted']);
const DIRECT_MESSAGE_TYPES = Object.freeze(['text', 'system', 'file']);
const DIRECT_MESSAGE_STATUSES = Object.freeze(['sent', 'delivered', 'read', 'deleted']);
const PAYMENT_INTENT_STATUSES = Object.freeze([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'requires_capture',
  'processing',
  'succeeded',
  'canceled',
  'failed',
  'refunded',
  'partially_refunded'
]);
const PAYMENT_REFUND_STATUSES = Object.freeze(['pending', 'succeeded', 'failed']);

function normaliseEnum(value, allowed, { defaultValue, fieldName } = {}) {
  const trimmed = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (trimmed && allowed.includes(trimmed)) {
    return trimmed;
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new Error(`${fieldName ?? 'value'} must be one of: ${allowed.join(', ')}`);
}

function assertEnum(value, allowed, { fieldName } = {}) {
  const trimmed = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!allowed.includes(trimmed)) {
    throw new Error(`${fieldName ?? 'value'} must be one of: ${allowed.join(', ')}`);
  }
  return trimmed;
}

export {
  COMMUNITY_MESSAGE_TYPES,
  COMMUNITY_MESSAGE_STATUSES,
  DIRECT_MESSAGE_TYPES,
  DIRECT_MESSAGE_STATUSES,
  PAYMENT_INTENT_STATUSES,
  PAYMENT_REFUND_STATUSES,
  normaliseEnum,
  assertEnum
};
