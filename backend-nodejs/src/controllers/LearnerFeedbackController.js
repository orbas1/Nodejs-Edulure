import { generateTelemetryDedupeHash } from '../database/domains/telemetry.js';
import TelemetryEventModel from '../models/TelemetryEventModel.js';
import { success } from '../utils/httpResponse.js';

function normaliseString(value, maxLength = 255) {
  if (value === undefined || value === null) {
    return '';
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function optionalString(value, maxLength = 255) {
  const result = normaliseString(value, maxLength);
  return result || undefined;
}

function createBadRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normaliseScore(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const clamped = Math.max(1, Math.min(5, numeric));
  return Math.round(clamped);
}

function normaliseTags(tags) {
  if (!tags) {
    return [];
  }
  const values = Array.isArray(tags) ? tags : [tags];
  const seen = new Set();
  const result = [];
  for (const entry of values) {
    const value = normaliseString(entry, 60);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= 10) break;
  }
  return result;
}

export default class LearnerFeedbackController {
  static async submitSurvey(req, res, next) {
    try {
      const body = req.body ?? {};
      const surveyId = normaliseString(body.surveyId ?? body.id ?? body.slug, 120);
      if (!surveyId) {
        throw createBadRequest('Survey id is required');
      }

      const score = normaliseScore(body.score ?? body.rating ?? body.value);
      if (score === null) {
        throw createBadRequest('A score between 1 and 5 is required');
      }

      const question = optionalString(body.question ?? body.prompt ?? body.subtitle, 500);
      const comment = optionalString(body.comment ?? body.notes ?? body.feedback, 2048);
      const location = optionalString(body.location ?? body.source, 120) ?? 'learner-dashboard';
      const tags = normaliseTags(body.tags ?? body.labels);
      const context = typeof body.context === 'object' && body.context !== null ? body.context : {};
      const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();

      const payload = {
        surveyId,
        score,
        question,
        comment,
        tags,
        location,
        context
      };

      const dedupeHash = generateTelemetryDedupeHash({
        eventName: 'learner.dashboard.survey_submitted',
        eventVersion: '2024-05',
        occurredAt,
        userId: req.user?.id ?? null,
        payload
      });

      const { event, duplicate } = await TelemetryEventModel.create({
        tenantId: req.user?.tenantId ?? 'global',
        eventName: 'learner.dashboard.survey_submitted',
        eventVersion: '2024-05',
        eventSource: 'learner-dashboard',
        occurredAt,
        receivedAt: new Date(),
        userId: req.user?.id ?? null,
        sessionId: req.user?.sessionId ?? null,
        consentScope: 'product.feedback',
        consentStatus: 'granted',
        ingestionStatus: 'pending',
        payload,
        context: {
          surveyId,
          location,
          actorRole: req.user?.role ?? null
        },
        metadata: {
          duplicate,
          submittedBy: req.user?.id ?? null
        },
        tags: ['learner', 'dashboard', 'pulse-survey'],
        dedupeHash
      });

      return success(res, {
        data: {
          reference: event?.eventUuid ?? surveyId,
          duplicate
        },
        message: duplicate ? 'Feedback received (duplicate)' : 'Feedback submitted'
      });
    } catch (error) {
      if (!error.status) {
        error.status = 400;
      }
      return next(error);
    }
  }
}
