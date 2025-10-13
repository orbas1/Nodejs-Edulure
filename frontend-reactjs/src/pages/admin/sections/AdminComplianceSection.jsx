import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

function MetricCard({ metric }) {
  if (!metric) return null;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{metric.value}</p>
      {metric.change ? (
        <p className="mt-2 text-xs text-slate-500">{metric.change}</p>
      ) : null}
    </div>
  );
}

MetricCard.propTypes = {
  metric: PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    change: PropTypes.string
  })
};

MetricCard.defaultProps = {
  metric: null
};

function ReviewNotesField({ value, onChange, placeholder, disabled }) {
  return (
    <textarea
      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-slate-100"
      rows={2}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

ReviewNotesField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool
};

ReviewNotesField.defaultProps = {
  value: '',
  placeholder: 'Detail why the case requires intervention',
  disabled: false
};

export default function AdminComplianceSection({
  sectionId,
  metrics,
  queue,
  slaBreaches,
  manualReviewQueue,
  onReview
}) {
  const [riskOverrides, setRiskOverrides] = useState({});
  const [notes, setNotes] = useState({});
  const [activeCase, setActiveCase] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const queueItems = useMemo(() => queue ?? [], [queue]);
  const metricItems = useMemo(() => metrics ?? [], [metrics]);

  const defaultRisk = useMemo(() => {
    const overrides = new Map();
    queueItems.forEach((item) => {
      overrides.set(item.id, Number(item.riskScore ?? 0).toFixed(1));
    });
    return overrides;
  }, [queueItems]);

  const handleRiskChange = (caseId, value) => {
    setRiskOverrides((prev) => ({ ...prev, [caseId]: value }));
  };

  const handleNotesChange = (caseId, value) => {
    setNotes((prev) => ({ ...prev, [caseId]: value }));
  };

  const resolveRiskValue = (item) => {
    const override = riskOverrides[item.id];
    if (override !== undefined) {
      return override;
    }
    return defaultRisk.get(item.id) ?? '0.0';
  };

  const triggerReview = async (item, status) => {
    if (!onReview) return;
    const riskScore = Number.parseFloat(resolveRiskValue(item));
    const note = notes[item.id]?.trim() ?? '';

    if (['rejected', 'resubmission_required'].includes(status) && note.length < 5) {
      setError('Provide a clear reason (at least 5 characters) before requesting changes.');
      return;
    }

    const payload = {
      status,
      riskScore: Number.isNaN(riskScore) ? item.riskScore ?? 0 : riskScore,
      escalationLevel: item.escalationLevel ?? 'none',
      policyReferences: []
    };

    if (status !== 'approved') {
      payload.rejectionReason = note;
    }

    setActiveCase(item.id);
    setError(null);
    setSuccessMessage(null);

    try {
      await onReview(item, payload);
      setSuccessMessage(`Case ${item.reference} updated.`);
      setNotes((prev) => ({ ...prev, [item.id]: '' }));
    } catch (reviewError) {
      const message = reviewError?.message ?? 'Failed to submit review decision';
      setError(message);
    } finally {
      setActiveCase(null);
    }
  };

  return (
    <section id={sectionId} className="dashboard-section">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="dashboard-kicker">Compliance oversight</p>
          <h3 className="text-lg font-semibold text-slate-900">Identity verification queue</h3>
          <p className="text-sm text-slate-600">
            Review liveness checks, government ID uploads, and risk scores before enabling payouts or admin access for high-risk
            accounts.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-600">
            {slaBreaches} SLA breach{slaBreaches === 1 ? '' : 'es'}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
            {manualReviewQueue} cases flagged for manual review
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricItems.map((metric) => (
          <MetricCard key={metric.id ?? metric.label} metric={metric} />
        ))}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Documents</th>
              <th className="px-4 py-3">Waiting</th>
              <th className="px-4 py-3">Risk score</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {queueItems.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-900">{item.user?.name ?? 'User'}</div>
                  <div className="text-xs text-slate-500">{item.user?.email}</div>
                  <div className="mt-1 text-xs text-slate-400">Reference {item.reference}</div>
                </td>
                <td className="px-4 py-4 text-sm capitalize text-slate-700">{item.status?.replace(/_/g, ' ')}</td>
                <td className="px-4 py-4 text-sm text-slate-700">
                  {item.documentsSubmitted ?? 0}/{item.documentsRequired ?? 0}
                  <div className="text-xs text-slate-500">
                    Escalation {item.escalationLevel ?? 'none'}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-slate-700">
                  {item.waitingHours !== undefined ? `${Number(item.waitingHours).toFixed(1)}h` : '—'}
                  {item.hasBreachedSla ? (
                    <div className="text-xs font-semibold text-rose-600">SLA exceeded</div>
                  ) : null}
                </td>
                <td className="px-4 py-4">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={resolveRiskValue(item)}
                    onChange={(event) => handleRiskChange(item.id, event.target.value)}
                    className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </td>
                <td className="px-4 py-4">
                  <ReviewNotesField
                    value={notes[item.id] ?? ''}
                    onChange={(value) => handleNotesChange(item.id, value)}
                    disabled={activeCase === item.id}
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => triggerReview(item, 'approved')}
                      disabled={activeCase === item.id}
                      className="inline-flex items-center justify-center rounded-full border border-emerald-500 px-4 py-1 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      {activeCase === item.id ? 'Saving…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerReview(item, 'resubmission_required')}
                      disabled={activeCase === item.id}
                      className="inline-flex items-center justify-center rounded-full border border-amber-500 px-4 py-1 text-sm font-semibold text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      {activeCase === item.id ? 'Saving…' : 'Request resubmission'}
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerReview(item, 'rejected')}
                      disabled={activeCase === item.id}
                      className="inline-flex items-center justify-center rounded-full border border-rose-500 px-4 py-1 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      {activeCase === item.id ? 'Saving…' : 'Reject'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {queueItems.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan="7">
                  All verification cases are up to date. New submissions will appear here automatically.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      {successMessage ? <p className="mt-4 text-sm text-emerald-600">{successMessage}</p> : null}
    </section>
  );
}

AdminComplianceSection.propTypes = {
  sectionId: PropTypes.string,
  metrics: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      change: PropTypes.string
    })
  ),
  queue: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      reference: PropTypes.string,
      status: PropTypes.string,
      documentsSubmitted: PropTypes.number,
      documentsRequired: PropTypes.number,
      waitingHours: PropTypes.number,
      hasBreachedSla: PropTypes.bool,
      riskScore: PropTypes.number,
      escalationLevel: PropTypes.string,
      user: PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
        email: PropTypes.string
      })
    })
  ),
  slaBreaches: PropTypes.number,
  manualReviewQueue: PropTypes.number,
  onReview: PropTypes.func
};

AdminComplianceSection.defaultProps = {
  sectionId: 'compliance',
  metrics: [],
  queue: [],
  slaBreaches: 0,
  manualReviewQueue: 0,
  onReview: null
};
