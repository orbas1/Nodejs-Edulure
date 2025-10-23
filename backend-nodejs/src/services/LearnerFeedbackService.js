import logger from '../config/logger.js';
import TelemetryEventModel from '../models/TelemetryEventModel.js';
import { generateTelemetryDedupeHash } from '../database/domains/telemetry.js';

const log = logger.child({ service: 'LearnerFeedbackService' });

function buildPayload({ surveyId, response, questionId, channel, rating, metadata }) {
  const occurredAt = new Date();
  const payload = {
    eventName: 'learner.survey.submitted',
    eventVersion: 'v1',
    eventSource: 'learner-dashboard',
    occurredAt,
    consentScope: 'product-feedback',
    payload: {
      surveyId,
      response,
      questionId: questionId ?? null,
      channel,
      rating: rating ?? null
    },
    context: {
      surface: metadata?.surface ?? 'dashboard.home',
      courseContext: metadata?.courseContext ?? null,
      suggestedAction: metadata?.suggestedAction ?? null
    },
    metadata: {
      submittedAt: occurredAt.toISOString(),
      priority: metadata?.priority ?? 'standard'
    },
    tags: ['learner', 'survey', channel].filter(Boolean)
  };

  const dedupeHash = generateTelemetryDedupeHash({
    eventName: payload.eventName,
    eventVersion: payload.eventVersion,
    occurredAt,
    userId: metadata?.userId ?? null,
    sessionId: metadata?.sessionId ?? null,
    correlationId: surveyId,
    payload: payload.payload
  });

  return { payload, dedupeHash };
}

export default class LearnerFeedbackService {
  static async recordSurveyResponse({ userId, surveyId, response, questionId, channel, rating, metadata = {} }) {
    if (!surveyId) {
      const error = new Error('surveyId is required');
      error.status = 400;
      throw error;
    }
    if (!response) {
      const error = new Error('response is required');
      error.status = 400;
      throw error;
    }

    const { payload, dedupeHash } = buildPayload({
      surveyId,
      response,
      questionId,
      channel,
      rating,
      metadata: { ...metadata, userId }
    });

    try {
      const { event, duplicate } = await TelemetryEventModel.create(
        {
          ...payload,
          userId,
          dedupeHash
        },
        undefined
      );

      log.info(
        {
          userId,
          surveyId,
          duplicate,
          eventId: event?.eventUuid ?? event?.id ?? null,
          channel
        },
        'Learner survey response recorded'
      );

      return {
        reference: event?.eventUuid ?? surveyId,
        duplicate
      };
    } catch (error) {
      log.error({ err: error, userId, surveyId }, 'Failed to record learner survey response');
      throw error;
    }
  }
}
