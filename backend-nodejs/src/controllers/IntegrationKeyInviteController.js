import Joi from 'joi';

import IntegrationApiKeyInviteService from '../services/IntegrationApiKeyInviteService.js';
import {
  MAX_ROTATION_DAYS,
  MIN_ROTATION_DAYS,
  MIN_KEY_LENGTH
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

function normaliseError(error, defaultStatus = 500, defaultMessage = 'Unexpected integration invite error') {
  if (!error) {
    return { status: defaultStatus, message: defaultMessage };
  }
  if (typeof error.status === 'number' && error.message) {
    return { status: error.status, message: error.message };
  }
  if (error instanceof Error) {
    return { status: error.status ?? defaultStatus, message: error.message || defaultMessage };
  }
  return { status: defaultStatus, message: defaultMessage };
}

export async function getInvitation(req, res, next) {
  try {
    const { token } = await tokenParamSchema.validateAsync(req.params ?? {}, {
      abortEarly: false,
      stripUnknown: true
    });

    const details = await inviteService.getInvitationDetails(token);
    res.json({ success: true, data: details });
  } catch (error) {
    if (error.isJoi) {
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

    const result = await inviteService.submitInvitation(token, payload);

    res.status(201).json({
      success: true,
      data: {
        invite: inviteService.sanitize(result.invite),
        apiKey: result.apiKey
      }
    });
  } catch (error) {
    if (error.isJoi) {
      res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: error.details?.map((detail) => detail.message) ?? []
      });
      return;
    }
    const { status, message } = normaliseError(error, error.status ?? 400, error.message);
    if (status >= 500) {
      next(error);
      return;
    }
    res.status(status).json({ success: false, message });
  }
}

export default { getInvitation, submitInvitation };
