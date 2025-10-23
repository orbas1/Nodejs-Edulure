import LearnerDashboardService from '../services/LearnerDashboardService.js';
import { success } from '../utils/httpResponse.js';

const MAX_STRING_LENGTH = 2048;
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_DEPTH = 5;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepSanitise(value, depth = 0) {
  if (depth > MAX_OBJECT_DEPTH) {
    return null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    return trimmed.length > MAX_STRING_LENGTH ? trimmed.slice(0, MAX_STRING_LENGTH) : trimmed;
  }

  if (Array.isArray(value)) {
    const result = [];
    for (const entry of value) {
      const sanitised = deepSanitise(entry, depth + 1);
      if (sanitised === undefined || sanitised === null) {
        continue;
      }
      if (typeof sanitised === 'string' && sanitised.length === 0) {
        continue;
      }
      result.push(sanitised);
      if (result.length >= MAX_ARRAY_ITEMS) {
        break;
      }
    }
    return result;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).slice(0, MAX_ARRAY_ITEMS);
    const result = {};
    for (const [key, entryValue] of entries) {
      if (entryValue === undefined) {
        continue;
      }
      const sanitised = deepSanitise(entryValue, depth + 1);
      if (sanitised === undefined) {
        continue;
      }
      result[key] = sanitised;
    }
    return result;
  }

  return value;
}

function sanitiseBody(body) {
  if (!isPlainObject(body)) {
    return {};
  }
  return deepSanitise(body);
}

function normaliseStringInput(value, maxLength = MAX_STRING_LENGTH) {
  if (value === undefined || value === null) {
    return '';
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function build400Error(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function requireStringField(value, fieldLabel, maxLength = 255) {
  const trimmed = normaliseStringInput(value, maxLength);
  if (!trimmed) {
    throw build400Error(`${fieldLabel} is required`);
  }
  return trimmed;
}

function optionalStringField(value, maxLength = 255) {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = normaliseStringInput(value, maxLength);
  return trimmed || undefined;
}

function nullableStringField(value, maxLength = 255) {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = normaliseStringInput(value, maxLength);
  return trimmed || null;
}

function normaliseBooleanField(value, defaultValue = undefined) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalised)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalised)) {
      return false;
    }
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return defaultValue;
}

function normaliseStringArrayInput(value, { maxItems = 24, maxLength = 120 } = {}) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const array = Array.isArray(value) ? value : String(value).split(',');
  const result = [];
  const seen = new Set();
  for (const entry of array) {
    if (result.length >= maxItems) {
      break;
    }
    const trimmed = normaliseStringInput(entry, maxLength);
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function requireIdentifier(params, name, { maxLength = 120, label } = {}) {
  const resolvedLabel = label ?? name;
  return requireStringField(params?.[name], resolvedLabel, maxLength);
}

function normaliseMetadataField(value) {
  if (!isPlainObject(value)) {
    return {};
  }
  return deepSanitise(value);
}

function normaliseStringArrayField(value, { maxItems = 25, maxLength = 120 } = {}) {
  if (!Array.isArray(value)) {
    return [];
  }
  const result = [];
  const seen = new Set();
  for (const entry of value) {
    const trimmed = normaliseStringInput(entry, maxLength);
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
    if (result.length >= maxItems) {
      break;
    }
  }
  return result;
}

function optionalStringArrayField(value, options) {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return normaliseStringArrayField(value, options);
}

function optionalNumberField(value, fieldLabel, { min, max, integer = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw build400Error(`${fieldLabel} must be a valid number`);
  }
  let result = numeric;
  if (integer) {
    result = Math.trunc(result);
  }
  if (min !== undefined && result < min) {
    throw build400Error(`${fieldLabel} must be at least ${min}`);
  }
  if (max !== undefined && result > max) {
    throw build400Error(`${fieldLabel} must be at most ${max}`);
  }
  return result;
}

function optionalIsoDateField(value, fieldLabel) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw build400Error(`${fieldLabel} must be a valid ISO 8601 date`);
  }
  return date.toISOString();
}

function optionalCurrencyField(value, fieldLabel) {
  const trimmed = optionalStringField(value, 3);
  if (trimmed === undefined) {
    return undefined;
  }
  if (!/^[a-z]{3}$/i.test(trimmed)) {
    throw build400Error(`${fieldLabel} must be a three letter currency code`);
  }
  return trimmed.toUpperCase();
}

function formatExpiry(value) {
  const trimmed = normaliseStringInput(value, 7);
  if (!trimmed) {
    return '';
  }
  const match = trimmed.match(/^(0[1-9]|1[0-2])[/-]?(\d{2}|\d{4})$/);
  if (!match) {
    return '';
  }
  const [, month, yearPart] = match;
  const year = yearPart.slice(-2);
  return `${month}/${year}`;
}

function requireCardLast4(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length < 4) {
    throw build400Error('A 4 digit card suffix is required');
  }
  return digits.slice(-4);
}

function optionalCardLast4(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 4) {
    throw build400Error('last4 must contain at least four digits');
  }
  return digits.slice(-4);
}

function requireCardExpiry(value) {
  const formatted = formatExpiry(value);
  if (!formatted) {
    throw build400Error('A valid expiry (MM/YY) is required');
  }
  return formatted;
}

function optionalCardExpiry(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const formatted = formatExpiry(value);
  if (!formatted) {
    throw build400Error('expiry must be in MM/YY format');
  }
  return formatted;
}

function requirePositiveInteger(value, fieldLabel) {
  const numeric = optionalNumberField(value, fieldLabel, { min: 1, integer: true });
  if (numeric === undefined) {
    throw build400Error(`${fieldLabel} is required`);
  }
  return numeric;
}

function normaliseSlugField(value, fieldLabel, { maxLength = 120 } = {}) {
  const trimmed = normaliseStringInput(value, maxLength);
  if (!trimmed) {
    throw build400Error(`${fieldLabel} is required`);
  }
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength);
  if (!slug) {
    throw build400Error(`${fieldLabel} is invalid`);
  }
  return slug;
}

function normaliseInstructorApplication(body) {
  const payload = {};
  const status = optionalStringField(body.status, 40);
  if (status !== undefined) {
    payload.status = status;
  }
  const stage = optionalStringField(body.stage, 40);
  if (stage !== undefined) {
    payload.stage = stage;
  }
  if ('motivation' in body) {
    payload.motivation = nullableStringField(body.motivation, 2000);
  }
  if ('portfolioUrl' in body) {
    payload.portfolioUrl = nullableStringField(body.portfolioUrl, 2048);
  }
  const experienceYears = optionalNumberField(body.experienceYears, 'experienceYears', { min: 0 });
  if (experienceYears !== undefined) {
    payload.experienceYears = experienceYears;
  }
  const teachingFocus = optionalStringArrayField(body.teachingFocus, { maxItems: 25, maxLength: 80 });
  if (teachingFocus !== undefined) {
    payload.teachingFocus = teachingFocus;
  }
  if ('availability' in body && isPlainObject(body.availability)) {
    payload.availability = deepSanitise(body.availability);
  }
  const marketingAssets = optionalStringArrayField(body.marketingAssets, { maxItems: 50, maxLength: 180 });
  if (marketingAssets !== undefined) {
    payload.marketingAssets = marketingAssets;
  }
  if ('submittedAt' in body) {
    payload.submittedAt = optionalIsoDateField(body.submittedAt, 'submittedAt');
  }
  if ('reviewedAt' in body) {
    payload.reviewedAt = optionalIsoDateField(body.reviewedAt, 'reviewedAt');
  }
  if ('decisionNote' in body) {
    payload.decisionNote = nullableStringField(body.decisionNote, 2000);
  }
  if ('metadata' in body) {
    payload.metadata = normaliseMetadataField(body.metadata);
  }
  return payload;
}

function normaliseServiceError(error) {
  if (!error) {
    return build400Error('Invalid request payload');
  }
  if (!error.status) {
    const message = (error.message ?? '').toLowerCase();
    if (
      message.includes('required') ||
      message.includes('invalid') ||
      message.includes('missing') ||
      message.includes('must') ||
      message.includes('provide')
    ) {
      error.status = 400;
    }
  }
  return error;
}

export default class LearnerDashboardController {
  static async createPaymentMethod(req, res, next) {
    try {
      const body = sanitiseBody(req.body);
      const payload = {
        label: requireStringField(body.label, 'Payment method label', 120),
        brand: requireStringField(body.brand, 'Payment method brand', 60),
        last4: requireCardLast4(body.last4),
        expiry: requireCardExpiry(body.expiry),
        primary: normaliseBooleanField(body.primary),
        metadata: normaliseMetadataField(body.metadata)
      };

      const method = await LearnerDashboardService.createPaymentMethod(req.user.id, payload);
      return success(res, {
        data: method,
        message: 'Payment method added to wallet',
        status: 201
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async updatePaymentMethod(req, res, next) {
    try {
      const methodId = requireIdentifier(req.params, 'methodId', { label: 'Payment method id' });
      const body = sanitiseBody(req.body);
      const payload = {};

      const label = optionalStringField(body.label, 120);
      if (label !== undefined) {
        payload.label = label;
      }
      const brand = optionalStringField(body.brand, 60);
      if (brand !== undefined) {
        payload.brand = brand;
      }
      const last4 = optionalCardLast4(body.last4);
      if (last4 !== undefined) {
        payload.last4 = last4;
      }
      const expiry = optionalCardExpiry(body.expiry);
      if (expiry !== undefined) {
        payload.expiry = expiry;
      }
      const primary = normaliseBooleanField(body.primary);
      if (primary !== undefined) {
        payload.primary = primary;
      }
      if ('metadata' in body) {
        payload.metadata = normaliseMetadataField(body.metadata);
      }

      const method = await LearnerDashboardService.updatePaymentMethod(req.user.id, methodId, payload);
      return success(res, {
        data: method,
        message: 'Payment method updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async removePaymentMethod(req, res, next) {
    try {
      const methodId = requireIdentifier(req.params, 'methodId', { label: 'Payment method id' });
      const acknowledgement = await LearnerDashboardService.removePaymentMethod(req.user.id, methodId);
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Payment method removed'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async deleteBillingContact(req, res, next) {
    try {
      const contactId = requireIdentifier(req.params, 'contactId', { label: 'Billing contact id' });
      const acknowledgement = await LearnerDashboardService.deleteBillingContact(req.user.id, contactId);
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Billing contact removed'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async getSystemPreferences(req, res, next) {
    try {
      const preferences = await LearnerDashboardService.getSystemPreferences(req.user.id);
      return success(res, {
        data: preferences,
        message: 'System preferences retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateSystemPreferences(req, res, next) {
    try {
      const body = sanitiseBody(req.body ?? {});
      const payload = {};

      const language = optionalStringField(body.language, 8);
      if (language !== undefined) payload.language = language;
      const region = optionalStringField(body.region, 32);
      if (region !== undefined) payload.region = region;
      const timezone = optionalStringField(body.timezone, 64);
      if (timezone !== undefined) payload.timezone = timezone;

      const notificationsEnabled = normaliseBooleanField(body.notificationsEnabled);
      if (notificationsEnabled !== undefined) payload.notificationsEnabled = notificationsEnabled;
      const digestEnabled = normaliseBooleanField(body.digestEnabled);
      if (digestEnabled !== undefined) payload.digestEnabled = digestEnabled;
      const autoPlayMedia = normaliseBooleanField(body.autoPlayMedia);
      if (autoPlayMedia !== undefined) payload.autoPlayMedia = autoPlayMedia;
      const highContrast = normaliseBooleanField(body.highContrast);
      if (highContrast !== undefined) payload.highContrast = highContrast;
      const reducedMotion = normaliseBooleanField(body.reducedMotion);
      if (reducedMotion !== undefined) payload.reducedMotion = reducedMotion;

      if ('preferences' in body && isPlainObject(body.preferences)) {
        payload.preferences = deepSanitise(body.preferences);
      }

      const acknowledgement = await LearnerDashboardService.updateSystemPreferences(req.user.id, payload);
      return success(res, {
        data: acknowledgement.meta?.preference ?? acknowledgement,
        message: acknowledgement.message ?? 'System preferences updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async getOnboardingDraft(req, res, next) {
    try {
      const draft = await LearnerDashboardService.getOnboardingDraft(req.user.id);
      return success(res, {
        data: draft,
        message: 'Onboarding draft retrieved'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async bootstrapProfile(req, res, next) {
    try {
      const body = sanitiseBody(req.body ?? {});
      const persona = body.persona === null ? null : nullableStringField(body.persona, 60);
      const roleIntent = body.roleIntent === null ? null : nullableStringField(body.roleIntent, 60);
      const interestTags = normaliseStringArrayInput(body.interestTags, { maxItems: 16, maxLength: 60 }) ?? [];
      const communityInvites =
        normaliseStringArrayInput(body.communityInvites, { maxItems: 24, maxLength: 40 }) ?? [];
      const progressStep = optionalStringField(body.progress?.step, 60);
      const progressCompleted =
        normaliseStringArrayInput(body.progress?.completed, { maxItems: 32, maxLength: 64 }) ?? [];

      const draft = await LearnerDashboardService.saveOnboardingDraft(req.user.id, {
        persona: persona ?? undefined,
        roleIntent: roleIntent ?? undefined,
        interestTags,
        communityInvites,
        progress: {
          step: progressStep ?? undefined,
          completed: progressCompleted
        }
      });

      return success(res, {
        data: draft,
        message: 'Onboarding draft saved',
        status: 202
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async getFinanceSettings(req, res, next) {
    try {
      const settings = await LearnerDashboardService.getFinanceSettings(req.user.id);
      return success(res, {
        data: settings,
        message: 'Finance settings retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateFinanceSettings(req, res, next) {
    try {
      const body = sanitiseBody(req.body ?? {});
      const payload = {};

      const currency = optionalCurrencyField(body.currency, 'currency');
      if (currency !== undefined) payload.currency = currency;
      const taxId = optionalStringField(body.taxId, 32);
      if (taxId !== undefined) payload.taxId = taxId;
      const invoiceDelivery = optionalStringField(body.invoiceDelivery, 40);
      if (invoiceDelivery !== undefined) payload.invoiceDelivery = invoiceDelivery;
      const payoutSchedule = optionalStringField(body.payoutSchedule, 40);
      if (payoutSchedule !== undefined) payload.payoutSchedule = payoutSchedule;
      const expensePolicyUrl = optionalStringField(body.expensePolicyUrl, 2048);
      if (expensePolicyUrl !== undefined) payload.expensePolicyUrl = expensePolicyUrl;

      const autoPayEnabled = normaliseBooleanField(body.autoPayEnabled);
      if (autoPayEnabled !== undefined) payload.autoPayEnabled = autoPayEnabled;

      if (isPlainObject(body.autoPay)) {
        payload.autoPay = deepSanitise(body.autoPay);
        const enabled = normaliseBooleanField(body.autoPay.enabled);
        if (enabled !== undefined) {
          payload.autoPay.enabled = enabled;
        }
        const methodId = optionalStringField(body.autoPay.methodId, 120);
        if (methodId !== undefined) {
          payload.autoPay.methodId = methodId;
        }
      }

      const reserveTargetCents = optionalNumberField(body.reserveTargetCents, 'reserveTargetCents', {
        min: 0,
        integer: true
      });
      if (reserveTargetCents !== undefined) payload.reserveTargetCents = reserveTargetCents;

      const reserveTarget = optionalNumberField(body.reserveTarget, 'reserveTarget', { min: 0 });
      if (reserveTarget !== undefined) payload.reserveTarget = reserveTarget;

      if (isPlainObject(body.alerts)) {
        payload.alerts = {
          ...deepSanitise(body.alerts)
        };
        const sendEmail = normaliseBooleanField(body.alerts.sendEmail);
        if (sendEmail !== undefined) payload.alerts.sendEmail = sendEmail;
        const sendSms = normaliseBooleanField(body.alerts.sendSms);
        if (sendSms !== undefined) payload.alerts.sendSms = sendSms;
        if ('escalationEmail' in body.alerts) {
          payload.alerts.escalationEmail = nullableStringField(body.alerts.escalationEmail, 180);
        }
        if ('notifyThresholdPercent' in body.alerts) {
          const threshold = optionalNumberField(
            body.alerts.notifyThresholdPercent,
            'notifyThresholdPercent',
            { min: 1, max: 100, integer: true }
          );
          if (threshold !== undefined) {
            payload.alerts.notifyThresholdPercent = threshold;
          }
        }
      }

      if (isPlainObject(body.reimbursements)) {
        payload.reimbursements = {
          ...deepSanitise(body.reimbursements)
        };
        const enabled = normaliseBooleanField(body.reimbursements.enabled);
        if (enabled !== undefined) payload.reimbursements.enabled = enabled;
        if ('instructions' in body.reimbursements) {
          payload.reimbursements.instructions = nullableStringField(
            body.reimbursements.instructions,
            2000
          );
        }
      }

      if (Array.isArray(body.documents)) {
        payload.documents = body.documents
          .filter((doc) => isPlainObject(doc))
          .map((doc) => deepSanitise(doc))
          .slice(0, MAX_ARRAY_ITEMS);
      }

      if (isPlainObject(body.profile)) {
        payload.profile = deepSanitise(body.profile);
      }

      if ('metadata' in body) {
        payload.metadata = normaliseMetadataField(body.metadata);
      }

      const acknowledgement = await LearnerDashboardService.updateFinanceSettings(req.user.id, payload);
      return success(res, {
        data: acknowledgement.meta?.financeSettings ?? acknowledgement,
        message: acknowledgement.message ?? 'Finance settings updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async createFinancePurchase(req, res, next) {
    try {
      const body = sanitiseBody(req.body ?? {});
      const payload = {
        reference: requireStringField(body.reference, 'Purchase reference', 64),
        description: requireStringField(body.description, 'Purchase description', 255),
        amountCents: optionalNumberField(body.amountCents, 'amountCents', { min: 0, integer: true }),
        amount: optionalNumberField(body.amount, 'amount', { min: 0 }),
        amountDollars: optionalNumberField(body.amountDollars, 'amountDollars', { min: 0 }),
        currency: optionalCurrencyField(body.currency, 'currency'),
        status: optionalStringField(body.status, 30),
        purchasedAt: optionalIsoDateField(body.purchasedAt, 'purchasedAt'),
        metadata: normaliseMetadataField(body.metadata)
      };

      const purchase = await LearnerDashboardService.createFinancePurchase(req.user.id, payload);
      return success(res, {
        data: purchase,
        message: 'Purchase recorded',
        status: 201
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async updateFinancePurchase(req, res, next) {
    try {
      const purchaseId = requireIdentifier(req.params, 'purchaseId', { label: 'Purchase id' });
      const body = sanitiseBody(req.body ?? {});
      const payload = {};

      const reference = optionalStringField(body.reference, 64);
      if (reference !== undefined) payload.reference = reference;
      const description = optionalStringField(body.description, 255);
      if (description !== undefined) payload.description = description;
      const amountCents = optionalNumberField(body.amountCents, 'amountCents', { min: 0, integer: true });
      if (amountCents !== undefined) payload.amountCents = amountCents;
      const amount = optionalNumberField(body.amount, 'amount', { min: 0 });
      if (amount !== undefined) payload.amount = amount;
      const amountDollars = optionalNumberField(body.amountDollars, 'amountDollars', { min: 0 });
      if (amountDollars !== undefined) payload.amountDollars = amountDollars;
      const currency = optionalCurrencyField(body.currency, 'currency');
      if (currency !== undefined) payload.currency = currency;
      const status = optionalStringField(body.status, 30);
      if (status !== undefined) payload.status = status;
      const purchasedAt = optionalIsoDateField(body.purchasedAt, 'purchasedAt');
      if (purchasedAt !== undefined) payload.purchasedAt = purchasedAt;
      if ('metadata' in body) payload.metadata = normaliseMetadataField(body.metadata);

      const purchase = await LearnerDashboardService.updateFinancePurchase(
        req.user.id,
        purchaseId,
        payload
      );
      return success(res, {
        data: purchase,
        message: 'Purchase updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async deleteFinancePurchase(req, res, next) {
    try {
      const purchaseId = requireIdentifier(req.params, 'purchaseId', { label: 'Purchase id' });
      const acknowledgement = await LearnerDashboardService.deleteFinancePurchase(
        req.user.id,
        purchaseId
      );
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Purchase removed'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async createGrowthInitiative(req, res, next) {
    try {
      const body = sanitiseBody(req.body ?? {});
      const payload = {
        slug: normaliseSlugField(body.slug, 'Growth initiative slug'),
        title: requireStringField(body.title, 'Growth initiative title', 160),
        status: optionalStringField(body.status, 30) ?? 'planning',
        objective: nullableStringField(body.objective, 500),
        primaryMetric: nullableStringField(body.primaryMetric, 120),
        baselineValue: optionalNumberField(body.baselineValue, 'baselineValue'),
        targetValue: optionalNumberField(body.targetValue, 'targetValue'),
        currentValue: optionalNumberField(body.currentValue, 'currentValue'),
        startAt: optionalIsoDateField(body.startAt, 'startAt'),
        endAt: optionalIsoDateField(body.endAt, 'endAt'),
        tags: normaliseStringArrayField(body.tags, { maxItems: 20, maxLength: 40 }),
        metadata: normaliseMetadataField(body.metadata)
      };

      const initiative = await LearnerDashboardService.createGrowthInitiative(req.user.id, payload);
      return success(res, {
        data: initiative,
        message: 'Growth initiative created',
        status: 201
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async updateGrowthInitiative(req, res, next) {
    try {
      const initiativeId = requireIdentifier(req.params, 'initiativeId', {
        label: 'Growth initiative id'
      });
      const body = sanitiseBody(req.body ?? {});
      const payload = {};

      if ('slug' in body) {
        payload.slug = normaliseSlugField(body.slug, 'Growth initiative slug');
      }

      const title = optionalStringField(body.title, 160);
      if (title !== undefined) {
        payload.title = title;
      }

      const status = optionalStringField(body.status, 30);
      if (status !== undefined) {
        payload.status = status;
      }

      if ('objective' in body) {
        payload.objective = nullableStringField(body.objective, 500);
      }

      if ('primaryMetric' in body) {
        payload.primaryMetric = nullableStringField(body.primaryMetric, 120);
      }

      const baselineValue = optionalNumberField(body.baselineValue, 'baselineValue');
      if (baselineValue !== undefined) {
        payload.baselineValue = baselineValue;
      }

      const targetValue = optionalNumberField(body.targetValue, 'targetValue');
      if (targetValue !== undefined) {
        payload.targetValue = targetValue;
      }

      const currentValue = optionalNumberField(body.currentValue, 'currentValue');
      if (currentValue !== undefined) {
        payload.currentValue = currentValue;
      }

      const startAt = optionalIsoDateField(body.startAt, 'startAt');
      if (startAt !== undefined) {
        payload.startAt = startAt;
      }

      const endAt = optionalIsoDateField(body.endAt, 'endAt');
      if (endAt !== undefined) {
        payload.endAt = endAt;
      }

      const tags = optionalStringArrayField(body.tags, { maxItems: 20, maxLength: 40 });
      if (tags !== undefined) {
        payload.tags = tags;
      }

      if ('metadata' in body) {
        payload.metadata = normaliseMetadataField(body.metadata);
      }

      const initiative = await LearnerDashboardService.updateGrowthInitiative(
        req.user.id,
        initiativeId,
        payload
      );
      return success(res, {
        data: initiative,
        message: 'Growth initiative updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async deleteGrowthInitiative(req, res, next) {
    try {
      const initiativeId = requireIdentifier(req.params, 'initiativeId', {
        label: 'Growth initiative id'
      });
      const acknowledgement = await LearnerDashboardService.deleteGrowthInitiative(
        req.user.id,
        initiativeId
      );
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Growth initiative removed'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async createGrowthExperiment(req, res, next) {
    try {
      const initiativeId = requireIdentifier(req.params, 'initiativeId', {
        label: 'Growth initiative id'
      });
      const body = sanitiseBody(req.body ?? {});
      const payload = {
        name: requireStringField(body.name, 'Growth experiment name', 160),
        status: optionalStringField(body.status, 30) ?? 'draft',
        hypothesis: nullableStringField(body.hypothesis, 1000),
        metric: nullableStringField(body.metric, 120),
        baselineValue: optionalNumberField(body.baselineValue, 'baselineValue'),
        targetValue: optionalNumberField(body.targetValue, 'targetValue'),
        resultValue: optionalNumberField(body.resultValue, 'resultValue'),
        startAt: optionalIsoDateField(body.startAt, 'startAt'),
        endAt: optionalIsoDateField(body.endAt, 'endAt'),
        segments: normaliseStringArrayField(body.segments, { maxItems: 25, maxLength: 60 }),
        metadata: normaliseMetadataField(body.metadata)
      };

      const experiment = await LearnerDashboardService.createGrowthExperiment(
        req.user.id,
        initiativeId,
        payload
      );
      return success(res, {
        data: experiment,
        message: 'Growth experiment created',
        status: 201
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async updateGrowthExperiment(req, res, next) {
    try {
      const initiativeId = requireIdentifier(req.params, 'initiativeId', {
        label: 'Growth initiative id'
      });
      const experimentId = requireIdentifier(req.params, 'experimentId', {
        label: 'Growth experiment id'
      });
      const body = sanitiseBody(req.body ?? {});
      const payload = {};

      const name = optionalStringField(body.name, 160);
      if (name !== undefined) payload.name = name;
      const status = optionalStringField(body.status, 30);
      if (status !== undefined) payload.status = status;
      if ('hypothesis' in body) payload.hypothesis = nullableStringField(body.hypothesis, 1000);
      if ('metric' in body) payload.metric = nullableStringField(body.metric, 120);
      const baselineValue = optionalNumberField(body.baselineValue, 'baselineValue');
      if (baselineValue !== undefined) payload.baselineValue = baselineValue;
      const targetValue = optionalNumberField(body.targetValue, 'targetValue');
      if (targetValue !== undefined) payload.targetValue = targetValue;
      const resultValue = optionalNumberField(body.resultValue, 'resultValue');
      if (resultValue !== undefined) payload.resultValue = resultValue;
      const startAt = optionalIsoDateField(body.startAt, 'startAt');
      if (startAt !== undefined) payload.startAt = startAt;
      const endAt = optionalIsoDateField(body.endAt, 'endAt');
      if (endAt !== undefined) payload.endAt = endAt;
      const segments = optionalStringArrayField(body.segments, { maxItems: 25, maxLength: 60 });
      if (segments !== undefined) payload.segments = segments;
      if ('metadata' in body) payload.metadata = normaliseMetadataField(body.metadata);

      const experiment = await LearnerDashboardService.updateGrowthExperiment(
        req.user.id,
        initiativeId,
        experimentId,
        payload
      );
      return success(res, {
        data: experiment,
        message: 'Growth experiment updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async deleteGrowthExperiment(req, res, next) {
    try {
      const initiativeId = requireIdentifier(req.params, 'initiativeId', {
        label: 'Growth initiative id'
      });
      const experimentId = requireIdentifier(req.params, 'experimentId', {
        label: 'Growth experiment id'
      });
      const acknowledgement = await LearnerDashboardService.deleteGrowthExperiment(
        req.user.id,
        initiativeId,
        experimentId
      );
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Growth experiment removed'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async createAffiliateChannel(req, res, next) {
    try {
      const body = sanitiseBody(req.body ?? {});
      const payload = {
        platform: requireStringField(body.platform, 'Affiliate platform', 120),
        handle: nullableStringField(body.handle, 120),
        referralCode: requireStringField(body.referralCode, 'Referral code', 120),
        trackingUrl: nullableStringField(body.trackingUrl, 2048),
        status: optionalStringField(body.status, 40) ?? 'draft',
        commissionRateBps: optionalNumberField(body.commissionRateBps, 'commissionRateBps', {
          min: 0,
          integer: true
        }),
        totalEarningsCents: optionalNumberField(body.totalEarningsCents, 'totalEarningsCents', {
          min: 0,
          integer: true
        }),
        totalPaidCents: optionalNumberField(body.totalPaidCents, 'totalPaidCents', {
          min: 0,
          integer: true
        }),
        notes: normaliseStringArrayField(body.notes, { maxItems: 50, maxLength: 120 }),
        performance: normaliseMetadataField(body.performance),
        metadata: normaliseMetadataField(body.metadata)
      };

      const channel = await LearnerDashboardService.createAffiliateChannel(req.user.id, payload);
      return success(res, {
        data: channel,
        message: 'Affiliate channel created',
        status: 201
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async updateAffiliateChannel(req, res, next) {
    try {
      const channelId = requireIdentifier(req.params, 'channelId', { label: 'Affiliate channel id' });
      const body = sanitiseBody(req.body ?? {});
      const payload = {};

      if ('platform' in body) payload.platform = requireStringField(body.platform, 'Affiliate platform', 120);
      if ('handle' in body) payload.handle = nullableStringField(body.handle, 120);
      if ('referralCode' in body) payload.referralCode = requireStringField(body.referralCode, 'Referral code', 120);
      const status = optionalStringField(body.status, 40);
      if (status !== undefined) payload.status = status;
      const commissionRateBps = optionalNumberField(body.commissionRateBps, 'commissionRateBps', {
        min: 0,
        integer: true
      });
      if (commissionRateBps !== undefined) payload.commissionRateBps = commissionRateBps;
      const totalEarningsCents = optionalNumberField(
        body.totalEarningsCents,
        'totalEarningsCents',
        { min: 0, integer: true }
      );
      if (totalEarningsCents !== undefined) payload.totalEarningsCents = totalEarningsCents;
      const totalPaidCents = optionalNumberField(body.totalPaidCents, 'totalPaidCents', {
        min: 0,
        integer: true
      });
      if (totalPaidCents !== undefined) payload.totalPaidCents = totalPaidCents;
      const notes = optionalStringArrayField(body.notes, { maxItems: 50, maxLength: 120 });
      if (notes !== undefined) payload.notes = notes;
      if ('performance' in body) payload.performance = normaliseMetadataField(body.performance);
      if ('metadata' in body) payload.metadata = normaliseMetadataField(body.metadata);

      const channel = await LearnerDashboardService.updateAffiliateChannel(
        req.user.id,
        channelId,
        payload
      );
      return success(res, {
        data: channel,
        message: 'Affiliate channel updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async deleteAffiliateChannel(req, res, next) {
    try {
      const channelId = requireIdentifier(req.params, 'channelId', { label: 'Affiliate channel id' });
      const acknowledgement = await LearnerDashboardService.deleteAffiliateChannel(
        req.user.id,
        channelId
      );
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Affiliate channel removed'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async recordAffiliatePayout(req, res, next) {
    try {
      const channelId = requireIdentifier(req.params, 'channelId', { label: 'Affiliate channel id' });
      const body = sanitiseBody(req.body ?? {});
      const amountCents = optionalNumberField(body.amountCents, 'amountCents', { min: 1, integer: true });
      if (amountCents === undefined) {
        throw build400Error('An amountCents value is required to record a payout');
      }
      const payload = {
        amountCents,
        currency: optionalCurrencyField(body.currency, 'currency') ?? 'USD',
        status: optionalStringField(body.status, 30) ?? 'scheduled',
        scheduledAt: optionalIsoDateField(body.scheduledAt, 'scheduledAt'),
        processedAt: optionalIsoDateField(body.processedAt, 'processedAt'),
        reference: nullableStringField(body.reference, 120),
        note: nullableStringField(body.note ?? body.notes, 500),
        metadata: normaliseMetadataField(body.metadata)
      };

      const payout = await LearnerDashboardService.recordAffiliatePayout(
        req.user.id,
        channelId,
        payload
      );
      return success(res, {
        data: payout,
        message: 'Affiliate payout recorded',
        status: 201
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async createAdCampaign(req, res, next) {
    try {
      const body = sanitiseBody(req.body ?? {});
      const payload = {
        name: requireStringField(body.name, 'Campaign name', 160),
        status: optionalStringField(body.status, 30) ?? 'draft',
        objective: nullableStringField(body.objective, 120),
        dailyBudgetCents: optionalNumberField(body.dailyBudgetCents, 'dailyBudgetCents', {
          min: 0,
          integer: true
        }),
        totalSpendCents: optionalNumberField(body.totalSpendCents, 'totalSpendCents', {
          min: 0,
          integer: true
        }),
        startAt: optionalIsoDateField(body.startAt, 'startAt'),
        endAt: optionalIsoDateField(body.endAt, 'endAt'),
        lastSyncedAt: optionalIsoDateField(body.lastSyncedAt, 'lastSyncedAt'),
        metrics: normaliseMetadataField(body.metrics),
        targeting: normaliseMetadataField(body.targeting),
        creative: normaliseMetadataField(body.creative),
        placements: normaliseStringArrayField(body.placements, { maxItems: 25, maxLength: 80 }),
        metadata: normaliseMetadataField(body.metadata)
      };

      const campaign = await LearnerDashboardService.createAdCampaign(req.user.id, payload);
      return success(res, {
        data: campaign,
        message: 'Ad campaign created',
        status: 201
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async updateAdCampaign(req, res, next) {
    try {
      const campaignId = requireIdentifier(req.params, 'campaignId', { label: 'Ad campaign id' });
      const body = sanitiseBody(req.body ?? {});
      const payload = {};

      const name = optionalStringField(body.name, 160);
      if (name !== undefined) payload.name = name;
      const status = optionalStringField(body.status, 30);
      if (status !== undefined) payload.status = status;
      if ('objective' in body) payload.objective = nullableStringField(body.objective, 120);
      const dailyBudgetCents = optionalNumberField(body.dailyBudgetCents, 'dailyBudgetCents', {
        min: 0,
        integer: true
      });
      if (dailyBudgetCents !== undefined) payload.dailyBudgetCents = dailyBudgetCents;
      const totalSpendCents = optionalNumberField(body.totalSpendCents, 'totalSpendCents', {
        min: 0,
        integer: true
      });
      if (totalSpendCents !== undefined) payload.totalSpendCents = totalSpendCents;
      const startAt = optionalIsoDateField(body.startAt, 'startAt');
      if (startAt !== undefined) payload.startAt = startAt;
      const endAt = optionalIsoDateField(body.endAt, 'endAt');
      if (endAt !== undefined) payload.endAt = endAt;
      const lastSyncedAt = optionalIsoDateField(body.lastSyncedAt, 'lastSyncedAt');
      if (lastSyncedAt !== undefined) payload.lastSyncedAt = lastSyncedAt;
      if ('metrics' in body) payload.metrics = normaliseMetadataField(body.metrics);
      if ('targeting' in body) payload.targeting = normaliseMetadataField(body.targeting);
      if ('creative' in body) payload.creative = normaliseMetadataField(body.creative);
      const placements = optionalStringArrayField(body.placements, { maxItems: 25, maxLength: 80 });
      if (placements !== undefined) payload.placements = placements;
      if ('metadata' in body) payload.metadata = normaliseMetadataField(body.metadata);

      const campaign = await LearnerDashboardService.updateAdCampaign(
        req.user.id,
        campaignId,
        payload
      );
      return success(res, {
        data: campaign,
        message: 'Ad campaign updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async deleteAdCampaign(req, res, next) {
    try {
      const campaignId = requireIdentifier(req.params, 'campaignId', { label: 'Ad campaign id' });
      const acknowledgement = await LearnerDashboardService.deleteAdCampaign(
        req.user.id,
        campaignId
      );
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Ad campaign removed'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async getInstructorApplication(req, res, next) {
    try {
      const application = await LearnerDashboardService.getInstructorApplication(req.user.id);
      return success(res, {
        data: { application },
        message: 'Instructor application resolved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async saveInstructorApplication(req, res, next) {
    try {
      const body = sanitiseBody(req.body ?? {});
      const payload = normaliseInstructorApplication(body);
      const application = await LearnerDashboardService.upsertInstructorApplication(req.user.id, payload);
      return success(res, {
        data: { application },
        message: 'Instructor application updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async submitInstructorApplication(req, res, next) {
    try {
      const body = sanitiseBody(req.body ?? {});
      const payload = normaliseInstructorApplication(body);
      const acknowledgement = await LearnerDashboardService.submitInstructorApplication(
        req.user.id,
        payload
      );
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Instructor application submitted'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async createTutorBooking(req, res, next) {
    try {
      const body = sanitiseBody(req.body ?? {});
      if (body.tutorId === undefined && body.profileId === undefined && body.tutorProfileId === undefined) {
        throw build400Error('A tutorId or profile identifier is required');
      }
      const tutorId = requirePositiveInteger(
        body.tutorId ?? body.profileId ?? body.tutorProfileId,
        'Tutor id'
      );
      const payload = {
        ...body,
        tutorId
      };

      const acknowledgement = await LearnerDashboardService.createTutorBookingRequest(
        req.user.id,
        payload
      );
      return success(res, {
        data: acknowledgement,
        message: 'Tutor booking request created'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async listTutorBookings(req, res, next) {
    try {
      const bookings = await LearnerDashboardService.listTutorBookings(req.user.id);
      return success(res, {
        data: { bookings },
        message: 'Tutor bookings loaded'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateTutorBooking(req, res, next) {
    try {
      const bookingId = requireIdentifier(req.params, 'bookingId', { label: 'Tutor booking id' });
      const body = sanitiseBody(req.body ?? {});
      const acknowledgement = await LearnerDashboardService.updateTutorBooking(
        req.user.id,
        bookingId,
        body
      );
      return success(res, {
        data: acknowledgement,
        message: 'Tutor booking updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async cancelTutorBooking(req, res, next) {
    try {
      const bookingId = requireIdentifier(req.params, 'bookingId', { label: 'Tutor booking id' });
      const body = sanitiseBody(req.body ?? {});
      const acknowledgement = await LearnerDashboardService.cancelTutorBooking(
        req.user.id,
        bookingId,
        body
      );
      return success(res, {
        data: acknowledgement,
        message: 'Tutor booking cancelled'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async exportTutorSchedule(req, res, next) {
    try {
      const acknowledgement = await LearnerDashboardService.exportTutorSchedule(req.user.id);
      return success(res, {
        data: acknowledgement,
        message: 'Tutor schedule export ready'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateTutorBookingRequest(req, res, next) {
    try {
      const bookingId = requireIdentifier(req.params, 'bookingId', { label: 'Tutor booking request id' });
      const body = sanitiseBody(req.body ?? {});
      const acknowledgement = await LearnerDashboardService.updateTutorBookingRequest(
        req.user.id,
        bookingId,
        body
      );
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Tutor booking updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async cancelTutorBookingRequest(req, res, next) {
    try {
      const bookingId = requireIdentifier(req.params, 'bookingId', { label: 'Tutor booking request id' });
      const body = sanitiseBody(req.body ?? {});
      const acknowledgement = await LearnerDashboardService.cancelTutorBookingRequest(
        req.user.id,
        bookingId,
        body
      );
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Tutor booking cancelled'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async createCourseGoal(req, res, next) {
    try {
      const courseId = requireIdentifier(req.params, 'courseId', { label: 'Course id' });
      const body = sanitiseBody(req.body ?? {});
      const acknowledgement = await LearnerDashboardService.createCourseGoal(
        req.user.id,
        courseId,
        body
      );
      return success(res, {
        data: acknowledgement,
        message: 'Learning goal created'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async resumeEbook(req, res, next) {
    try {
      const ebookId = requireIdentifier(req.params, 'ebookId', { label: 'E-book id' });
      const acknowledgement = await LearnerDashboardService.resumeEbook(req.user.id, ebookId);
      return success(res, {
        data: acknowledgement,
        message: 'E-book resumed'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async shareEbook(req, res, next) {
    try {
      const ebookId = requireIdentifier(req.params, 'ebookId', { label: 'E-book id' });
      const body = sanitiseBody(req.body ?? {});
      const acknowledgement = await LearnerDashboardService.shareEbook(
        req.user.id,
        ebookId,
        body
      );
      return success(res, {
        data: acknowledgement,
        message: 'E-book highlight shared'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async createLibraryEntry(req, res, next) {
    try {
      const body = sanitiseBody(req.body ?? {});
      if (!body.title) {
        throw build400Error('A title is required to add a library entry');
      }
      const entry = await LearnerDashboardService.createLearnerLibraryEntry(req.user.id, body);
      return success(res, {
        data: entry,
        message: 'Library entry created',
        status: 201
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async updateLibraryEntry(req, res, next) {
    try {
      const ebookId = requireIdentifier(req.params, 'ebookId', { label: 'E-book id' });
      const body = sanitiseBody(req.body ?? {});
      const entry = await LearnerDashboardService.updateLearnerLibraryEntry(
        req.user.id,
        ebookId,
        body
      );
      return success(res, {
        data: entry,
        message: 'Library entry updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async deleteLibraryEntry(req, res, next) {
    try {
      const ebookId = requireIdentifier(req.params, 'ebookId', { label: 'E-book id' });
      const acknowledgement = await LearnerDashboardService.deleteLearnerLibraryEntry(
        req.user.id,
        ebookId
      );
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Library entry removed'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async downloadInvoice(req, res, next) {
    try {
      const invoiceId = requireIdentifier(req.params, 'invoiceId', { label: 'Invoice id' });
      const acknowledgement = await LearnerDashboardService.downloadInvoice(req.user.id, invoiceId);
      return success(res, {
        data: acknowledgement,
        message: 'Invoice download prepared'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async updateBillingPreferences(req, res, next) {
    try {
      const body = sanitiseBody(req.body ?? {});
      const acknowledgement = await LearnerDashboardService.updateBillingPreferences(
        req.user.id,
        body
      );
      return success(res, {
        data: acknowledgement,
        message: 'Billing preferences updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async joinLiveSession(req, res, next) {
    try {
      const sessionId = requireIdentifier(req.params, 'sessionId', { label: 'Live session id' });
      const acknowledgement = await LearnerDashboardService.joinLiveSession(
        req.user.id,
        sessionId
      );
      return success(res, {
        data: acknowledgement,
        message: 'Live session joined'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async checkInToLiveSession(req, res, next) {
    try {
      const sessionId = requireIdentifier(req.params, 'sessionId', { label: 'Live session id' });
      const acknowledgement = await LearnerDashboardService.checkInToLiveSession(
        req.user.id,
        sessionId
      );
      return success(res, {
        data: acknowledgement,
        message: 'Live session check-in recorded'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async triggerCommunityAction(req, res, next) {
    try {
      const communityId = requireIdentifier(req.params, 'communityId', { label: 'Community id' });
      const body = sanitiseBody(req.body ?? {});
      const acknowledgement = await LearnerDashboardService.triggerCommunityAction(
        req.user.id,
        communityId,
        body
      );
      return success(res, {
        data: acknowledgement,
        message: 'Community action triggered'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async createFieldServiceAssignment(req, res, next) {
    try {
      const body = sanitiseBody(req.body ?? {});
      const assignment = await LearnerDashboardService.createFieldServiceAssignment(
        req.user.id,
        body
      );
      return success(res, {
        data: assignment,
        message: 'Field service assignment dispatched',
        status: 201
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async updateFieldServiceAssignment(req, res, next) {
    try {
      const assignmentId = requireIdentifier(req.params, 'assignmentId', {
        label: 'Field service assignment id'
      });
      const body = sanitiseBody(req.body ?? {});
      const assignment = await LearnerDashboardService.updateFieldServiceAssignment(
        req.user.id,
        assignmentId,
        body
      );
      return success(res, {
        data: assignment,
        message: 'Field service assignment updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async closeFieldServiceAssignment(req, res, next) {
    try {
      const assignmentId = requireIdentifier(req.params, 'assignmentId', {
        label: 'Field service assignment id'
      });
      const body = sanitiseBody(req.body ?? {});
      const acknowledgement = await LearnerDashboardService.closeFieldServiceAssignment(
        req.user.id,
        assignmentId,
        body
      );
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Field service assignment closed'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async listSupportTickets(req, res, next) {
    try {
      const tickets = await LearnerDashboardService.listSupportTickets(req.user.id);
      return success(res, {
        data: { tickets },
        message: 'Support tickets loaded'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async createSupportTicket(req, res, next) {
    try {
      const body = sanitiseBody(req.body ?? {});
      if (!body.subject) {
        throw build400Error('Subject is required to create a support ticket');
      }
      const ticket = await LearnerDashboardService.createSupportTicket(req.user.id, body);
      return success(res, {
        data: { ticket },
        message: 'Support request submitted'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async updateSupportTicket(req, res, next) {
    try {
      const ticketId = requireIdentifier(req.params, 'ticketId', { label: 'Support ticket id' });
      const body = sanitiseBody(req.body ?? {});
      const ticket = await LearnerDashboardService.updateSupportTicket(
        req.user.id,
        ticketId,
        body
      );
      return success(res, {
        data: { ticket },
        message: 'Support request updated'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async replyToSupportTicket(req, res, next) {
    try {
      const ticketId = requireIdentifier(req.params, 'ticketId', { label: 'Support ticket id' });
      const body = sanitiseBody(req.body ?? {});
      if (!body.body && !Array.isArray(body.attachments)) {
        throw build400Error('Message content is required');
      }
      const message = await LearnerDashboardService.addSupportTicketMessage(
        req.user.id,
        ticketId,
        body
      );
      return success(res, {
        data: { message },
        message: 'Reply posted to support case'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }

  static async closeSupportTicket(req, res, next) {
    try {
      const ticketId = requireIdentifier(req.params, 'ticketId', { label: 'Support ticket id' });
      const body = sanitiseBody(req.body ?? {});
      const ticket = await LearnerDashboardService.closeSupportTicket(req.user.id, ticketId, body);
      return success(res, {
        data: { ticket },
        message: 'Support request closed'
      });
    } catch (error) {
      return next(normaliseServiceError(error));
    }
  }
}
