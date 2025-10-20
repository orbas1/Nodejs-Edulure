import Joi from 'joi';

import IntegrationApiKeyInviteService from '../services/IntegrationApiKeyInviteService.js';
import {
  MAX_ROTATION_DAYS,
  MIN_ROTATION_DAYS,
  MIN_KEY_LENGTH,
  isValidEmail
} from '../services/IntegrationApiKeyService.js';

const tokenParamSchema = Joi.object({
  token: Joi.string().trim().min(10).max(200).required()
});

const submitInvitationSchema = Joi.object({
  key: Joi.string().trim().min(MIN_KEY_LENGTH).max(512).required(),
  rotationIntervalDays: Joi.number().integer().min(MIN_ROTATION_DAYS).max(MAX_ROTATION_DAYS).optional(),
  keyExpiresAt: Joi.date().iso().allow(null).optional(),
  actorEmail: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).optional(),
  actorName: Joi.string().trim().max(120).allow(null).empty('').default(null),
  reason: Joi.string().trim().max(500).allow(null).empty('').default(null)
}).prefs({ abortEarly: false, stripUnknown: true });

let inviteService = new IntegrationApiKeyInviteService();

export function __setInviteService(mock) {
  inviteService = mock;
}

export function __resetInviteService() {
  inviteService = new IntegrationApiKeyInviteService();
}

function resolveStatus(error, fallback) {
  const statusCandidates = [
    error?.status,
    error?.statusCode,
    error?.response?.status,
    error?.httpStatus
  ];
  const status = statusCandidates.find((value) => typeof value === 'number' && Number.isInteger(value));
  return status ?? fallback;
}

function resolveMessage(error, fallback) {
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }
  if (typeof error?.response?.data?.message === 'string' && error.response.data.message.trim()) {
    return error.response.data.message;
  }
  return fallback;
}

function normaliseError(error, defaultStatus = 500, defaultMessage = 'Unexpected integration invite error') {
  if (!error) {
    return { status: defaultStatus, message: defaultMessage };
  }
  if (error instanceof Error) {
    const status = resolveStatus(error, defaultStatus);
    const message = resolveMessage(error, defaultMessage);
    return { status, message };
  }
  const status = resolveStatus(error, defaultStatus);
  const message = resolveMessage(error, defaultMessage);
  return { status, message };
}

function normaliseHeaderValue(value) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]).trim() || null : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

function ensureSensitiveResponseHeaders(res) {
  if (typeof res?.set !== 'function') {
    return;
  }

  res.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cross-Origin-Resource-Policy', 'same-origin');
}

function extractSubmissionContext(req) {
  const requestId = normaliseHeaderValue(req?.headers?.['x-request-id'])
    ?? (typeof req?.id === 'string' ? req.id : null)
    ?? (typeof req?.requestId === 'string' ? req.requestId : null);

  const ipAddress = Array.isArray(req?.ips) && req.ips.length > 0
    ? normaliseHeaderValue(req.ips[0])
    : (typeof req?.ip === 'string' ? req.ip : null);

  const userAgent = normaliseHeaderValue(req?.headers?.['user-agent']);
  const origin = normaliseHeaderValue(req?.headers?.origin);

  const actorId = typeof req?.user?.id === 'string'
    ? req.user.id
    : (typeof req?.user?.sub === 'string' ? req.user.sub : null);

  const actorRoles = Array.isArray(req?.user?.roles)
    ? req.user.roles.filter((role) => typeof role === 'string' && role.trim().length > 0)
    : (typeof req?.user?.role === 'string' ? [req.user.role] : []);

  return {
    actorId: actorId ?? null,
    actorRoles: actorRoles.length > 0 ? Array.from(new Set(actorRoles.map((role) => role.trim()))) : null,
    requestId: requestId ?? null,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
    origin: origin ?? null
  };
}

export async function getInvitation(req, res, next) {
  try {
    const { token } = await tokenParamSchema.validateAsync(req.params ?? {}, {
      abortEarly: false,
      stripUnknown: true
    });

    const details = await inviteService.getInvitationDetails(token);
    ensureSensitiveResponseHeaders(res);
    res.json({ success: true, data: details });
  } catch (error) {
    if (error.isJoi) {
      ensureSensitiveResponseHeaders(res);
      res.status(400).json({
        success: false,
        message: 'Invalid invitation token',
        errors: error.details?.map((detail) => detail.message) ?? []
      });
      return;
    }
    const { status, message } = normaliseError(error, 404, 'Invitation not found or expired');
    if (status >= 500) {
      next(error);
      return;
    }
    ensureSensitiveResponseHeaders(res);
    res.status(status).json({ success: false, message });
  }
}

export async function submitInvitation(req, res, next) {
  try {
    const { token } = await tokenParamSchema.validateAsync(req.params ?? {}, {
      abortEarly: false,
      stripUnknown: true
    });

    const payload = await submitInvitationSchema.validateAsync(req.body ?? {}, {
      abortEarly: false,
      stripUnknown: true
    });

    const actorEmailFromContext = typeof req.user?.email === 'string' && isValidEmail(req.user.email)
      ? req.user.email.trim().toLowerCase()
      : null;
    const actorNameFromContext = typeof req.user?.name === 'string'
      ? req.user.name.trim().slice(0, 120)
      : null;

    const normalisedActorName = actorNameFromContext && actorNameFromContext.trim().length > 0
      ? actorNameFromContext
      : null;

    const submission = {
      ...payload,
      actorEmail: payload.actorEmail ?? actorEmailFromContext ?? null,
      actorName: payload.actorName ?? normalisedActorName
    };

    const submissionContext = extractSubmissionContext(req);
    const result = await inviteService.submitInvitation(token, submission, submissionContext);

    req.log?.info(
      {
        inviteToken: token,
        inviteId: result.invite?.id ?? null,
        actor: submission.actorEmail ?? actorEmailFromContext ?? null,
        requestId: submissionContext.requestId ?? null
      },
      'Integration invite fulfilled'
    );

    ensureSensitiveResponseHeaders(res);
    res.status(201).json({
      success: true,
      data: {
        invite: inviteService.sanitize(result.invite),
        apiKey: result.apiKey
      }
    });
  } catch (error) {
    if (error.isJoi) {
      ensureSensitiveResponseHeaders(res);
      res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: error.details?.map((detail) => detail.message) ?? []
      });
      return;
    }
    const { status, message } = normaliseError(error, 400, 'Unable to submit invitation');
    if (status >= 500) {
      next(error);
      return;
    }
    ensureSensitiveResponseHeaders(res);
    res.status(status).json({ success: false, message });
  }
}

export default { getInvitation, submitInvitation };
