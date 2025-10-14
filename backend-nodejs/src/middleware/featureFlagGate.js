import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { featureFlagService } from '../services/FeatureFlagService.js';
import { recordFeatureGateDecision } from '../observability/metrics.js';

const DEFAULT_DISABLED_RESPONSE = {
  success: false,
  code: 'feature_disabled',
  message: 'This capability is not currently enabled.'
};

function resolveEvaluationFn(req, overrideEvaluator) {
  if (typeof overrideEvaluator === 'function') {
    return overrideEvaluator;
  }

  if (typeof req.getFeatureFlag === 'function') {
    return (flagKey, context = {}, options = {}) => req.getFeatureFlag(flagKey, context, options);
  }

  return (flagKey, context = {}, options = {}) =>
    featureFlagService.evaluate(
      flagKey,
      { environment: env.nodeEnv, ...context },
      options
    );
}

function buildResponseTemplate(template, fallbackMessage) {
  if (typeof template === 'function') {
    return template;
  }

  if (template && typeof template === 'object') {
    return () => ({ ...DEFAULT_DISABLED_RESPONSE, ...template });
  }

  return () => ({ ...DEFAULT_DISABLED_RESPONSE, message: fallbackMessage ?? DEFAULT_DISABLED_RESPONSE.message });
}

export function createFeatureFlagGate({
  featureFlag,
  defaultState = 'disabled',
  fallbackStatus = 404,
  fallbackMessage,
  responseBody,
  contextResolver,
  evaluationOptions,
  loggerInstance = logger,
  metricsLabels = {},
  evaluator
} = {}) {
  if (!featureFlag) {
    return (_req, _res, next) => next();
  }

  const buildResponse = buildResponseTemplate(responseBody, fallbackMessage);
  const defaultEnabled = defaultState === 'enabled';

  return (req, res, next) => {
    let evaluation;
    try {
      const resolveContext = typeof contextResolver === 'function' ? contextResolver(req) ?? {} : {};
      const evaluate = resolveEvaluationFn(req, evaluator);
      evaluation = evaluate(featureFlag, resolveContext, evaluationOptions ?? {});
    } catch (error) {
      const gateLogger = loggerInstance.child?.({ scope: 'feature-flag-gate', flag: featureFlag }) ?? loggerInstance;
      gateLogger.error({ err: error, path: req.originalUrl }, 'Feature flag evaluation failed');
      error.status = error.status ?? 500;
      error.code = error.code ?? 'feature_gate_evaluation_failed';
      error.scope = error.scope ?? 'feature-flag-gate';
      return next(error);
    }

    const gateLogger = loggerInstance.child?.({ scope: 'feature-flag-gate', flag: featureFlag }) ?? loggerInstance;
    const evaluationExists = evaluation && typeof evaluation === 'object' && evaluation.key === featureFlag;

    let enabled;
    let reason;

    if (evaluationExists) {
      if (evaluation.reason === 'flag-not-found') {
        enabled = defaultEnabled;
        reason = defaultEnabled ? 'default-enabled' : 'default-disabled';
      } else {
        enabled = Boolean(evaluation.enabled);
        reason = evaluation.reason ?? (enabled ? 'enabled' : 'disabled');
      }
    } else {
      enabled = defaultEnabled;
      reason = defaultEnabled ? 'default-enabled' : 'default-disabled';
    }

    recordFeatureGateDecision({
      flagKey: featureFlag,
      result: enabled ? 'allowed' : 'blocked',
      route: metricsLabels.route ?? req.baseUrl ?? 'unknown',
      audience: metricsLabels.audience ?? 'public',
      reason
    });

    if (enabled) {
      if (!req.activeFeatureFlags) {
        req.activeFeatureFlags = {};
      }
      req.activeFeatureFlags[featureFlag] = evaluationExists
        ? evaluation
        : { key: featureFlag, enabled: true, reason, strategy: evaluation?.strategy ?? 'default' };
      return next();
    }

    gateLogger.warn(
      {
        path: req.originalUrl,
        reason,
        evaluation: evaluationExists ? evaluation : null
      },
      'Request blocked by feature flag gate'
    );

    const payload = buildResponse({ req, evaluation, reason, featureFlag });
    payload.success = false;
    payload.code = payload.code ?? 'feature_disabled';
    payload.message = payload.message ?? fallbackMessage ?? DEFAULT_DISABLED_RESPONSE.message;
    payload.flag = featureFlag;
    payload.reason = reason;

    return res.status(fallbackStatus).json(payload);
  };
}

export default createFeatureFlagGate;
