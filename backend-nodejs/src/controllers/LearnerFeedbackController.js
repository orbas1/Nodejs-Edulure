import LearnerFeedbackService from '../services/LearnerFeedbackService.js';
import { success } from '../utils/httpResponse.js';

const MAX_STRING_LENGTH = 1000;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sanitiseText(value, maxLength = MAX_STRING_LENGTH) {
  if (value === undefined || value === null) {
    return '';
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function requireString(value, label, maxLength = 255) {
  const trimmed = sanitiseText(value, maxLength);
  if (!trimmed) {
    const error = new Error(`${label} is required`);
    error.status = 400;
    throw error;
  }
  return trimmed;
}

function optionalString(value, maxLength = 255) {
  const trimmed = sanitiseText(value, maxLength);
  return trimmed || undefined;
}

function sanitiseMetadata(value) {
  if (!isPlainObject(value)) {
    return {};
  }
  const entries = Object.entries(value).slice(0, 25);
  const result = {};
  entries.forEach(([key, entry]) => {
    if (entry === undefined) {
      return;
    }
    if (isPlainObject(entry)) {
      result[key] = sanitiseMetadata(entry);
      return;
    }
    if (Array.isArray(entry)) {
      result[key] = entry
        .slice(0, 25)
        .map((item) => (typeof item === 'string' ? sanitiseText(item, 200) : item))
        .filter((item) => item !== undefined && item !== null && item !== '');
      return;
    }
    if (typeof entry === 'string') {
      const trimmed = sanitiseText(entry, 500);
      if (trimmed) {
        result[key] = trimmed;
      }
      return;
    }
    result[key] = entry;
  });
  return result;
}

export default class LearnerFeedbackController {
  static async submitSurvey(req, res, next) {
    try {
      const body = isPlainObject(req.body) ? req.body : {};
      const surveyId = requireString(body.surveyId, 'Survey id');
      const response = requireString(body.response, 'Survey response', 200);
      const questionId = optionalString(body.questionId, 120);
      const channel = optionalString(body.channel, 80) ?? 'learner-dashboard';
      const rating = body.rating != null && Number.isFinite(Number(body.rating))
        ? Number(body.rating)
        : undefined;
      const metadata = sanitiseMetadata(body.metadata);

      const acknowledgement = await LearnerFeedbackService.recordSurveyResponse({
        userId: req.user?.id ?? null,
        surveyId,
        response,
        questionId,
        channel,
        rating,
        metadata
      });

      return success(res, {
        data: acknowledgement,
        message: 'Learner survey response recorded',
        status: 201
      });
    } catch (error) {
      if (!error.status) {
        error.status = 400;
      }
      return next(error);
    }
  }
}
