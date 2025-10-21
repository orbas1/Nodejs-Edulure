import { useMemo } from 'react';
import PropTypes from 'prop-types';

import { ensureArray, ensureString, takeItems, getSeverityStyles } from '../utils.js';

function normaliseAlerts(alerts) {
  return takeItems(alerts, 8).map((alert, index) => {
    const id = ensureString(alert?.id, `alert-${index}`);
    const severity = ensureString(alert?.severity, 'info').toLowerCase();
    return {
      id,
      severity,
      detectedLabel: ensureString(alert?.detectedLabel, 'Just now'),
      resolvedLabel: ensureString(alert?.resolvedLabel),
      message: ensureString(alert?.message, 'No additional context available.')
    };
  });
}

function normaliseEvents(events) {
  return takeItems(events, 10).map((event, index) => ({
    id: ensureString(event?.id, `event-${index}`),
    entity: ensureString(event?.entity, 'System'),
    occurredLabel: ensureString(event?.occurredLabel),
    summary: ensureString(event?.summary, 'Activity captured')
  }));
}

export default function AdminActivitySection({ alerts, events, onOpenAnalytics }) {
  const resolvedAlerts = useMemo(() => normaliseAlerts(ensureArray(alerts)), [alerts]);
  const resolvedEvents = useMemo(() => normaliseEvents(ensureArray(events)), [events]);

  return (
    <section id="activity" className="grid gap-6 lg:grid-cols-2">
      <div className="dashboard-section">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Operational alerts</h3>
          <button
            type="button"
            className="dashboard-pill disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onOpenAnalytics}
            disabled={!onOpenAnalytics}
          >
            Open analytics
          </button>
        </div>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          {resolvedAlerts.length === 0 ? (
            <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
              No active alerts. All systems nominal.
            </li>
          ) : (
            resolvedAlerts.map((alert) => (
              <li key={alert.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getSeverityStyles(alert.severity)}`}>
                    {alert.severity || 'info'}
                  </span>
                  <span className="text-xs text-slate-500">{alert.detectedLabel}</span>
                </div>
                <p className="mt-3 font-semibold text-slate-900">{alert.message}</p>
                {alert.resolvedLabel ? <p className="mt-1 text-xs text-slate-500">Resolved {alert.resolvedLabel}</p> : null}
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="dashboard-section">
        <h3 className="text-lg font-semibold text-slate-900">Latest operational activity</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          {resolvedEvents.length === 0 ? (
            <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
              No recent events captured.
            </li>
          ) : (
            resolvedEvents.map((event) => (
              <li key={event.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="uppercase tracking-wide">{event.entity}</span>
                  <span>{event.occurredLabel}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{event.summary}</p>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}

AdminActivitySection.propTypes = {
  alerts: PropTypes.arrayOf(PropTypes.object).isRequired,
  events: PropTypes.arrayOf(PropTypes.object).isRequired,
  onOpenAnalytics: PropTypes.func
};

AdminActivitySection.defaultProps = {
  onOpenAnalytics: undefined
};
