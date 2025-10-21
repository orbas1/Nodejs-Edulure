import { describe, expect, it } from 'vitest';

import AnalyticsAlertModel from '../src/models/AnalyticsAlertModel.js';
import AnalyticsForecastModel from '../src/models/AnalyticsForecastModel.js';

describe('AnalyticsAlertModel', () => {
  describe('serialize', () => {
    it('normalises severity and stringifies metadata safely', () => {
      const payload = AnalyticsAlertModel.serialize({
        alertCode: 'quota.exceeded',
        severity: 'WARNING',
        message: 'Storage usage exceeded 90%',
        metadata: { threshold: 90 }
      });

      expect(payload.severity).toBe('warning');
      expect(payload.metadata).toBe('{"threshold":90}');
    });

    it('throws when severity is unsupported', () => {
      expect(() =>
        AnalyticsAlertModel.serialize({
          alertCode: 'quota.exceeded',
          severity: 'urgent',
          message: 'Storage usage exceeded 90%'
        })
      ).toThrowError(/Unsupported analytics alert severity/);
    });
  });

  describe('deserialize', () => {
    it('gracefully handles invalid metadata JSON', () => {
      const alert = AnalyticsAlertModel.deserialize({
        id: 1,
        alert_code: 'quota.exceeded',
        severity: 'critical',
        message: 'Storage usage exceeded 90%',
        metadata: '{invalid-json',
        detected_at: '2023-01-01T00:00:00.000Z',
        resolved_at: null
      });

      expect(alert.metadata).toEqual({});
      expect(alert.detectedAt).toBeInstanceOf(Date);
      expect(alert.resolvedAt).toBeNull();
    });
  });
});

describe('AnalyticsForecastModel', () => {
  describe('serialize', () => {
    it('normalises numeric values and stringifies metadata safely', () => {
      const payload = AnalyticsForecastModel.serialize({
        forecastCode: 'mrr',
        targetDate: '2024-01-01',
        metricValue: '120.5',
        lowerBound: -10,
        upperBound: 100,
        metadata: { source: 'model-x' }
      });

      expect(payload.target_date).toBeInstanceOf(Date);
      expect(payload.metric_value).toBe(120.5);
      expect(payload.lower_bound).toBe(0);
      expect(payload.upper_bound).toBe(120.5);
      expect(payload.metadata).toBe('{"source":"model-x"}');
    });

    it('throws when target date is invalid', () => {
      expect(() =>
        AnalyticsForecastModel.serialize({
          forecastCode: 'mrr',
          targetDate: 'not-a-date',
          metricValue: 10
        })
      ).toThrowError(/Invalid analytics forecast date/);
    });
  });

  describe('deserialize', () => {
    it('recovers from malformed metadata JSON', () => {
      const forecast = AnalyticsForecastModel.deserialize({
        id: 10,
        forecast_code: 'mrr',
        target_date: '2024-01-01T00:00:00.000Z',
        metric_value: '200.2',
        lower_bound: '100',
        upper_bound: '250',
        metadata: '--malformed-json--',
        generated_at: '2023-12-31T12:00:00.000Z'
      });

      expect(forecast.metadata).toEqual({});
      expect(forecast.metricValue).toBe(200.2);
      expect(forecast.generatedAt).toBeInstanceOf(Date);
    });
  });
});
