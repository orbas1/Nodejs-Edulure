import { useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ArrowUpRightIcon,
  BoltIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  FlagIcon,
  InboxIcon,
  QueueListIcon,
  ShieldCheckIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import DashboardStateMessage from '../../../components/dashboard/DashboardStateMessage.jsx';
import AdminCrudResource from '../../../components/dashboard/admin/AdminCrudResource.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import useSupportDashboard from '../../../hooks/useSupportDashboard.js';
import useExecutiveDashboard from '../../../hooks/useExecutiveDashboard.js';
import useTrustSafetyDashboard from '../../../hooks/useTrustSafetyDashboard.js';
import { createAdminControlResourceConfigs } from './adminControlConfig.jsx';

const verificationReviewOptions = [
  { value: 'approved', label: 'Approve' },
  { value: 'rejected', label: 'Reject' },
  { value: 'resubmission_required', label: 'Request resubmission' }
];

const escalationOptions = [
  { value: 'none', label: 'None' },
  { value: 't1', label: 'Tier 1' },
  { value: 't2', label: 'Tier 2' },
  { value: 't3', label: 'Tier 3' }
];

const scamStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'triage', label: 'In triage' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'action_required', label: 'Action required' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'ignored', label: 'Ignored' }
];

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1
  }).format(value > 1 ? value / 100 : value);
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function formatRelative(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 60) return relativeTime.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeTime.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  return relativeTime.format(-days, 'day');
}

function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (input) => String(input).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoString(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isExternalUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function MetricCard({ icon: Icon, label, value, helper, tone = 'default' }) {
  const toneClass = useMemo(() => {
    switch (tone) {
      case 'critical':
        return 'border-rose-200 bg-rose-50 text-rose-800';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-800';
      case 'positive':
        return 'border-emerald-200 bg-emerald-50 text-emerald-800';
      default:
        return 'border-slate-200 bg-white text-slate-900';
    }
  }, [tone]);

  return (
    <div className={clsx('flex flex-col gap-3 rounded-2xl border p-5 shadow-sm', toneClass)}>
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide">
        {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
        {label}
      </div>
      <div className="text-3xl font-semibold">{value}</div>
      {helper ? <div className="text-xs text-slate-600">{helper}</div> : null}
    </div>
  );
}

function SectionHeader({ title, kicker, description, icon: Icon, actions }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        {kicker ? <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kicker}</p> : null}
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-6 w-6 text-primary" aria-hidden="true" /> : null}
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        </div>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function VerificationQueue({
  verification,
  onReview,
  actionState,
  loading,
  error,
  onRefresh
}) {
  const [activeId, setActiveId] = useState(null);
  const [formState, setFormState] = useState({
    status: 'approved',
    riskScore: 0,
    rejectionReason: '',
    escalationLevel: 'none',
    policyReferences: ''
  });

  const queue = Array.isArray(verification?.queue) ? verification.queue : [];
  const metrics = Array.isArray(verification?.metrics) ? verification.metrics : [];

  const handleSelect = (id) => {
    setActiveId((current) => (current === id ? null : id));
    setFormState({
      status: 'approved',
      riskScore: 0,
      rejectionReason: '',
      escalationLevel: 'none',
      policyReferences: ''
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!activeId) {
      return;
    }
    const policyReferences = formState.policyReferences
      ? formState.policyReferences
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];
    onReview({
      verificationId: activeId,
      status: formState.status,
      rejectionReason: formState.rejectionReason || null,
      riskScore: Number(formState.riskScore) || 0,
      escalationLevel: formState.escalationLevel,
      policyReferences
    });
  };

  if (loading) {
    return (
      <DashboardStateMessage
        variant="loading"
        title="Loading verification queue"
        description="Fetching pending reviews and SLA status."
      />
    );
  }

  if (error) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Unable to load verification requests"
        description={error?.message ?? 'Trust & Safety queue is temporarily unavailable.'}
        actionLabel="Retry"
        onAction={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-6">
      {metrics.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.id}
              icon={CheckBadgeIcon}
              label={metric.label}
              value={metric.value}
              helper={metric.change ?? null}
              tone={metric.id?.includes('sla') ? 'warning' : 'default'}
            />
          ))}
        </div>
      ) : null}

      {queue.length ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Applicant
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Risk
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Submitted
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  SLA
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {queue.map((item) => (
                <tr key={item.id} className={clsx('align-top transition hover:bg-primary/5', activeId === item.id && 'bg-primary/5')}>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{item.user?.name ?? 'User'}</p>
                    <p className="text-xs text-slate-500">{item.user?.email ?? 'No email on file'}</p>
                    <p className="mt-1 text-xs text-slate-500">Documents: {item.documentsSubmitted} / {item.documentsRequired}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <p className="font-semibold">{Number(item.riskScore ?? 0).toFixed(1)}</p>
                    <p className="text-xs text-slate-500">Escalation: {item.escalationLevel ?? 'none'}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <p>{formatDateTime(item.lastSubmittedAt)}</p>
                    <p className="text-xs text-slate-500">Waiting {item.waitingHours}h</p>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <span
                      className={clsx(
                        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                        item.hasBreachedSla
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      )}
                    >
                      {item.hasBreachedSla ? 'Breached' : 'Within SLA'}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">{formatRelative(item.lastSubmittedAt)}</p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={clsx(
                        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition',
                        activeId === item.id
                          ? 'border-primary bg-primary text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'
                      )}
                    >
                      {activeId === item.id ? 'Collapse' : 'Review'}
                      <ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <DashboardStateMessage
          variant="empty"
          title="All identity checks are clear"
          description="No pending verification reviews. You will be notified when new packages arrive."
        />
      )}

      {activeId ? (
        <form className="space-y-4 rounded-3xl border border-primary/40 bg-primary/5 p-6" onSubmit={handleSubmit}>
          <h3 className="text-sm font-semibold text-primary">Review decision</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Outcome
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={formState.status}
                onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))}
              >
                {verificationReviewOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Risk score
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={formState.riskScore}
                onChange={(event) => setFormState((prev) => ({ ...prev, riskScore: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Escalation
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={formState.escalationLevel}
                onChange={(event) => setFormState((prev) => ({ ...prev, escalationLevel: event.target.value }))}
              >
                {escalationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Policy references
              <input
                type="text"
                placeholder="AML-102, KYC-Playbook"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={formState.policyReferences}
                onChange={(event) => setFormState((prev) => ({ ...prev, policyReferences: event.target.value }))}
              />
              <p className="text-xs text-slate-500">Comma separated values for audit tagging.</p>
            </label>
          </div>
          {formState.status !== 'approved' ? (
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Rejection reason
              <textarea
                required
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={formState.rejectionReason}
                onChange={(event) => setFormState((prev) => ({ ...prev, rejectionReason: event.target.value }))}
              />
            </label>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Decision applies to verification package <span className="font-semibold">{activeId}</span>.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary/90"
                disabled={actionState.status === 'pending'}
              >
                {actionState.status === 'pending' ? 'Submitting…' : 'Submit decision'}
              </button>
            </div>
          </div>
          {actionState.message ? (
            <p className={clsx('text-xs', actionState.status === 'error' ? 'text-rose-600' : 'text-emerald-600')}>
              {actionState.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

function ScamReportTable({
  reports,
  pagination,
  filters,
  loading,
  error,
  onRefresh,
  onFiltersChange,
  onUpdate,
  lastUpdated
}) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusDraft, setStatusDraft] = useState('investigating');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [riskDraft, setRiskDraft] = useState('');
  const [handledByDraft, setHandledByDraft] = useState('');
  const [reasonDraft, setReasonDraft] = useState('');
  const [resolvedAtDraft, setResolvedAtDraft] = useState('');
  const [updateState, setUpdateState] = useState({ status: 'idle', message: null });

  const items = Array.isArray(reports) ? reports : [];
  const safeFilters = filters ?? {};
  const statusFilterValue = safeFilters.status ?? 'pending';
  const currentPage = pagination?.page ?? safeFilters.page ?? 1;
  const safePerPage = pagination?.perPage ?? safeFilters.perPage ?? (items.length || 1);
  const totalItems = pagination?.total ?? items.length;
  const pageCount = pagination?.pageCount ?? Math.max(1, Math.ceil(totalItems / (safePerPage || 1)));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * safePerPage + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(startItem + safePerPage - 1, totalItems);
  const canPrev = currentPage > 1;
  const canNext = currentPage < pageCount;
  const lastUpdatedLabel = lastUpdated ? formatRelative(lastUpdated) : null;

  const resetDrafts = () => {
    setStatusDraft('investigating');
    setDescriptionDraft('');
    setRiskDraft('');
    setHandledByDraft('');
    setReasonDraft('');
    setResolvedAtDraft('');
  };

  const handleSelect = (report) => {
    if (selectedReport?.id === report.id) {
      setSelectedReport(null);
      resetDrafts();
      setUpdateState({ status: 'idle', message: null });
      return;
    }
    setSelectedReport(report);
    setStatusDraft(report.status ?? 'pending');
    setDescriptionDraft(report.description ?? '');
    setRiskDraft(
      report.riskScore === null || report.riskScore === undefined ? '' : String(report.riskScore)
    );
    setHandledByDraft(report.handledBy ? String(report.handledBy) : '');
    setReasonDraft(report.reason ?? '');
    setResolvedAtDraft(toDateTimeLocalValue(report.resolvedAt));
    setUpdateState({ status: 'idle', message: null });
  };

  const handleStatusFilterChange = (event) => {
    const newStatus = event.target.value;
    onFiltersChange?.({ ...safeFilters, status: newStatus, page: 1 });
    onRefresh?.({ status: newStatus, page: 1 });
  };

  const handleManualRefresh = () => {
    onRefresh?.({ page: currentPage, status: statusFilterValue });
  };

  const handlePageChange = (direction) => {
    if (direction === 'prev' && !canPrev) return;
    if (direction === 'next' && !canNext) return;
    const nextPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
    onFiltersChange?.({ ...safeFilters, page: nextPage });
    onRefresh?.({ page: nextPage, status: statusFilterValue });
  };

  const handleResolvedNow = () => {
    setResolvedAtDraft(toDateTimeLocalValue(new Date()));
  };

  if (loading) {
    return (
      <DashboardStateMessage
        variant="loading"
        title="Loading scam reports"
        description="Syncing moderation queue and escalations."
      />
    );
  }

  if (error) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Unable to load scam reports"
        description={error?.message ?? 'Community moderation queue unavailable.'}
        actionLabel="Retry"
        onAction={() => onRefresh?.({ page: currentPage, status: statusFilterValue })}
      />
    );
  }

  const evidence =
    selectedReport?.evidence && Array.isArray(selectedReport.evidence)
      ? selectedReport.evidence
      : [];
  const contextEntries =
    selectedReport && selectedReport.context && typeof selectedReport.context === 'object'
      ? Object.entries(selectedReport.context)
      : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Status filter
          <select
            className="ml-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={statusFilterValue}
            onChange={handleStatusFilterChange}
          >
            {scamStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleManualRefresh}
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
        >
          <ArrowPathIcon className="h-4 w-4" aria-hidden="true" /> Refresh
        </button>
        {lastUpdatedLabel ? (
          <span className="text-xs text-slate-500">Last synced {lastUpdatedLabel}</span>
        ) : null}
      </div>

      {items.length ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Entity
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Risk
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((report) => (
                <tr
                  key={report.id}
                  className={clsx(
                    'align-top transition hover:bg-amber-50',
                    selectedReport?.id === report.id && 'bg-amber-50'
                  )}
                >
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{report.entityType}</p>
                    <p className="text-xs text-slate-500">#{report.entityId}</p>
                    <p className="text-xs text-slate-500">Report {report.publicId ?? report.id}</p>
                    <p className="mt-1 text-xs text-slate-500">Community: {report.communityId ?? 'N/A'}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <p className="font-semibold">{report.reason}</p>
                    <p className="text-xs text-slate-500">
                      {report.description ?? 'No description provided.'}
                    </p>
                    <p className="text-xs text-slate-500">Channel: {report.channel ?? 'in_app'}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <span
                      className={clsx(
                        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                        report.riskScore >= 70
                          ? 'bg-rose-100 text-rose-700'
                          : report.riskScore >= 40
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      )}
                    >
                      {Number(report.riskScore ?? 0).toFixed(1)}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">{formatRelative(report.createdAt)}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <p className="font-semibold capitalize">{report.status?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-500">
                      Handled by {report.handledBy ?? 'unassigned'}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleSelect(report)}
                      className={clsx(
                        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition',
                        selectedReport?.id === report.id
                          ? 'border-amber-400 bg-amber-100 text-amber-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-amber-500 hover:text-amber-600'
                      )}
                    >
                      {selectedReport?.id === report.id ? 'Collapse' : 'Update'}
                      <AdjustmentsHorizontalIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <DashboardStateMessage
          variant="empty"
          title="No scam reports awaiting review"
          description="Great news—no trust & safety escalations require action right now."
        />
      )}

      {selectedReport ? (
        <div className="grid gap-4 lg:grid-cols-[3fr,2fr]">
          <form
            className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50/60 p-6"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!selectedReport) {
                return;
              }
              setUpdateState({ status: 'pending', message: null });
              try {
                const updates = {
                  status: statusDraft,
                  description: descriptionDraft || null
                };
                if (riskDraft !== '' && Number.isFinite(Number(riskDraft))) {
                  updates.riskScore = Number(riskDraft);
                }
                if (handledByDraft !== '') {
                  updates.handledBy = Number(handledByDraft);
                }
                if (reasonDraft) {
                  updates.reason = reasonDraft;
                }
                if (resolvedAtDraft) {
                  const iso = toIsoString(resolvedAtDraft);
                  if (iso) {
                    updates.resolvedAt = iso;
                  }
                } else if (statusDraft === 'resolved') {
                  updates.resolvedAt = new Date().toISOString();
                }
                const result = await onUpdate({
                  reportId: selectedReport.publicId ?? selectedReport.id,
                  updates
                });
                if (result === false) {
                  setUpdateState({
                    status: 'error',
                    message: 'Unable to update scam report. Review the case details and try again.'
                  });
                  return;
                }
                setUpdateState({ status: 'idle', message: null });
                resetDrafts();
                setSelectedReport(null);
              } catch (submissionError) {
                setUpdateState({
                  status: 'error',
                  message: submissionError?.message ?? 'Unable to submit update.'
                });
              }
            }}
          >
            <h3 className="text-sm font-semibold text-amber-700">Update scam report</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-amber-800">
                Status
                <select
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  value={statusDraft}
                  onChange={(event) => setStatusDraft(event.target.value)}
                >
                  {scamStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-amber-800">
                Risk score
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  value={riskDraft}
                  onChange={(event) => setRiskDraft(event.target.value)}
                />
                <span className="text-xs text-amber-600">0 is informational, 100 is critical.</span>
              </label>
              <label className="space-y-1 text-sm font-medium text-amber-800">
                Assigned analyst (user id)
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  value={handledByDraft}
                  onChange={(event) => setHandledByDraft(event.target.value)}
                  placeholder="Leave blank to keep unassigned"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-amber-800">
                Resolution timestamp
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    value={resolvedAtDraft}
                    onChange={(event) => setResolvedAtDraft(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleResolvedNow}
                    className="inline-flex items-center rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:border-amber-500"
                  >
                    Stamp now
                  </button>
                </div>
                <span className="text-xs text-amber-600">
                  Leave blank to set automatically when marking as resolved.
                </span>
              </label>
              <label className="md:col-span-2 space-y-1 text-sm font-medium text-amber-800">
                Analyst notes
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  value={descriptionDraft}
                  onChange={(event) => setDescriptionDraft(event.target.value)}
                />
              </label>
              <label className="md:col-span-2 space-y-1 text-sm font-medium text-amber-800">
                Resolution summary
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  value={reasonDraft}
                  onChange={(event) => setReasonDraft(event.target.value)}
                  placeholder="Outline actions taken or why the case was dismissed."
                />
              </label>
            </div>
            {updateState.status === 'error' ? (
              <p className="text-xs font-semibold text-rose-600">{updateState.message}</p>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedReport(null);
                  resetDrafts();
                  setUpdateState({ status: 'idle', message: null });
                }}
                className="rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-700 hover:border-amber-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-amber-700"
                disabled={updateState.status === 'pending'}
              >
                {updateState.status === 'pending' ? 'Saving…' : 'Save update'}
              </button>
            </div>
          </form>
          <aside className="space-y-4 rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
            <div className="space-y-1 text-xs text-amber-800">
              <p className="font-semibold text-amber-700">Case metadata</p>
              <p>Report ID: {selectedReport.publicId ?? selectedReport.id}</p>
              <p>Entity: {selectedReport.entityType}</p>
              <p>Channel: {selectedReport.channel ?? 'in_app'}</p>
              <p>Submitted: {formatDateTime(selectedReport.createdAt)}</p>
              <p>Updated: {formatDateTime(selectedReport.updatedAt ?? selectedReport.createdAt)}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-700">Evidence</h4>
              {evidence.length ? (
                <ul className="mt-2 space-y-2 text-sm">
                  {evidence.map((item, index) => (
                    <li
                      key={`${item.type}-${index}`}
                      className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3"
                    >
                      <p className="text-xs uppercase tracking-wide text-amber-600">{item.type}</p>
                      {isExternalUrl(item.value) ? (
                        <a
                          href={item.value}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-700 underline"
                        >
                          Open evidence
                        </a>
                      ) : (
                        <p className="break-words text-slate-700">{item.value}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-500">No supporting evidence attached.</p>
              )}
            </div>
            {contextEntries.length ? (
              <div>
                <h4 className="text-sm font-semibold text-amber-700">Context</h4>
                <dl className="mt-2 space-y-2 text-sm">
                  {contextEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700"
                    >
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {key}
                      </dt>
                      <dd className="mt-1">
                        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          Showing {startItem}-{endItem} of {totalItems} reports
          {lastUpdatedLabel ? ` · Updated ${lastUpdatedLabel}` : ''}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange('prev')}
            disabled={!canPrev}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-amber-400 hover:text-amber-600"
          >
            Previous
          </button>
          <span className="font-semibold text-slate-700">
            Page {currentPage} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange('next')}
            disabled={!canNext}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-amber-400 hover:text-amber-600"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
function NetworkManagement({
  state,
  onScopeChange,
  onApprove,
  onDecline,
  onRemoveFollower,
  onFollow,
  onUnfollow,
  loading
}) {
  const [scopeInput, setScopeInput] = useState('');
  const [followInput, setFollowInput] = useState('');
  const [followMessage, setFollowMessage] = useState('');

  const handleScopeSubmit = (event) => {
    event.preventDefault();
    onScopeChange(scopeInput.trim() ? Number(scopeInput.trim()) : null);
  };

  const handleFollowSubmit = (event) => {
    event.preventDefault();
    if (!followInput.trim()) return;
    onFollow(Number(followInput.trim()), followMessage ? { reason: followMessage } : {});
    setFollowInput('');
    setFollowMessage('');
  };

  return (
    <div className="space-y-6">
      <form className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3" onSubmit={handleScopeSubmit}>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Member scope (user ID)
            <input
              type="number"
              min="1"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Enter a user ID to moderate their network"
              value={scopeInput}
              onChange={(event) => setScopeInput(event.target.value)}
            />
          </label>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary/90"
          >
            <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />
            Load network
          </button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Pending requests</h3>
            <QueueListIcon className="h-5 w-5 text-amber-500" aria-hidden="true" />
          </div>
          {loading ? (
            <p className="text-xs text-slate-500">Loading pending approvals…</p>
          ) : state.pending.length ? (
            <ul className="space-y-2 text-sm">
              {state.pending.map((request) => (
                <li key={request.id ?? request.userId} className="rounded-2xl border border-slate-200 p-3">
                  <p className="font-semibold text-slate-900">{request.name ?? request.email ?? `User #${request.userId}`}</p>
                  <p className="text-xs text-slate-500">{request.email ?? 'No email provided'}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onApprove(request.userId ?? request.id)}
                      className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-600"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecline(request.userId ?? request.id)}
                      className="inline-flex flex-1 items-center justify-center rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:border-rose-400"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No pending approvals for this member.</p>
          )}
        </div>
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Followers</h3>
            <UserGroupIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          {loading ? (
            <p className="text-xs text-slate-500">Loading followers…</p>
          ) : state.followers.length ? (
            <ul className="space-y-2 text-sm">
              {state.followers.map((follower) => (
                <li key={follower.id ?? follower.userId} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                  <div>
                    <p className="font-semibold text-slate-900">{follower.name ?? follower.email ?? `User #${follower.userId}`}</p>
                    <p className="text-xs text-slate-500">{follower.email ?? '—'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveFollower?.(follower.userId ?? follower.id)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-rose-400 hover:text-rose-600"
                    disabled={loading}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No followers for this scope yet.</p>
          )}
        </div>
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Following</h3>
            <ArrowUpRightIcon className="h-5 w-5 text-slate-500" aria-hidden="true" />
          </div>
          {loading ? (
            <p className="text-xs text-slate-500">Loading following list…</p>
          ) : state.following.length ? (
            <ul className="space-y-2 text-sm">
              {state.following.map((entry) => (
                <li key={entry.id ?? entry.userId} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                  <div>
                    <p className="font-semibold text-slate-900">{entry.name ?? entry.email ?? `User #${entry.userId}`}</p>
                    <p className="text-xs text-slate-500">{entry.email ?? '—'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnfollow(entry.userId ?? entry.id)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-rose-400 hover:text-rose-600"
                  >
                    Unfollow
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Scope is not following anyone yet.</p>
          )}
        </div>
      </div>

      <form className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3" onSubmit={handleFollowSubmit}>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Follow user ID
            <input
              type="number"
              min="1"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={followInput}
              onChange={(event) => setFollowInput(event.target.value)}
              required
            />
          </label>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Message (optional)
            <input
              type="text"
              placeholder="Explain why this connection is recommended"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={followMessage}
              onChange={(event) => setFollowMessage(event.target.value)}
            />
          </label>
        </div>
        <div className="md:col-span-3 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary/90"
          >
            <UserGroupIcon className="h-4 w-4" aria-hidden="true" />
            Send follow invite
          </button>
        </div>
      </form>
    </div>
  );
}

function SupportSnapshot({ data, loading, error, onRefresh }) {
  if (loading) {
    return (
      <DashboardStateMessage
        variant="loading"
        title="Loading support inbox"
        description="Syncing open requests and SLA metrics."
      />
    );
  }

  if (error && !data) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Unable to load support data"
        description={error.message ?? 'Support tenant response unavailable.'}
        actionLabel="Retry"
        onAction={onRefresh}
      />
    );
  }

  const stats = data?.queue?.stats ?? {};

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={InboxIcon}
        label="Open requests"
        value={formatNumber(stats.open)}
        helper="Active conversations in inbox"
      />
      <MetricCard
        icon={BoltIcon}
        label="SLA attainment"
        value={formatPercent(stats.slaAttainment ?? 0.0)}
        helper="Within current window"
      />
      <MetricCard
        icon={CheckCircleIcon}
        label="CSAT"
        value={formatPercent(stats.csat ?? 0.0)}
        helper="Customer satisfaction score"
        tone={stats.csat && stats.csat >= 0.9 ? 'positive' : 'default'}
      />
      <MetricCard
        icon={AcademicCapIcon}
        label="First response"
        value={stats.firstResponseMinutes ? `${formatNumber(stats.firstResponseMinutes)} mins` : '—'}
        helper="Median time to first reply"
      />
    </div>
  );
}

function TimelineFeed({ entries, loading, error, onRefresh }) {
  if (loading) {
    return (
      <DashboardStateMessage
        variant="loading"
        title="Loading live feed"
        description="Capturing incident and release updates."
      />
    );
  }

  if (error) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Live feed unavailable"
        description={error.message ?? 'Executive timeline is currently offline.'}
        actionLabel="Retry"
        onAction={onRefresh}
      />
    );
  }

  if (!entries.length) {
    return (
      <DashboardStateMessage
        variant="empty"
        title="No timeline events"
        description="Runbooks will populate here when incidents, releases, or governance updates publish."
      />
    );
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <span className="mt-1 h-2 w-2 flex-none rounded-full bg-primary" aria-hidden="true" />
          <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wide">{entry.severity ?? 'info'}</span>
              <span>{formatDateTime(entry.timestamp)}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{entry.label}</p>
            <p className="text-sm text-slate-600">{entry.description ?? 'No description available.'}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function AdminTrustSafety() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const {
    verification,
    verificationLoading,
    verificationError,
    verificationActionState,
    refreshVerification,
    handleVerificationReview,
    scamReports,
    scamLoading,
    scamError,
    scamPagination,
    scamFilters,
    setScamFilters,
    refreshScamReports,
    handleScamReportUpdate,
    networkState,
    refreshNetwork,
    handleNetworkScopeChange,
    handleApproveFollower,
    handleDeclineFollower,
    handleRemoveFollower,
    handleFollowUser,
    handleUnfollowUser,
    feedback,
    setFeedback,
    outstandingRequests,
    scamLastUpdated
  } = useTrustSafetyDashboard();

  const {
    data: supportData,
    loading: supportLoading,
    error: supportError,
    refresh: refreshSupport
  } = useSupportDashboard({ pollIntervalMs: 240_000 });

  const {
    data: executiveData,
    loading: executiveLoading,
    error: executiveError,
    refresh: refreshExecutive
  } = useExecutiveDashboard({ pollIntervalMs: 300_000 });

  const resourceConfigs = useMemo(() => createAdminControlResourceConfigs(), []);
  const [catalogueTab, setCatalogueTab] = useState('courses');

  if (!token) {
    return (
      <DashboardStateMessage
        title="Administrator access required"
        description="Sign in with an administrator account to manage trust & safety operations."
      />
    );
  }

  const timelineEntries = executiveData?.incidents?.timeline ?? [];

  return (
    <div className="space-y-10">
      <header className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4 rounded-3xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Trust &amp; Safety command</p>
          <h1 className="text-3xl font-semibold text-slate-900">Live identity, moderation, and network operations</h1>
          <p className="text-sm text-slate-600">
            Monitor identity verification queue, moderate scam reports, and oversee social graph health—all in one workspace.
            Every action logs to the compliance ledger and updates the executive timeline instantly.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>Authenticated as {session?.user?.email ?? 'admin'}</span>
            <button
              type="button"
              onClick={() => {
                refreshVerification();
                refreshScamReports();
                refreshNetwork();
                refreshSupport();
                refreshExecutive();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-semibold text-primary"
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" /> Sync all data
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
          <video
            className="h-full w-full object-cover"
            controls
            poster="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80"
          >
            <source src="https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4" type="video/mp4" />
            Your browser does not support embedded training videos. Download the runbook to review.
          </video>
          <div className="border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
            Trust &amp; Safety playbook walkthrough · 02:48
          </div>
        </div>
      </header>

      {feedback ? (
        <div
          className={clsx(
            'flex items-center justify-between rounded-2xl border px-4 py-3 text-sm',
            feedback.tone === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          )}
        >
          <span>{feedback.message}</span>
          <button type="button" className="text-xs font-semibold underline" onClick={() => setFeedback(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="space-y-6" id="verification">
        <SectionHeader
          kicker="Identity"
          title="Verification requests"
          description="Approve learner and instructor identity packages, escalate for manual review, and track SLA risk."
          icon={CheckBadgeIcon}
          actions={[
            <button
              key="refresh"
              type="button"
              onClick={refreshVerification}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white px-3 py-1 text-xs font-semibold text-primary"
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" /> Refresh
            </button>
          ]}
        />
        <VerificationQueue
          verification={verification}
          loading={verificationLoading}
          error={verificationError}
          onReview={handleVerificationReview}
          actionState={verificationActionState}
          onRefresh={refreshVerification}
        />
      </section>

      <section className="space-y-6" id="reports">
        <SectionHeader
          kicker="Safety"
          title="Report buttons & scam checks"
          description="Process abuse reports submitted via community report buttons. Update status, append analyst notes, and confirm mitigations."
          icon={FlagIcon}
          actions={[
            <button
              key="pending"
              type="button"
              onClick={() => setScamFilters({ ...scamFilters, status: 'pending' })}
              className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-600 hover:border-amber-500"
            >
              Pending
            </button>,
            <button
              key="escalated"
              type="button"
              onClick={() => setScamFilters({ ...scamFilters, status: 'escalated' })}
              className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
            >
              Escalated
            </button>
          ]}
        />
        <ScamReportTable
          reports={scamReports}
          pagination={scamPagination}
          filters={scamFilters}
          loading={scamLoading}
          error={scamError}
          onRefresh={refreshScamReports}
          onFiltersChange={setScamFilters}
          onUpdate={handleScamReportUpdate}
          lastUpdated={scamLastUpdated}
        />
      </section>

      <section className="space-y-6" id="network">
        <SectionHeader
          kicker="Network"
          title="Graph moderation"
          description="Approve follow requests, prune risky connections, and orchestrate curated introductions across the network."
          icon={UserGroupIcon}
          actions={[
            <span key="scope" className="text-xs font-semibold text-slate-500">
              Active scope: {networkState.userId ?? 'not selected'}
            </span>
          ]}
        />
        <NetworkManagement
          state={networkState}
          onScopeChange={handleNetworkScopeChange}
          onApprove={handleApproveFollower}
          onDecline={handleDeclineFollower}
          onRemoveFollower={handleRemoveFollower}
          onFollow={handleFollowUser}
          onUnfollow={handleUnfollowUser}
          loading={networkState.loading}
        />
      </section>

      <section className="space-y-6" id="communities">
        <SectionHeader
          kicker="Communities"
          title="Community workspaces"
          description="Launch or update community hubs with full CRUD controls, metadata management, and visibility toggles."
          icon={UserGroupIcon}
          actions={null}
        />
        <AdminCrudResource
          token={token}
          title={resourceConfigs.communities.title}
          description={resourceConfigs.communities.description}
          entityName={resourceConfigs.communities.entityName}
          listRequest={({ token: authToken, params, signal, context }) =>
            resourceConfigs.communities.listRequest({ token: authToken, params, signal, context })
          }
          createRequest={({ token: authToken, payload, context }) =>
            resourceConfigs.communities.createRequest({ token: authToken, payload, context })
          }
          updateRequest={({ token: authToken, id, payload, context }) =>
            resourceConfigs.communities.updateRequest(id, { token: authToken, payload, context })
          }
          deleteRequest={({ token: authToken, id, context }) =>
            resourceConfigs.communities.deleteRequest(id, { token: authToken, context })
          }
          fields={resourceConfigs.communities.fields}
          columns={resourceConfigs.communities.columns}
          searchPlaceholder="Search communities"
        />
      </section>

      <section className="space-y-6" id="catalogue">
        <SectionHeader
          kicker="Catalogue"
          title="Learning catalogue management"
          description="Operate courses and digital assets end-to-end with production-ready CRUD workflows."
          icon={AcademicCapIcon}
          actions={[
            <div key="tabs" className="flex flex-wrap gap-2">
              {['courses', 'ebooks'].map((tab) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setCatalogueTab(tab)}
                  className={clsx(
                    'rounded-full border px-3 py-1 text-xs font-semibold transition',
                    catalogueTab === tab
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'
                  )}
                >
                  {tab === 'courses' ? 'Courses' : 'E-books'}
                </button>
              ))}
            </div>
          ]}
        />
        {catalogueTab === 'courses' ? (
          <AdminCrudResource
            token={token}
            title={resourceConfigs.courses.title}
            description={resourceConfigs.courses.description}
            entityName={resourceConfigs.courses.entityName}
            listRequest={({ token: authToken, params, signal, context }) =>
              resourceConfigs.courses.listRequest({ token: authToken, params, signal, context })
            }
            createRequest={({ token: authToken, payload, context }) =>
              resourceConfigs.courses.createRequest({ token: authToken, payload, context })
            }
            updateRequest={({ token: authToken, id, payload, context }) =>
              resourceConfigs.courses.updateRequest(id, { token: authToken, payload, context })
            }
            deleteRequest={({ token: authToken, id, context }) =>
              resourceConfigs.courses.deleteRequest(id, { token: authToken, context })
            }
            fields={resourceConfigs.courses.fields}
            columns={resourceConfigs.courses.columns}
            searchPlaceholder="Search courses"
          />
        ) : (
          <AdminCrudResource
            token={token}
            title={resourceConfigs.ebooks.title}
            description={resourceConfigs.ebooks.description}
            entityName={resourceConfigs.ebooks.entityName}
            listRequest={({ token: authToken, params, signal, context }) =>
              resourceConfigs.ebooks.listRequest({ token: authToken, params, signal, context })
            }
            createRequest={({ token: authToken, payload, context }) =>
              resourceConfigs.ebooks.createRequest({ token: authToken, payload, context })
            }
            updateRequest={({ token: authToken, id, payload, context }) =>
              resourceConfigs.ebooks.updateRequest(id, { token: authToken, payload, context })
            }
            deleteRequest={({ token: authToken, id, context }) =>
              resourceConfigs.ebooks.deleteRequest(id, { token: authToken, context })
            }
            fields={resourceConfigs.ebooks.fields}
            columns={resourceConfigs.ebooks.columns}
            searchPlaceholder="Search e-books"
          />
        )}
      </section>

      <section className="space-y-6" id="support">
        <SectionHeader
          kicker="Inbox & Support"
          title="Support health snapshot"
          description="Stay ahead of support SLAs and messaging automation from the same console."
          icon={InboxIcon}
          actions={[
            <button
              key="refresh"
              type="button"
              onClick={refreshSupport}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white px-3 py-1 text-xs font-semibold text-primary"
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" /> Refresh
            </button>
          ]}
        />
        <SupportSnapshot data={supportData} loading={supportLoading} error={supportError} onRefresh={refreshSupport} />
      </section>

      <section className="space-y-6" id="timeline">
        <SectionHeader
          kicker="Live feed"
          title="Timeline & livefeed management"
          description="Trust & Safety decisions, releases, and incidents flow into a single auditable timeline."
          icon={BoltIcon}
          actions={[
            <button
              key="refresh"
              type="button"
              onClick={refreshExecutive}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white px-3 py-1 text-xs font-semibold text-primary"
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" /> Refresh
            </button>
          ]}
        />
        <TimelineFeed
          entries={timelineEntries}
          loading={executiveLoading}
          error={executiveError}
          onRefresh={refreshExecutive}
        />
      </section>

      <section className="space-y-4" id="requests">
        <SectionHeader
          kicker="Requests"
          title="Action queue"
          description="A unified view of outstanding verification cases, safety escalations, and network approvals."
          icon={QueueListIcon}
        />
        {outstandingRequests.length ? (
          <ul className="space-y-3">
            {outstandingRequests.map((request) => (
              <li key={request.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                  {request.type.slice(0, 2)}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{request.reference}</p>
                  <p className="text-xs text-slate-500">{request.summary}</p>
                  <p className="mt-1 text-xs text-slate-500">Received {formatRelative(request.submittedAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <DashboardStateMessage
            variant="success"
            title="All requests processed"
            description="There are currently no outstanding trust & safety tasks."
          />
        )}
      </section>

      <footer className="rounded-3xl border border-slate-200 bg-white p-6 text-xs text-slate-500">
        Need to escalate? Trigger the compliance on-call rotation via #trust-safety or email runbooks@edulure.com.
      </footer>
    </div>
  );
}
