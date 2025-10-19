import { Fragment, useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const STATUS_LABELS = {
  submitted: 'Submitted',
  pending_review: 'Pending review',
  resubmission_required: 'Resubmission required',
  approved: 'Approved',
  rejected: 'Rejected'
};

const STATUS_COLORS = {
  submitted: 'bg-sky-50 text-sky-700 ring-sky-200',
  pending_review: 'bg-amber-50 text-amber-700 ring-amber-200',
  resubmission_required: 'bg-rose-50 text-rose-700 ring-rose-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200'
};

const RISK_CATEGORIES = [
  { id: 'low', label: 'Low (0 – 14)', min: 0, max: 15 },
  { id: 'medium', label: 'Medium (15 – 39)', min: 15, max: 40 },
  { id: 'high', label: 'High (40 – 74)', min: 40, max: 75 },
  { id: 'critical', label: 'Critical (75 – 100)', min: 75, max: 101 }
];

const INCIDENT_SEVERITIES = ['critical', 'high', 'medium', 'low'];

function getRiskCategory(score) {
  if (score >= 75) return 'critical';
  if (score >= 40) return 'high';
  if (score >= 15) return 'medium';
  return 'low';
}

function formatHours(hours) {
  if (hours === undefined || hours === null || Number.isNaN(Number(hours))) {
    return '—';
  }
  const rounded = Number(hours).toFixed(1);
  return `${rounded}h`;
}

function MetricCard({ metric = null }) {
  if (!metric) return null;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{metric.value}</p>
      {metric.change ? (
        <p className="mt-2 text-xs text-slate-500">{metric.change}</p>
      ) : null}
      {metric.helper ? (
        <p className="mt-3 text-xs text-slate-400">{metric.helper}</p>
      ) : null}
    </div>
  );
}

MetricCard.propTypes = {
  metric: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    change: PropTypes.string,
    helper: PropTypes.string
  })
};

function StatusBadge({ status = null }) {
  if (!status) return null;
  const key = status.toLowerCase();
  const label = STATUS_LABELS[key] ?? status.replace(/_/g, ' ');
  const tone = STATUS_COLORS[key] ?? 'bg-slate-100 text-slate-700 ring-slate-200';
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string
};

function RiskBadge({ score = 0 }) {
  const numeric = Number(score ?? 0);
  const category = getRiskCategory(numeric);
  const tone =
    category === 'critical'
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : category === 'high'
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : category === 'medium'
          ? 'bg-sky-50 text-sky-700 ring-sky-200'
          : 'bg-emerald-50 text-emerald-700 ring-emerald-200';

  const label = `${numeric.toFixed(1)} (${category})`;

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

RiskBadge.propTypes = {
  score: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

function ReviewNotesField({
  value = '',
  onChange,
  placeholder = 'Detail why the case requires intervention',
  disabled = false
}) {
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

function humanizeAuditEventType(eventType) {
  if (!eventType) {
    return 'Unknown event';
  }

  const segments = String(eventType)
    .split('.')
    .flatMap((part) => part.split('/'))
    .map((part) => part.replace(/[_-]+/g, ' ').trim())
    .filter(Boolean);

  if (!segments.length) {
    return 'Unknown event';
  }

  return segments
    .map((segment) =>
      segment
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(' · ');
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-8 py-16 text-center">
      <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">Queue clear</span>
      <h4 className="mt-3 text-xl font-semibold text-slate-900">All checks are up to date</h4>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        New verification submissions will appear here instantly. Continue to monitor risk scores and escalation levels to maintain platform safety.
      </p>
    </div>
  );
}

function MobileQueueCard({
  item,
  resolveRiskValue,
  handleRiskChange,
  notesValue,
  onNotesChange,
  onTrigger,
  disabled,
  onSelect
}) {
  const riskScore = resolveRiskValue(item);
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900">{item.user?.name ?? 'User'}</p>
          <p className="text-xs text-slate-500">{item.user?.email}</p>
          <p className="mt-1 text-xs text-slate-400">Reference {item.reference}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <StatusBadge status={item.status} />
          <RiskBadge score={riskScore} />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 text-xs text-slate-500">
        <div>
          <dt className="font-semibold uppercase tracking-wide">Documents</dt>
          <dd className="mt-1 text-sm text-slate-700">
            {item.documentsSubmitted ?? 0}/{item.documentsRequired ?? 0}
          </dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wide">Waiting</dt>
          <dd className="mt-1 text-sm text-slate-700">{formatHours(item.waitingHours)}</dd>
          {item.hasBreachedSla ? (
            <dd className="mt-1 text-xs font-semibold text-rose-600">SLA exceeded</dd>
          ) : null}
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wide">Escalation</dt>
          <dd className="mt-1 text-sm capitalize text-slate-700">{item.escalationLevel ?? 'none'}</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wide">Risk override</dt>
          <dd className="mt-1">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={riskScore}
              onChange={(event) => handleRiskChange(item.id, event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reviewer notes</p>
        <ReviewNotesField value={notesValue} onChange={onNotesChange} disabled={disabled} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onTrigger(item, 'approved')}
          disabled={disabled}
          className="inline-flex flex-1 items-center justify-center rounded-full border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          {disabled ? 'Saving…' : 'Approve'}
        </button>
        <button
          type="button"
          onClick={() => onTrigger(item, 'resubmission_required')}
          disabled={disabled}
          className="inline-flex flex-1 items-center justify-center rounded-full border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          {disabled ? 'Saving…' : 'Request resubmission'}
        </button>
        <button
          type="button"
          onClick={() => onTrigger(item, 'rejected')}
          disabled={disabled}
          className="inline-flex flex-1 items-center justify-center rounded-full border border-rose-500 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          {disabled ? 'Saving…' : 'Reject'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
      >
        View detailed record
      </button>
    </article>
  );
}

MobileQueueCard.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.number.isRequired
  }).isRequired,
  resolveRiskValue: PropTypes.func.isRequired,
  handleRiskChange: PropTypes.func.isRequired,
  notesValue: PropTypes.string.isRequired,
  onNotesChange: PropTypes.func.isRequired,
  onTrigger: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired
};

function ComplianceTabNavigation({ activeTab, onSelect }) {
  const tabs = [
    { id: 'queue', label: 'Identity verification queue' },
    { id: 'gdpr', label: 'UK GDPR & ICO oversight' },
    { id: 'audits', label: 'Audit & attestations' },
    { id: 'frameworks', label: 'Frameworks' },
    { id: 'risk', label: 'Risk heatmap' },
    { id: 'incidents', label: 'Incident response' },
    { id: 'evidence', label: 'Evidence exports' }
  ];

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Compliance views">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isActive
                ? 'bg-primary text-white shadow'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

ComplianceTabNavigation.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired
};

export default function AdminComplianceSection({
  sectionId = 'compliance',
  metrics = [],
  queue = [],
  slaBreaches = 0,
  manualReviewQueue = 0,
  gdprProfile = {},
  audits = {},
  attestations = {},
  frameworks = [],
  risk = {},
  incidentResponse = {},
  evidence = {},
  onReview = () => {}
}) {
  const [riskOverrides, setRiskOverrides] = useState({});
  const [notes, setNotes] = useState({});
  const [activeCase, setActiveCase] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('queue');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [escalationFilter, setEscalationFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const queueItems = useMemo(() => queue ?? [], [queue]);
  const metricItems = useMemo(() => metrics ?? [], [metrics]);

  const defaultRisk = useMemo(() => {
    const overrides = new Map();
    queueItems.forEach((item) => {
      overrides.set(item.id, Number(item.riskScore ?? 0).toFixed(1));
    });
    return overrides;
  }, [queueItems]);

  const gdpr = useMemo(() => gdprProfile ?? {}, [gdprProfile]);

  const statusOptions = useMemo(() => {
    const statuses = new Set(queueItems.map((item) => item.status).filter(Boolean));
    return ['all', ...Array.from(statuses)];
  }, [queueItems]);

  const escalationOptions = useMemo(() => {
    const escalations = new Set(queueItems.map((item) => item.escalationLevel ?? 'none'));
    return ['all', ...Array.from(escalations)];
  }, [queueItems]);

  const queueSummary = useMemo(() => {
    if (!queueItems.length) {
      return { averageRisk: '0.0', averageWaiting: '0.0', escalations: 0 };
    }
    const totalRisk = queueItems.reduce((acc, item) => acc + Number(item.riskScore ?? 0), 0);
    const totalWaiting = queueItems.reduce((acc, item) => acc + Number(item.waitingHours ?? 0), 0);
    const escalations = queueItems.filter((item) => (item.escalationLevel ?? 'none') !== 'none').length;
    return {
      averageRisk: (totalRisk / queueItems.length).toFixed(1),
      averageWaiting: (totalWaiting / queueItems.length).toFixed(1),
      escalations
    };
  }, [queueItems]);

  const handleRiskChange = (caseId, value) => {
    setRiskOverrides((prev) => ({ ...prev, [caseId]: value }));
  };

  const handleNotesChange = (caseId, value) => {
    setNotes((prev) => ({ ...prev, [caseId]: value }));
  };

  const resolveRiskValue = useCallback(
    (item) => {
      const override = riskOverrides[item.id];
      if (override !== undefined) {
        return override;
      }
      return defaultRisk.get(item.id) ?? '0.0';
    },
    [riskOverrides, defaultRisk]
  );

  const filteredQueue = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return queueItems.filter((item) => {
      const statusMatches =
        statusFilter === 'all' || !item.status ? true : item.status === statusFilter;
      const riskMatches = (() => {
        if (riskFilter === 'all') return true;
        const score = Number(resolveRiskValue(item));
        const category = getRiskCategory(score);
        return category === riskFilter;
      })();
      const escalationMatches =
        escalationFilter === 'all'
          ? true
          : (item.escalationLevel ?? 'none') === escalationFilter;
      const termMatches =
        !term ||
        [item.reference, item.user?.name, item.user?.email]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      return statusMatches && riskMatches && escalationMatches && termMatches;
    });
  }, [queueItems, statusFilter, riskFilter, escalationFilter, searchQuery, resolveRiskValue]);

  const sortedQueue = useMemo(() => {
    return [...filteredQueue].sort((a, b) => {
      const riskDiff = Number(resolveRiskValue(b)) - Number(resolveRiskValue(a));
      if (riskDiff !== 0) {
        return riskDiff;
      }
      return Number(b.waitingHours ?? 0) - Number(a.waitingHours ?? 0);
    });
  }, [filteredQueue, resolveRiskValue]);

  const selectedCase = useMemo(
    () => sortedQueue.find((item) => item.id === selectedCaseId) ?? null,
    [sortedQueue, selectedCaseId]
  );

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
      policyReferences: item.verification?.policyReferences ?? []
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

  const renderQueueTable = () => (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
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
          {sortedQueue.map((item) => {
            const riskScore = resolveRiskValue(item);
            return (
              <tr key={item.id} className="align-top hover:bg-slate-50/60">
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => setSelectedCaseId(item.id)}
                    className="text-left"
                  >
                    <div className="font-semibold text-slate-900">{item.user?.name ?? 'User'}</div>
                    <div className="text-xs text-slate-500">{item.user?.email}</div>
                    <div className="mt-1 text-xs text-slate-400">Reference {item.reference}</div>
                  </button>
                </td>
                <td className="px-4 py-4 text-sm text-slate-700">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-4 text-sm text-slate-700">
                  {item.documentsSubmitted ?? 0}/{item.documentsRequired ?? 0}
                  <div className="text-xs text-slate-500">
                    Escalation {item.escalationLevel ?? 'none'}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-slate-700">
                  {formatHours(item.waitingHours)}
                  {item.hasBreachedSla ? (
                    <div className="text-xs font-semibold text-rose-600">SLA exceeded</div>
                  ) : null}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-2">
                    <RiskBadge score={riskScore} />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={riskScore}
                      onChange={(event) => handleRiskChange(item.id, event.target.value)}
                      className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
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
            );
          })}
          {sortedQueue.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-sm text-slate-500" colSpan={7}>
                All verification cases are up to date. New submissions will appear here automatically.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );

  const renderMobileQueue = () => (
    <div className="grid gap-4 lg:hidden">
      {sortedQueue.map((item) => (
        <MobileQueueCard
          key={item.id}
          item={item}
          resolveRiskValue={resolveRiskValue}
          handleRiskChange={handleRiskChange}
          notesValue={notes[item.id] ?? ''}
          onNotesChange={(value) => handleNotesChange(item.id, value)}
          onTrigger={triggerReview}
          disabled={activeCase === item.id}
          onSelect={setSelectedCaseId}
        />
      ))}
      {sortedQueue.length === 0 ? <EmptyState /> : null}
    </div>
  );

  const renderSelectedCase = () => {
    if (!selectedCase) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500">
          Select a case to inspect document metadata, policy references, and retention controls.
        </div>
      );
    }

    const policyReferences = selectedCase.verification?.policyReferences ?? [];
    const documents = selectedCase.verification?.documents ?? [];

    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Case reference</p>
            <h4 className="mt-1 text-xl font-semibold text-slate-900">{selectedCase.reference}</h4>
            <p className="text-sm text-slate-500">{selectedCase.user?.name} · {selectedCase.user?.email}</p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <StatusBadge status={selectedCase.status} />
            <RiskBadge score={resolveRiskValue(selectedCase)} />
          </div>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documents</dt>
            <dd className="mt-2 text-sm text-slate-700">
              {selectedCase.documentsSubmitted ?? 0}/{selectedCase.documentsRequired ?? 0} supplied
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Waiting time</dt>
            <dd className="mt-2 text-sm text-slate-700">{formatHours(selectedCase.waitingHours)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Escalation</dt>
            <dd className="mt-2 text-sm capitalize text-slate-700">{selectedCase.escalationLevel ?? 'none'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">SLA state</dt>
            <dd className="mt-2 text-sm text-slate-700">{selectedCase.hasBreachedSla ? 'Breached' : 'In target'}</dd>
          </div>
        </dl>

        <div className="mt-6 space-y-3">
          <h5 className="text-sm font-semibold text-slate-900">Policy references</h5>
          {policyReferences.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {policyReferences.map((reference) => (
                <span
                  key={reference}
                  className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  {reference}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No specific policy references were logged for this submission.</p>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <h5 className="text-sm font-semibold text-slate-900">Submitted documents</h5>
          {documents.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-600">
              {documents.map((document) => (
                <li key={document.id ?? document.type} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <span className="font-medium text-slate-700">{document.label ?? document.type}</span>
                  <span className="text-xs uppercase tracking-wide text-slate-400">{document.status ?? 'submitted'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Document metadata will appear once uploads complete.</p>
          )}
        </div>
      </div>
    );
  };

  const severityPalette = {
    passing: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    watch: 'bg-amber-50 text-amber-700 ring-amber-200',
    attention: 'bg-rose-50 text-rose-700 ring-rose-200'
  };

  const auditSummary = useMemo(() => audits ?? {}, [audits]);
  const attestationSummary = useMemo(() => attestations ?? {}, [attestations]);
  const frameworkItems = useMemo(() => frameworks ?? [], [frameworks]);
  const riskSummary = useMemo(() => risk ?? {}, [risk]);
  const incidentSummary = useMemo(() => incidentResponse ?? {}, [incidentResponse]);
  const evidenceSummary = useMemo(() => evidence ?? {}, [evidence]);

  const renderGdprSummary = () => {
    const dsar = gdpr.dsar ?? {};
    const registers = Array.isArray(gdpr.registers) ? gdpr.registers : [];
    const controls = gdpr.controls ?? {};
    const ico = gdpr.ico ?? null;

    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Open DSARs', value: dsar.open ?? 0, helper: `${dsar.completed30d ?? 0} closed in last 30d` },
            { label: 'Due within SLA', value: dsar.dueSoon ?? 0, helper: `SLA ${dsar.slaHours ?? 72}h` },
            { label: 'Overdue requests', value: dsar.overdue ?? 0, helper: 'Escalate to privacy ops' },
            { label: 'Avg. completion time', value: `${dsar.averageCompletionHours ?? 0}h`, helper: `DPO: ${dsar.owner ?? 'Data Protection Officer'}` }
          ].map((card) => (
            <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{card.value}</p>
              <p className="mt-2 text-xs text-slate-500">{card.helper}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-900">Regulatory registers & reviews</h4>
          <p className="mt-2 text-sm text-slate-600">
            Maintain a defensible audit trail by ensuring each register is owned, up to date, and reviewed within agreed cadences.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {registers.map((register) => (
              <article key={register.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-sm font-semibold text-slate-900">{register.name}</h5>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {register.status?.replace(/_/g, ' ') ?? 'current'}
                  </span>
                </div>
                <dl className="space-y-2 text-xs text-slate-500">
                  <div>
                    <dt className="font-semibold uppercase tracking-wide">Owner</dt>
                    <dd className="mt-1 text-sm text-slate-700">{register.owner ?? 'Assigned'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wide">Last reviewed</dt>
                    <dd className="mt-1 text-sm text-slate-700">{register.lastReviewed ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wide">Next review</dt>
                    <dd className="mt-1 text-sm text-slate-700">{register.nextReviewDue ?? '—'}</dd>
                  </div>
                </dl>
                {Array.isArray(register.coverage) && register.coverage.length > 0 ? (
                  <div className="text-xs text-slate-500">
                    <p className="font-semibold uppercase tracking-wide">Coverage</p>
                    <ul className="mt-2 space-y-1">
                      {register.coverage.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-slate-600">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {register.retentionPolicy ? (
                  <p className="text-xs text-slate-500">{register.retentionPolicy}</p>
                ) : null}
              </article>
            ))}
            {registers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
                No register metadata supplied. Configure GDPR_REGISTERS in runtime config to surface ownership and review cadences.
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-slate-900">Operational controls</h4>
            <p className="mt-2 text-sm text-slate-600">
              Track readiness of breach notification playbooks, DPIAs, vendor due diligence, staff training, and encryption controls.
            </p>
            <dl className="mt-6 space-y-4">
              {Object.entries(controls).map(([controlKey, controlValue]) => (
                <div key={controlKey} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {controlKey.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (match) => match.toUpperCase())}
                    </p>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                      {(controlValue.status ?? 'current').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    {Object.entries(controlValue)
                      .filter(([key]) => key !== 'status')
                      .map(([key, value]) => (
                        <div key={key}>
                          <p className="font-semibold uppercase tracking-wide">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</p>
                          <p className="mt-1 text-sm text-slate-700">{Array.isArray(value) ? value.join(', ') : String(value ?? '—')}</p>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              {Object.keys(controls).length === 0 ? (
                <p className="text-sm text-slate-500">No control metadata supplied.</p>
              ) : null}
            </dl>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-slate-900">Payments &amp; wallet guardrails</h4>
            <p className="mt-2 text-sm text-slate-600">
              Keep the non-custodial ledger healthy, document provider-led compensation, and align with
              Apple platform guidance.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                <span>
                  Daily double-entry reconciliation confirms provider debits equal serviceman credits;
                  flag any imbalance above £10 immediately.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                <span>
                  Wallets remain non-custodial so Blackwellen Ltd avoids holding client money and stays
                  outside FCA authorisation—document settlement routing for every provider.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                <span>
                  Providers must disclose serviceman pay before acceptance and retain evidence of local
                  wage compliance.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                <span>
                  Apple App Store submissions should note that checkout completes on the web under
                  Guideline 3.1.3 and that no digital goods unlock in-app without IAP.
                </span>
              </li>
            </ul>
          </article>

          {ico ? (
            <article className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-slate-100 shadow-lg">
              <h4 className="text-lg font-semibold text-white">ICO registration</h4>
              <p className="mt-2 text-sm text-slate-200">
                Maintain an active registration with the Information Commissioner’s Office. Review status, renewal cycle, and ownership below.
              </p>
              <dl className="mt-6 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-300">Registration number</dt>
                  <dd className="mt-1 text-base font-semibold text-white">{ico.registrationNumber ?? '—'}</dd>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-300">Status</dt>
                    <dd className="mt-1 text-sm text-slate-100">{ico.status ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-300">Fee tier</dt>
                    <dd className="mt-1 text-sm text-slate-100">{ico.feeTier ?? '—'}</dd>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-300">Renewal due</dt>
                    <dd className="mt-1 text-sm text-slate-100">{ico.renewalDue ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-300">Last submitted</dt>
                    <dd className="mt-1 text-sm text-slate-100">{ico.lastSubmitted ?? '—'}</dd>
                  </div>
                </div>
                {ico.publicRegisterUrl ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-300">Public register</dt>
                    <dd className="mt-1 text-sm text-slate-100">
                      <a
                        href={ico.publicRegisterUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-primary-200 underline decoration-primary-400 decoration-dotted underline-offset-4 hover:text-primary-100"
                      >
                        View ICO listing
                      </a>
                    </dd>
                  </div>
                ) : null}
                {ico.reportingOwner ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-300">Reporting owner</dt>
                    <dd className="mt-1 text-sm text-slate-100">{ico.reportingOwner}</dd>
                  </div>
                ) : null}
              </dl>
            </article>
          ) : (
            <article className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              Provide ICO registration metadata to surface renewal and ownership tracking in the console.
            </article>
          )}
        </div>
      </div>
    );
  };

  const renderAuditSummary = () => {
    const severityCounts = auditSummary.countsBySeverity ?? {};
    const totals = auditSummary.totals ?? {};
    const latestEvents = Array.isArray(auditSummary.latestEvents) ? auditSummary.latestEvents.slice(0, 8) : [];
    const attestationPolicies = Array.isArray(attestationSummary.policies) ? attestationSummary.policies : [];
    const coverage = Number(attestationSummary.totals?.coverage ?? 0).toFixed(1);

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard metric={{ label: 'Critical audit events', value: String(severityCounts.critical ?? 0) }} />
          <MetricCard metric={{ label: 'High severity', value: String(severityCounts.error ?? 0) }} />
          <MetricCard metric={{ label: 'Investigations', value: String(totals.investigations ?? 0) }} />
          <MetricCard metric={{ label: 'Controls tested (30d)', value: String(totals.controlsTested ?? 0) }} />
          <MetricCard metric={{ label: 'Policy updates', value: String(totals.policyUpdates ?? 0) }} />
          <MetricCard
            metric={{
              label: 'Attestation coverage',
              value: `${coverage}%`,
              helper: `${attestationSummary.totals?.outstanding ?? 0} outstanding` 
            }}
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-900">Recent audit trail</h4>
          <p className="mt-2 text-sm text-slate-600">Events resolved via automation and manual review over the last 30 days.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Event</th>
                  <th className="px-4 py-3 text-left">Severity</th>
                  <th className="px-4 py-3 text-left">Entity</th>
                  <th className="px-4 py-3 text-left">Actor</th>
                  <th className="px-4 py-3 text-left">Occurred</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestEvents.map((event) => (
                  <tr key={event.eventUuid}>
                    <td className="px-4 py-3 font-medium text-slate-700">{humanizeAuditEventType(event.eventType)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
                          event.severity === 'critical'
                            ? 'bg-rose-50 text-rose-700 ring-rose-200'
                            : event.severity === 'error'
                              ? 'bg-amber-50 text-amber-700 ring-amber-200'
                              : 'bg-slate-100 text-slate-700 ring-slate-200'
                        }`}
                      >
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="font-medium text-slate-700">{event.entityType}</div>
                      <div className="text-xs text-slate-400">{event.entityId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="font-medium text-slate-700">{event.actor?.role ?? 'system'}</div>
                      <div className="text-xs text-slate-400">{event.actor?.type ?? 'system'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(event.occurredAt).toLocaleString()}</td>
                  </tr>
                ))}
                {latestEvents.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-500" colSpan={5}>
                      No audit events recorded within the selected window.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-900">Policy attestations</h4>
          <p className="mt-2 text-sm text-slate-600">
            Track consent and policy acknowledgements by role to ensure operating procedures stay enforceable.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Policy</th>
                  <th className="px-4 py-3 text-left">Coverage</th>
                  <th className="px-4 py-3 text-left">Required</th>
                  <th className="px-4 py-3 text-left">Outstanding</th>
                  <th className="px-4 py-3 text-left">Last granted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attestationPolicies.map((policy) => (
                  <tr key={policy.consentType}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{policy.policy?.title ?? policy.consentType}</div>
                      <div className="text-xs text-slate-400">Audience: {policy.audience?.join(', ') ?? 'All'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{policy.coverage}%</td>
                    <td className="px-4 py-3 text-slate-600">{policy.required}</td>
                    <td className="px-4 py-3 text-slate-600">{policy.outstanding}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {policy.lastGrantedAt ? new Date(policy.lastGrantedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
                {attestationPolicies.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-500" colSpan={5}>
                      No attestation activity recorded. Capture consent records to unlock coverage reporting.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderFrameworkSummary = () => {
    if (!frameworkItems.length) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          Add compliance framework metadata to surface accreditation owners, renewal dates, and readiness metrics.
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {frameworkItems.map((framework) => {
          const tone = severityPalette[framework.status] ?? 'bg-slate-100 text-slate-700 ring-slate-200';
          return (
            <article key={framework.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">{framework.name}</h4>
                  <p className="mt-1 text-sm text-slate-600">{framework.description}</p>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}>
                  Status: {framework.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner</dt>
                  <dd className="mt-1 text-slate-700">{framework.owner ?? 'Assigned'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Renewal due</dt>
                  <dd className="mt-1 text-slate-700">{framework.renewalDue ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outstanding actions</dt>
                  <dd className="mt-1 text-slate-700">{framework.outstandingActions ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Controls tested</dt>
                  <dd className="mt-1 text-slate-700">{framework.controlsTested ?? 0}</dd>
                </div>
                {framework.coverage !== undefined ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coverage</dt>
                    <dd className="mt-1 text-slate-700">{framework.coverage}%</dd>
                  </div>
                ) : null}
              </dl>
            </article>
          );
        })}
      </div>
    );
  };

  const renderRiskOverview = () => {
    const heatmap = Array.isArray(riskSummary.heatmap) ? riskSummary.heatmap : [];
    const severityTotals = riskSummary.severityTotals ?? {};
    const exposures = Array.isArray(riskSummary.exposures) ? riskSummary.exposures : [];

    return (
      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-900">Incident heatmap</h4>
          <p className="mt-2 text-sm text-slate-600">Distribution of open incidents by category and severity.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Category</th>
                  {INCIDENT_SEVERITIES.map((severity) => (
                    <th key={severity} className="px-4 py-3 text-left capitalize">
                      {severity}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {heatmap.map((row) => (
                  <tr key={row.category}>
                    <td className="px-4 py-3 font-medium text-slate-700">{row.label}</td>
                    {row.severities.map((severity) => (
                      <td key={severity.severity} className="px-4 py-3 text-slate-600">
                        {severity.count}
                      </td>
                    ))}
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.total}</td>
                  </tr>
                ))}
                {heatmap.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-500" colSpan={INCIDENT_SEVERITIES.length + 2}>
                      No active incidents recorded.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="text-base font-semibold text-slate-900">Severity distribution</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {INCIDENT_SEVERITIES.map((severity) => (
                <li key={severity} className="flex items-center justify-between">
                  <span className="capitalize">{severity}</span>
                  <span className="font-semibold">{severityTotals[severity] ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="text-base font-semibold text-slate-900">Top exposures</h4>
            <ul className="mt-3 space-y-3 text-sm text-slate-600">
              {exposures.map((exposure) => (
                <li key={exposure.category} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{exposure.label}</span>
                    <span className="text-xs uppercase tracking-wide text-slate-500">{exposure.dominantSeverity}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{exposure.total} open · {exposure.watchers} watchers engaged</p>
                </li>
              ))}
              {exposures.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">
                  No exposures surfaced. Heatmap will populate as incidents are recorded.
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderIncidentResponse = () => {
    const summary = incidentSummary.queueSummary ?? {};
    const flows = Array.isArray(incidentSummary.flows) ? incidentSummary.flows : [];
    const recentResolved = Array.isArray(incidentSummary.recentResolved) ? incidentSummary.recentResolved : [];

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            metric={{
              label: 'Median acknowledgement',
              value: summary.medianAckMinutes ? `${summary.medianAckMinutes} mins` : '—',
              helper: `${summary.ackBreaches ?? 0} SLA breaches`
            }}
          />
          <MetricCard
            metric={{
              label: 'Resolution breaches',
              value: String(summary.resolutionBreaches ?? 0)
            }}
          />
          <MetricCard metric={{ label: 'Watchers engaged', value: String(summary.watchers ?? 0) }} />
          <MetricCard metric={{ label: 'Oldest incident', value: summary.oldestOpenAt ? new Date(summary.oldestOpenAt).toLocaleString() : '—' }} />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-900">Active incident runbooks</h4>
          <p className="mt-2 text-sm text-slate-600">Runbook execution state and escalation points for each open incident.</p>
          <div className="mt-4 space-y-3">
            {flows.map((flow) => (
              <article key={flow.incidentUuid} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h5 className="text-sm font-semibold text-slate-900">{flow.reference}</h5>
                    <p className="text-xs text-slate-500">{flow.detectionChannel}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-rose-600">
                      {flow.severity}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 text-slate-700">
                      {flow.status}
                    </span>
                  </div>
                </div>
                <dl className="mt-3 grid gap-3 text-xs text-slate-500 sm:grid-cols-3">
                  <div>
                    <dt className="font-semibold uppercase tracking-wide">Reported</dt>
                    <dd className="mt-1 text-sm text-slate-700">{flow.reportedAt ? new Date(flow.reportedAt).toLocaleString() : '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wide">Watchers</dt>
                    <dd className="mt-1 text-sm text-slate-700">{flow.watchers}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wide">Recommended actions</dt>
                    <dd className="mt-1 text-sm text-slate-700">{flow.recommendedActions.join(', ') || 'No runbook actions captured'}</dd>
                  </div>
                </dl>
                {flow.timeline.length ? (
                  <ul className="mt-3 space-y-2 text-xs text-slate-500">
                    {flow.timeline.map((event) => (
                      <li key={event.id} className="flex items-center gap-3">
                        <span className="inline-flex h-2 w-2 flex-none rounded-full bg-primary" aria-hidden="true" />
                        <span className="font-semibold text-slate-700">{event.type}</span>
                        <span>{new Date(event.occurredAt).toLocaleString()}</span>
                        <span className="text-slate-400">{event.actor?.role ?? 'system'}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
            {flows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                No active incident runbooks. New incidents will populate here automatically.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-900">Recently resolved</h4>
          <p className="mt-2 text-sm text-slate-600">Resolution timing and follow-up tasks for the latest closed incidents.</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {recentResolved.map((incident) => (
              <li key={incident.incidentUuid} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between">
                  <span className="font-semibold text-slate-800">{incident.reference}</span>
                  <span className="text-xs uppercase tracking-wide text-slate-500">{incident.severity}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Resolved {incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : '—'} ·
                  Time to resolution {incident.resolutionMinutes ?? '—'} mins
                </p>
                {incident.followUp ? <p className="mt-2 text-xs text-slate-500">{incident.followUp}</p> : null}
              </li>
            ))}
            {recentResolved.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">
                No recently resolved incidents documented.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    );
  };

  const renderEvidenceExports = () => {
    const exports = Array.isArray(evidenceSummary.exports) ? evidenceSummary.exports : [];
    const permissions = evidenceSummary.permissions ?? {};
    const storageInfo = evidenceSummary.storage ?? {};

    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-900">Access controls</h4>
          <dl className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Permitted roles</dt>
              <dd className="mt-1 text-slate-700">{(permissions.roles ?? []).join(', ') || 'Admin only'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request channel</dt>
              <dd className="mt-1 text-slate-700">{permissions.requestChannel ?? 'Contact security operations'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Archive bucket</dt>
              <dd className="mt-1 text-slate-700">{storageInfo.bucket ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prefix</dt>
              <dd className="mt-1 text-slate-700">{storageInfo.prefix ?? '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-900">Evidence exports</h4>
          <p className="mt-2 text-sm text-slate-600">Partitioned exports ready for external audit or regulatory submission.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Dataset</th>
                  <th className="px-4 py-3 text-left">Partition</th>
                  <th className="px-4 py-3 text-left">Rows</th>
                  <th className="px-4 py-3 text-left">Size</th>
                  <th className="px-4 py-3 text-left">Archived</th>
                  <th className="px-4 py-3 text-left">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exports.map((archive) => (
                  <tr key={archive.id}>
                    <td className="px-4 py-3 font-medium text-slate-700">{archive.tableName}</td>
                    <td className="px-4 py-3 text-slate-600">{archive.partitionName}</td>
                    <td className="px-4 py-3 text-slate-600">{archive.rowCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600">{archive.sizeLabel}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {archive.archivedAt ? new Date(archive.archivedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {archive.downloadUrl ? (
                        <a
                          href={archive.downloadUrl}
                          className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary/90"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Request secure link</span>
                      )}
                    </td>
                  </tr>
                ))}
                {exports.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-500" colSpan={6}>
                      No evidence exports recorded. Trigger a partition rotation or archive export to populate this list.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id={sectionId} className="dashboard-section">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="dashboard-kicker">Compliance oversight</p>
          <h3 className="text-lg font-semibold text-slate-900">Identity verification & GDPR controls</h3>
          <p className="text-sm text-slate-600">
            Review liveness checks, government ID uploads, and risk scores before enabling payouts or admin access for high-risk accounts. Monitor UK GDPR duties, DSAR cadence, and ICO registrations alongside the verification queue.
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

      <div className="mt-8 flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <ComplianceTabNavigation activeTab={activeTab} onSelect={setActiveTab} />
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
              {queueItems.length} queued
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
              Avg risk {queueSummary.averageRisk}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
              Avg wait {queueSummary.averageWaiting}h
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
              Escalations {queueSummary.escalations}
            </span>
          </div>
        </div>

        {activeTab === 'queue' ? (
          <Fragment>
            <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="w-full sm:max-w-xs">
                    <label htmlFor="compliance-search" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Search queue
                    </label>
                    <input
                      id="compliance-search"
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by name, email, or reference"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:flex-1 sm:flex-wrap">
                    <div className="flex-1">
                      <label htmlFor="status-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </label>
                      <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {statusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option === 'all' ? 'All statuses' : STATUS_LABELS[option] ?? option.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label htmlFor="risk-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Risk band
                      </label>
                      <select
                        id="risk-filter"
                        value={riskFilter}
                        onChange={(event) => setRiskFilter(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="all">All risk bands</option>
                        {RISK_CATEGORIES.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label htmlFor="escalation-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Escalation
                      </label>
                      <select
                        id="escalation-filter"
                        value={escalationFilter}
                        onChange={(event) => setEscalationFilter(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {escalationOptions.map((option) => (
                          <option key={option} value={option}>
                            {option === 'all' ? 'All escalation levels' : option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {renderQueueTable()}
                {renderMobileQueue()}
              </div>
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reviewer guidance</p>
                  <ul className="mt-2 list-disc space-y-2 pl-4">
                    <li>Only approve once document integrity, liveness, and sanction checks are validated.</li>
                    <li>Capture rejection rationale that references the applicable policy clause for auditability.</li>
                    <li>Escalate critical risk scores (75+) to the duty manager via the incident rota.</li>
                  </ul>
                </div>
                {renderSelectedCase()}
              </div>
            </div>
          </Fragment>
        ) : null}
        {activeTab === 'gdpr' ? renderGdprSummary() : null}
        {activeTab === 'audits' ? renderAuditSummary() : null}
        {activeTab === 'frameworks' ? renderFrameworkSummary() : null}
        {activeTab === 'risk' ? renderRiskOverview() : null}
        {activeTab === 'incidents' ? renderIncidentResponse() : null}
        {activeTab === 'evidence' ? renderEvidenceExports() : null}
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
      change: PropTypes.string,
      helper: PropTypes.string
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
      verification: PropTypes.shape({
        policyReferences: PropTypes.arrayOf(PropTypes.string),
        documents: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
            type: PropTypes.string,
            status: PropTypes.string,
            label: PropTypes.string
          })
        )
      }),
      user: PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
        email: PropTypes.string
      })
    })
  ),
  slaBreaches: PropTypes.number,
  manualReviewQueue: PropTypes.number,
  gdprProfile: PropTypes.shape({
    dsar: PropTypes.shape({
      open: PropTypes.number,
      dueSoon: PropTypes.number,
      overdue: PropTypes.number,
      completed30d: PropTypes.number,
      averageCompletionHours: PropTypes.number,
      slaHours: PropTypes.number,
      owner: PropTypes.string,
      nextIcoSubmission: PropTypes.string
    }),
    registers: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        owner: PropTypes.string,
        status: PropTypes.string,
        lastReviewed: PropTypes.string,
        nextReviewDue: PropTypes.string,
        coverage: PropTypes.arrayOf(PropTypes.string),
        retentionPolicy: PropTypes.string
      })
    ),
    controls: PropTypes.object,
    ico: PropTypes.shape({
      registrationNumber: PropTypes.string,
      status: PropTypes.string,
      feeTier: PropTypes.string,
      renewalDue: PropTypes.string,
      lastSubmitted: PropTypes.string,
      publicRegisterUrl: PropTypes.string,
      reportingOwner: PropTypes.string
    })
  }),
  audits: PropTypes.shape({
    totals: PropTypes.shape({
      events: PropTypes.number,
      investigations: PropTypes.number,
      controlsTested: PropTypes.number,
      policyUpdates: PropTypes.number
    }),
    countsBySeverity: PropTypes.object,
    latestEvents: PropTypes.arrayOf(
      PropTypes.shape({
        eventUuid: PropTypes.string,
        eventType: PropTypes.string,
        severity: PropTypes.string,
        entityType: PropTypes.string,
        entityId: PropTypes.string,
        occurredAt: PropTypes.string,
        actor: PropTypes.shape({
          id: PropTypes.number,
          type: PropTypes.string,
          role: PropTypes.string
        })
      })
    )
  }),
  attestations: PropTypes.shape({
    totals: PropTypes.shape({
      required: PropTypes.number,
      granted: PropTypes.number,
      outstanding: PropTypes.number,
      coverage: PropTypes.number
    }),
    policies: PropTypes.arrayOf(
      PropTypes.shape({
        consentType: PropTypes.string,
        policy: PropTypes.shape({
          title: PropTypes.string
        }),
        audience: PropTypes.arrayOf(PropTypes.string),
        required: PropTypes.number,
        outstanding: PropTypes.number,
        coverage: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        lastGrantedAt: PropTypes.string
      })
    )
  }),
  frameworks: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      status: PropTypes.string,
      owner: PropTypes.string,
      renewalDue: PropTypes.string,
      outstandingActions: PropTypes.number,
      controlsTested: PropTypes.number,
      coverage: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      description: PropTypes.string
    })
  ),
  risk: PropTypes.shape({
    heatmap: PropTypes.arrayOf(
      PropTypes.shape({
        category: PropTypes.string,
        label: PropTypes.string,
        total: PropTypes.number,
        severities: PropTypes.arrayOf(
          PropTypes.shape({ severity: PropTypes.string, count: PropTypes.number })
        )
      })
    ),
    severityTotals: PropTypes.object,
    exposures: PropTypes.arrayOf(
      PropTypes.shape({
        category: PropTypes.string,
        label: PropTypes.string,
        total: PropTypes.number,
        dominantSeverity: PropTypes.string,
        watchers: PropTypes.number
      })
    )
  }),
  incidentResponse: PropTypes.shape({
    queueSummary: PropTypes.object,
    flows: PropTypes.arrayOf(
      PropTypes.shape({
        incidentUuid: PropTypes.string,
        reference: PropTypes.string,
        severity: PropTypes.string,
        status: PropTypes.string,
        reportedAt: PropTypes.string,
        watchers: PropTypes.number,
        recommendedActions: PropTypes.arrayOf(PropTypes.string),
        timeline: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string,
            type: PropTypes.string,
            occurredAt: PropTypes.string,
            severity: PropTypes.string,
            actor: PropTypes.shape({
              id: PropTypes.number,
              type: PropTypes.string,
              role: PropTypes.string
            })
          })
        )
      })
    ),
    recentResolved: PropTypes.arrayOf(
      PropTypes.shape({
        incidentUuid: PropTypes.string,
        reference: PropTypes.string,
        severity: PropTypes.string,
        resolvedAt: PropTypes.string,
        resolutionMinutes: PropTypes.number,
        followUp: PropTypes.string
      })
    )
  }),
  evidence: PropTypes.shape({
    exports: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        tableName: PropTypes.string,
        partitionName: PropTypes.string,
        rowCount: PropTypes.number,
        sizeLabel: PropTypes.string,
        archivedAt: PropTypes.string,
        downloadUrl: PropTypes.string
      })
    ),
    permissions: PropTypes.shape({
      roles: PropTypes.arrayOf(PropTypes.string),
      requestChannel: PropTypes.string
    }),
    storage: PropTypes.shape({
      bucket: PropTypes.string,
      prefix: PropTypes.string
    })
  }),
  onReview: PropTypes.func
};
