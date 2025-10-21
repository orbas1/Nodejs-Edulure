import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  ClockIcon,
  CursorArrowRippleIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

import { useAuth } from '../../context/AuthContext.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useDashboard } from '../../context/DashboardContext.jsx';
import { useServiceHealth } from '../../context/ServiceHealthContext.jsx';
import {
  fetchRiskRegister,
  createRiskRegisterEntry,
  updateRiskRegisterStatus,
  recordRiskReview,
  fetchContinuityExercises,
  logContinuityExercise
} from '../../api/securityOperationsApi.js';

const STAT_TONES = {
  critical: 'bg-rose-100 text-rose-700 border-rose-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-sky-100 text-sky-700 border-sky-200',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200'
};

const INCIDENT_TONE = {
  critical: 'border-rose-200 bg-rose-50 text-rose-900',
  high: 'border-amber-200 bg-amber-50 text-amber-900',
  medium: 'border-sky-200 bg-sky-50 text-sky-900',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-900'
};

const RISK_DRAFT_DEFAULT = Object.freeze({
  title: '',
  description: '',
  category: 'operational',
  severity: 'moderate',
  likelihood: 'possible',
  reviewCadenceDays: 90,
  owner: ''
});

const STATUS_FORM_DEFAULT = Object.freeze({
  open: false,
  mode: 'status',
  riskId: null,
  status: 'mitigated',
  residualSeverity: '',
  residualLikelihood: '',
  nextReviewAt: '',
  notes: '',
  submitting: false,
  message: ''
});

function toCount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRiskSummary(summary) {
  if (!summary || typeof summary !== 'object') {
    return { total: 0, statusTotals: {} };
  }

  const totalsSource = summary.statusTotals ?? summary.statuses ?? {};
  const normalizedTotals =
    totalsSource && typeof totalsSource === 'object' && !Array.isArray(totalsSource)
      ? totalsSource
      : {};
  const sanitizedTotals = Object.entries(normalizedTotals).reduce((acc, [key, value]) => {
    acc[key] = toCount(value);
    return acc;
  }, {});

  return {
    ...summary,
    total:
      typeof summary.total === 'number' && Number.isFinite(summary.total)
        ? summary.total
        : Object.values(sanitizedTotals).reduce((sum, count) => sum + count, 0),
    statusTotals: sanitizedTotals
  };
}

const CONTINUITY_DRAFT_DEFAULT = Object.freeze({
  scenarioKey: '',
  scenarioSummary: '',
  exerciseType: 'tabletop',
  outcome: 'pass',
  startedAt: '',
  owner: '',
  notes: ''
});

function StatCard({ icon: Icon, label, value, helper, tone = 'neutral' }) {
  const toneClass = STAT_TONES[tone] ?? STAT_TONES.neutral;
  return (
    <div className={clsx('dashboard-card flex flex-col gap-3 border px-5 py-4', toneClass)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
        {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      {helper ? <p className="text-sm text-current/80">{helper}</p> : null}
    </div>
  );
}

function SeverityBadge({ severity }) {
  const tone = INCIDENT_TONE[(severity ?? '').toLowerCase()] ?? INCIDENT_TONE.medium;
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold', tone)}>
      {severity ?? 'unknown'}
    </span>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function AdminOperator() {
  const { session } = useAuth();
  const { dashboards, loading, error } = useDashboard();
  const { alerts, loading: healthLoading } = useServiceHealth();
  const operatorDashboard = dashboards?.admin?.operator;
  const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);
  const token = session?.tokens?.accessToken ?? null;
  const isAdmin = session?.user?.role === 'admin';

  const [riskRecords, setRiskRecords] = useState([]);
  const [riskSummary, setRiskSummary] = useState(() => normalizeRiskSummary());
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState(null);
  const [riskFilters, setRiskFilters] = useState({ status: 'open', severity: 'all' });
  const [riskDraft, setRiskDraft] = useState(RISK_DRAFT_DEFAULT);
  const [riskFormStatus, setRiskFormStatus] = useState('idle');
  const [riskFormMessage, setRiskFormMessage] = useState('');
  const [statusDraft, setStatusDraft] = useState(STATUS_FORM_DEFAULT);
  const [continuityRecords, setContinuityRecords] = useState([]);
  const [continuityStatus, setContinuityStatus] = useState('idle');
  const [continuityMessage, setContinuityMessage] = useState('');
  const [continuityDraft, setContinuityDraft] = useState(CONTINUITY_DRAFT_DEFAULT);

  const statusTotals = useMemo(() => riskSummary.statusTotals ?? {}, [riskSummary]);
  const activeRiskTotal = useMemo(
    () => toCount(statusTotals.open) + toCount(statusTotals.in_review),
    [statusTotals]
  );

  if (!isAdmin) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Admin privileges required"
        description="Switch to an administrator Learnspace to manage risk operations and continuity programs."
      />
    );
  }

  useEffect(() => {
    if (!token || !isAdmin) return;
    let isMounted = true;
    const controller = new AbortController();
    setRiskLoading(true);
    setRiskError(null);
    const params = {
      limit: 20,
      offset: 0,
      status: riskFilters.status !== 'all' ? riskFilters.status : undefined,
      severity: riskFilters.severity !== 'all' ? riskFilters.severity : undefined
    };
    fetchRiskRegister({ token, params, signal: controller.signal })
      .then((payload) => {
        if (!isMounted) return;
        setRiskRecords(Array.isArray(payload?.items) ? payload.items : payload?.data ?? []);
        setRiskSummary(normalizeRiskSummary(payload?.summary));
      })
      .catch((err) => {
        if (!isMounted && (err?.name === 'AbortError' || err?.message === 'canceled')) {
          return;
        }
        setRiskError(err instanceof Error ? err : new Error('Failed to load risk register'));
        setRiskRecords([]);
      })
      .finally(() => {
        if (isMounted) setRiskLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [token, riskFilters.status, riskFilters.severity, isAdmin]);

  useEffect(() => {
    if (!token || !isAdmin) return;
    let isMounted = true;
    const controller = new AbortController();
    fetchContinuityExercises({ token, params: { limit: 10 }, signal: controller.signal })
      .then((payload) => {
        if (!isMounted) return;
        setContinuityRecords(Array.isArray(payload?.items) ? payload.items : payload ?? []);
      })
      .catch(() => {
        if (!isMounted) return;
        setContinuityRecords([]);
      });
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [token, isAdmin]);

  const refreshRiskRegister = async () => {
    if (!token || !isAdmin) return;
    try {
      const params = {
        limit: 20,
        offset: 0,
        status: riskFilters.status !== 'all' ? riskFilters.status : undefined,
        severity: riskFilters.severity !== 'all' ? riskFilters.severity : undefined
      };
      const payload = await fetchRiskRegister({ token, params });
      setRiskRecords(Array.isArray(payload?.items) ? payload.items : payload?.data ?? []);
      setRiskSummary(normalizeRiskSummary(payload?.summary));
    } catch (err) {
      setRiskError(err instanceof Error ? err : new Error('Failed to refresh risk register'));
    }
  };

  const refreshContinuity = async () => {
    if (!token || !isAdmin) return;
    try {
      const payload = await fetchContinuityExercises({ token, params: { limit: 10 } });
      setContinuityRecords(Array.isArray(payload?.items) ? payload.items : payload ?? []);
    } catch (err) {
      setContinuityMessage(err instanceof Error ? err.message : 'Failed to refresh continuity exercises');
    }
  };

  const handleRiskDraftChange = (field, value) => {
    setRiskDraft((prev) => ({ ...prev, [field]: value }));
    setRiskFormStatus('idle');
  };

  const handleRiskCreate = async (event) => {
    event.preventDefault();
    if (!token || !isAdmin) return;
    const title = riskDraft.title.trim();
    const description = riskDraft.description.trim();
    if (!title || !description) {
      setRiskFormStatus('error');
      setRiskFormMessage('Title and description are required.');
      return;
    }

    const cadence = Number(riskDraft.reviewCadenceDays) || 90;
    setRiskFormStatus('submitting');
    setRiskFormMessage('');

    try {
      await createRiskRegisterEntry({
        token,
        payload: {
          title,
          description,
          category: riskDraft.category,
          severity: riskDraft.severity,
          likelihood: riskDraft.likelihood,
          reviewCadenceDays: cadence,
          owner: riskDraft.owner || undefined
        }
      });
      setRiskFormStatus('success');
      setRiskFormMessage('Risk entry logged successfully.');
      setRiskDraft((prev) => ({ ...RISK_DRAFT_DEFAULT, category: prev.category, severity: prev.severity, likelihood: prev.likelihood }));
      await refreshRiskRegister();
    } catch (err) {
      setRiskFormStatus('error');
      setRiskFormMessage(err.message ?? 'Failed to create risk entry.');
    }
  };

  const openStatusForm = (risk, mode = 'status', statusValue = 'mitigated') => {
    if (!risk) return;
    const riskId = risk.id ?? risk.riskId ?? risk.risk_id ?? null;
    setStatusDraft({
      ...STATUS_FORM_DEFAULT,
      open: true,
      mode,
      riskId,
      status: statusValue ?? risk.status ?? 'mitigated',
      residualSeverity: risk.residualSeverity ?? risk.severity ?? 'moderate',
      residualLikelihood: risk.residualLikelihood ?? risk.likelihood ?? 'possible',
      nextReviewAt: risk.nextReviewAt ? risk.nextReviewAt.slice(0, 10) : '',
      notes: ''
    });
  };

  const handleStatusFieldChange = (field, value) => {
    setStatusDraft((prev) => ({ ...prev, [field]: value }));
  };

  const closeStatusForm = useCallback(() => {
    setStatusDraft(() => ({ ...STATUS_FORM_DEFAULT }));
  }, []);

  const handleStatusSubmit = async (event) => {
    event.preventDefault();
    if (!token || !isAdmin || !statusDraft.riskId) return;
    setStatusDraft((prev) => ({ ...prev, submitting: true, message: '' }));
    try {
      if (statusDraft.mode === 'status') {
        await updateRiskRegisterStatus({
          token,
          riskId: statusDraft.riskId,
          payload: {
            status: statusDraft.status,
            residualSeverity: statusDraft.residualSeverity || undefined,
            residualLikelihood: statusDraft.residualLikelihood || undefined,
            residualNotes: statusDraft.notes || undefined,
            nextReviewAt: statusDraft.nextReviewAt || undefined
          }
        });
      } else {
        await recordRiskReview({
          token,
          riskId: statusDraft.riskId,
          payload: {
            status: statusDraft.status || undefined,
            residualSeverity: statusDraft.residualSeverity || undefined,
            residualLikelihood: statusDraft.residualLikelihood || undefined,
            notes: statusDraft.notes || undefined,
            nextReviewAt: statusDraft.nextReviewAt || undefined
          }
        });
      }
      setStatusDraft((prev) => ({ ...prev, submitting: false, message: 'Risk record updated.' }));
      await refreshRiskRegister();
      setTimeout(() => {
        closeStatusForm();
      }, 600);
    } catch (err) {
      setStatusDraft((prev) => ({
        ...prev,
        submitting: false,
        message: err.message ?? 'Failed to update risk.'
      }));
    }
  };

  const handleContinuityChange = (field, value) => {
    setContinuityDraft((prev) => ({ ...prev, [field]: value }));
    setContinuityStatus('idle');
  };

  const handleContinuitySubmit = async (event) => {
    event.preventDefault();
    if (!token || !isAdmin) return;
    const scenarioKey = continuityDraft.scenarioKey.trim();
    const scenarioSummary = continuityDraft.scenarioSummary.trim();
    if (!scenarioKey || !scenarioSummary) {
      setContinuityStatus('error');
      setContinuityMessage('Scenario key and summary are required.');
      return;
    }

    setContinuityStatus('submitting');
    setContinuityMessage('');

    try {
      await logContinuityExercise({
        token,
        payload: {
          scenarioKey,
          scenarioSummary,
          exerciseType: continuityDraft.exerciseType,
          outcome: continuityDraft.outcome,
          startedAt: continuityDraft.startedAt || undefined,
          owner: continuityDraft.owner || undefined,
          lessonsLearned: continuityDraft.notes ? continuityDraft.notes.split('\n').map((line) => line.trim()).filter(Boolean) : undefined
        }
      });
      setContinuityStatus('success');
      setContinuityMessage('Continuity exercise logged.');
      setContinuityDraft(CONTINUITY_DRAFT_DEFAULT);
      await refreshContinuity();
    } catch (err) {
      setContinuityStatus('error');
      setContinuityMessage(err.message ?? 'Failed to log continuity exercise.');
    }
  };

  const summaryCards = useMemo(() => {
    if (!operatorDashboard?.metrics) {
      return [];
    }

    const { serviceHealth, incidents, scams } = operatorDashboard.metrics;

    const impactedTone = serviceHealth.impactedServices > 0 ? 'warning' : 'success';
    const incidentTone = incidents.severityCounts.critical > 0 ? 'critical' : incidents.totalOpen > 0 ? 'warning' : 'success';
    const scamTone = scams.activeCases > 0 ? 'warning' : 'success';

    return [
      {
        id: 'availability',
        label: 'Impacted services',
        value: `${serviceHealth.impactedServices}/${serviceHealth.totalServices}`,
        helper: `${serviceHealth.impactedCapabilities} capabilities impacted`,
        icon: ShieldExclamationIcon,
        tone: impactedTone
      },
      {
        id: 'incidents',
        label: 'Open incidents',
        value: incidents.totalOpen,
        helper: `${incidents.severityCounts.critical} critical · median ack ${
          incidents.medianAckMinutes ? `${incidents.medianAckMinutes}m` : 'pending'
        }`,
        icon: BoltIcon,
        tone: incidentTone
      },
      {
        id: 'watchers',
        label: 'Ops watchers',
        value: numberFormatter.format(serviceHealth.watchers ?? 0),
        helper: `${incidents.detectionChannels.length} detection channels`,
        icon: UsersIcon,
        tone: 'info'
      },
      {
        id: 'scam',
        label: 'Payments blocked',
        value: scams.blockedPaymentsFormatted,
        helper: `${numberFormatter.format(scams.impactedLearners ?? 0)} learners protected`,
        icon: NoSymbolIcon,
        tone: scamTone
      }
    ];
  }, [numberFormatter, operatorDashboard?.metrics]);

  const serviceHealth = operatorDashboard?.serviceHealth;
  const incidentQueue = operatorDashboard?.incidents?.active ?? [];
  const resolvedIncidents = operatorDashboard?.incidents?.recentResolved ?? [];
  const scamSummary = operatorDashboard?.metrics?.scams;
  const runbooks = operatorDashboard?.runbooks ?? [];
  const timeline = operatorDashboard?.timeline ?? [];

  if (loading && !operatorDashboard) {
    return (
      <section className="dashboard-section">
        <p className="text-sm text-slate-600">Loading operator metrics…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard-section">
        <h2 className="dashboard-title">Operator dashboard unavailable</h2>
        <p className="dashboard-subtitle">{error.message || 'Failed to load operator analytics.'}</p>
      </section>
    );
  }

  if (!operatorDashboard) {
    return (
      <section className="dashboard-section">
        <h2 className="dashboard-title">Operator command centre</h2>
        <p className="dashboard-subtitle">
          No operator telemetry has been provisioned for this account yet. Contact the platform operations team to enable
          Redis-backed health aggregation and incident feeds.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="dashboard-section xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="dashboard-kicker">Platform availability</p>
              <h2 className="dashboard-title">Service health &amp; dependencies</h2>
              <p className="dashboard-subtitle">
                Last manifest: {serviceHealth.summary.manifestGeneratedAt ? new Date(serviceHealth.summary.manifestGeneratedAt).toLocaleString() : 'pending'}
                {healthLoading ? ' · refreshing live checks…' : null}
              </p>
            </div>
            <ShieldCheckIcon className="h-8 w-8 text-emerald-500" aria-hidden="true" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Core services</h3>
              <ul className="space-y-3">
                {serviceHealth.services.map((service) => (
                  <li key={service.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{service.name}</p>
                        <p className="text-xs text-slate-500">{service.summary}</p>
                      </div>
                      <SeverityBadge severity={service.status} />
                    </div>
                    {service.components.length ? (
                      <dl className="mt-3 grid gap-2 text-xs text-slate-600">
                        {service.components.map((component) => (
                          <div key={`${service.key}-${component.name}`} className="flex justify-between gap-4">
                            <dt className="font-medium">{component.name}</dt>
                            <dd className="text-right">{component.message}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Impacted capabilities</h3>
                {serviceHealth.impactedCapabilities.length ? (
                  <ul className="mt-3 space-y-3">
                    {serviceHealth.impactedCapabilities.map((capability) => (
                      <li key={capability.key} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-amber-900">{capability.name}</p>
                          <SeverityBadge severity={capability.status} />
                        </div>
                        <p className="mt-2 text-xs text-amber-800">{capability.summary}</p>
                        {capability.dependencies.length ? (
                          <p className="mt-2 text-xs text-amber-700">Depends on: {capability.dependencies.join(', ')}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="All capabilities online" message="No degradations detected across capability manifest." />
                )}
              </div>

              {serviceHealth.contactPoints.length ? (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Bridge &amp; escalation contacts</h3>
                  <ul className="mt-2 space-y-2 text-sm text-slate-600">
                    {serviceHealth.contactPoints.map((contact) => (
                      <li key={`${contact.key}-${contact.value}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="font-medium capitalize">{contact.key}</span>
                        <span className="text-slate-700">{contact.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {alerts.length ? (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Live alerts</h3>
                  <ul className="mt-2 space-y-2 text-xs text-slate-600">
                    {alerts.map((alert) => (
                      <li key={alert.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <span className="font-semibold">{alert.title}</span>
                        <span className="text-slate-500">{alert.level}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="dashboard-section xl:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="dashboard-kicker">Incident queue</p>
              <h2 className="dashboard-title">Live escalations</h2>
              <p className="dashboard-subtitle">{incidentQueue.length ? `${incidentQueue.length} active cases` : 'Queue clear'}</p>
            </div>
            <ClockIcon className="h-7 w-7 text-slate-400" aria-hidden="true" />
          </div>

          {incidentQueue.length ? (
            <ul className="mt-5 space-y-3">
              {incidentQueue.slice(0, 5).map((incident) => (
                <li key={incident.incidentUuid} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{incident.reference}</p>
                      <p className="text-xs text-slate-500">{incident.summary ?? 'Awaiting summary'}</p>
                    </div>
                    <SeverityBadge severity={incident.severity} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">Ack</dt>
                      <dd>{incident.acknowledgedAt ? new Date(incident.acknowledgedAt).toLocaleTimeString() : 'Pending'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">Watchers</dt>
                      <dd>{numberFormatter.format(incident.watchers ?? 0)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">Detection</dt>
                      <dd>{incident.detectionChannel}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">SLA</dt>
                      <dd>
                        {incident.resolutionBreached
                          ? 'Resolution breached'
                          : incident.resolutionTargetAt
                          ? `Due ${new Date(incident.resolutionTargetAt).toLocaleTimeString()}`
                          : 'Monitoring'}
                      </dd>
                    </div>
                  </dl>
                  {incident.recommendedActions.length ? (
                    <ul className="mt-3 space-y-1 text-xs text-slate-600">
                      {incident.recommendedActions.slice(0, 2).map((action) => (
                        <li key={`${incident.incidentUuid}-${action}`} className="flex items-center gap-2">
                          <CursorArrowRippleIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No active incidents" message="Escalations will appear here when the incident mesh opens new tickets." />
          )}

          {resolvedIncidents.length ? (
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recently resolved</h3>
              <ul className="mt-2 space-y-2 text-xs text-slate-600">
                {resolvedIncidents.slice(0, 3).map((incident) => (
                  <li key={`${incident.incidentUuid}-resolved`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span>{incident.reference}</span>
                    <span>{incident.durationMinutes ? `${incident.durationMinutes}m` : '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="dashboard-section xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="dashboard-kicker">Scam intelligence</p>
              <h2 className="dashboard-title">Fraud &amp; scam watch</h2>
              <p className="dashboard-subtitle">
                {scamSummary.activeCases > 0
                  ? `${scamSummary.activeCases} active campaigns · ${scamSummary.impactedLearners} learners flagged`
                  : 'No active scam campaigns detected'}
              </p>
            </div>
            <NoSymbolIcon className="h-7 w-7 text-rose-500" aria-hidden="true" />
          </div>

          {scamSummary.alerts.length ? (
            <ul className="mt-4 space-y-3">
              {scamSummary.alerts.map((alert) => (
                <li key={alert.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{alert.reference}</p>
                      <p className="text-xs text-slate-500">{alert.summary}</p>
                    </div>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                      <ShieldExclamationIcon className="h-4 w-4" aria-hidden="true" />
                      {alert.detectionChannel}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                      <UsersIcon className="h-4 w-4" aria-hidden="true" />
                      {numberFormatter.format(alert.watchers ?? 0)} watchers
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                      <ClockIcon className="h-4 w-4" aria-hidden="true" />
                      {alert.reportedAt ? new Date(alert.reportedAt).toLocaleString() : 'pending'}
                    </span>
                  </div>
                  {alert.recommendedActions?.length ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
                      {alert.recommendedActions.map((action) => (
                        <li key={`${alert.id}-${action}`}>{action}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No scam alerts" message="Fraud desk has not flagged any scam campaigns in the last polling window." />
          )}
        </section>

        <section className="dashboard-section xl:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="dashboard-kicker">Runbooks</p>
              <h2 className="dashboard-title">Rapid response playbooks</h2>
              <p className="dashboard-subtitle">Tie incidents to the correct operational runbooks.</p>
            </div>
            <ArrowTopRightOnSquareIcon className="h-6 w-6 text-slate-400" aria-hidden="true" />
          </div>

          {runbooks.length ? (
            <ul className="mt-4 space-y-3">
              {runbooks.slice(0, 6).map((runbook) => (
                <li key={runbook.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{runbook.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{runbook.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">Severity {runbook.severity}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">References: {runbook.references.join(', ')}</span>
                  </div>
                  {runbook.url ? (
                    <a
                      href={runbook.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary-dark"
                    >
                      Open runbook
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No runbooks linked" message="Attach incident playbooks via the incident metadata to surface them here." />
          )}
        </section>
      </div>

      <section className="dashboard-section">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="dashboard-kicker">Governance control</p>
            <h2 className="dashboard-title">Risk register operations</h2>
            <p className="dashboard-subtitle">
              Track operational, compliance, and platform risks. Mitigate, accept, or retire entries with full audit trails.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                Total {activeRiskTotal}
              </span>
              {Object.entries(statusTotals).map(([key, value]) => (
                <span key={key} className="rounded-full bg-slate-100 px-3 py-1 font-semibold capitalize">
                  {key}: {toCount(value)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={riskFilters.status}
              onChange={(event) => setRiskFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_review">In review</option>
              <option value="mitigated">Mitigated</option>
              <option value="accepted">Accepted</option>
              <option value="treated">Treated</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={riskFilters.severity}
              onChange={(event) => setRiskFilters((prev) => ({ ...prev, severity: event.target.value }))}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All severities</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <button
              type="button"
              onClick={refreshRiskRegister}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Refresh
            </button>
          </div>
        </div>

        {riskError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{riskError.message}</div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="overflow-x-auto">
            {riskLoading ? (
              <p className="text-sm text-slate-500">Loading risk register…</p>
            ) : riskRecords.length ? (
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Title</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Severity</th>
                    <th className="px-4 py-2">Owner</th>
                    <th className="px-4 py-2">Next review</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {riskRecords.map((risk) => (
                    <tr key={risk.id} className="whitespace-nowrap text-slate-600">
                      <td className="px-4 py-3 text-left">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{risk.title}</span>
                          <span className="text-xs text-slate-500">{risk.category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize">{risk.status}</td>
                      <td className="px-4 py-3 capitalize">{risk.severity}</td>
                      <td className="px-4 py-3">{risk.owner?.displayName ?? 'Unassigned'}</td>
                      <td className="px-4 py-3">
                        {risk.nextReviewAt ? new Date(risk.nextReviewAt).toLocaleDateString() : 'Not scheduled'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openStatusForm(risk, 'status', 'mitigated')}
                            className="rounded-full border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:border-emerald-400 hover:text-emerald-700"
                          >
                            Mitigate
                          </button>
                          <button
                            type="button"
                            onClick={() => openStatusForm(risk, 'status', 'accepted')}
                            className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-600 transition hover:border-amber-400 hover:text-amber-700"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => openStatusForm(risk, 'status', 'closed')}
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            onClick={() => openStatusForm(risk, 'review', risk.status)}
                            className="rounded-full border border-sky-300 px-3 py-1 text-xs font-semibold text-sky-600 transition hover:border-sky-400 hover:text-sky-800"
                          >
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-slate-500">No risks match the selected filters.</p>
            )}
          </div>

          <div className="space-y-6">
            <form onSubmit={handleRiskCreate} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Log new risk</h3>
              <div className="mt-3 grid gap-3">
                <input
                  value={riskDraft.title}
                  onChange={(event) => handleRiskDraftChange('title', event.target.value)}
                  required
                  placeholder="Risk title"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <textarea
                  value={riskDraft.description}
                  onChange={(event) => handleRiskDraftChange('description', event.target.value)}
                  required
                  placeholder="Describe the risk scenario"
                  className="h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <select
                    value={riskDraft.category}
                    onChange={(event) => handleRiskDraftChange('category', event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="operational">Operational</option>
                    <option value="compliance">Compliance</option>
                    <option value="security">Security</option>
                    <option value="financial">Financial</option>
                  </select>
                  <input
                    value={riskDraft.owner}
                    onChange={(event) => handleRiskDraftChange('owner', event.target.value)}
                    placeholder="Owner (email or name)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <select
                    value={riskDraft.severity}
                    onChange={(event) => handleRiskDraftChange('severity', event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <select
                    value={riskDraft.likelihood}
                    onChange={(event) => handleRiskDraftChange('likelihood', event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="unlikely">Unlikely</option>
                    <option value="possible">Possible</option>
                    <option value="likely">Likely</option>
                    <option value="almost_certain">Almost certain</option>
                  </select>
                  <input
                    type="number"
                    min="30"
                    max="365"
                    value={riskDraft.reviewCadenceDays}
                    onChange={(event) => handleRiskDraftChange('reviewCadenceDays', event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Review cadence"
                  />
                </div>
              </div>
              {riskFormMessage && (
                <p className={`mt-3 text-xs ${riskFormStatus === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>{riskFormMessage}</p>
              )}
              <button
                type="submit"
                disabled={riskFormStatus === 'submitting'}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-500 disabled:bg-slate-400"
              >
                {riskFormStatus === 'submitting' ? 'Logging…' : 'Log risk'}
              </button>
            </form>

            {statusDraft.open && (
              <form onSubmit={handleStatusSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">
                  {statusDraft.mode === 'status' ? 'Update status' : 'Record review'}
                </h3>
                <div className="mt-3 grid gap-3 text-sm">
                  {statusDraft.mode === 'status' && (
                    <select
                      value={statusDraft.status}
                      onChange={(event) => handleStatusFieldChange('status', event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="open">Open</option>
                      <option value="in_review">In review</option>
                      <option value="mitigated">Mitigated</option>
                      <option value="treated">Treated</option>
                      <option value="accepted">Accepted</option>
                      <option value="closed">Closed</option>
                      <option value="retired">Retired</option>
                    </select>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={statusDraft.residualSeverity}
                      onChange={(event) => handleStatusFieldChange('residualSeverity', event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <select
                      value={statusDraft.residualLikelihood}
                      onChange={(event) => handleStatusFieldChange('residualLikelihood', event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="unlikely">Unlikely</option>
                      <option value="possible">Possible</option>
                      <option value="likely">Likely</option>
                      <option value="almost_certain">Almost certain</option>
                    </select>
                  </div>
                  <input
                    type="date"
                    value={statusDraft.nextReviewAt}
                    onChange={(event) => handleStatusFieldChange('nextReviewAt', event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  <textarea
                    value={statusDraft.notes}
                    onChange={(event) => handleStatusFieldChange('notes', event.target.value)}
                    className="h-20 rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder={statusDraft.mode === 'status' ? 'Mitigation or acceptance notes' : 'Review notes and follow-ups'}
                  />
                </div>
                {statusDraft.message && (
                  <p className={`mt-3 text-xs ${statusDraft.message.includes('Failed') ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {statusDraft.message}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={closeStatusForm}
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={statusDraft.submitting}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700 disabled:bg-slate-400"
                  >
                    {statusDraft.submitting ? 'Saving…' : statusDraft.mode === 'status' ? 'Update status' : 'Record review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="dashboard-kicker">Continuity readiness</p>
            <h2 className="dashboard-title">Business continuity exercises</h2>
            <p className="dashboard-subtitle">
              Log recovery exercises and monitor outcomes versus RTO/RPO targets.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshContinuity}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {continuityRecords.length ? (
              <ul className="space-y-3 text-sm text-slate-600">
                {continuityRecords.map((exercise) => (
                  <li key={exercise.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{exercise.scenarioSummary}</p>
                        <p className="text-xs text-slate-500">Scenario: {exercise.scenarioKey}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        exercise.outcome === 'fail'
                          ? 'bg-rose-100 text-rose-700'
                          : exercise.outcome === 'partial'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {exercise.outcome ?? 'pending'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                        <ClockIcon className="h-4 w-4" />
                        {exercise.startedAt ? new Date(exercise.startedAt).toLocaleDateString() : 'Scheduled'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                        <ShieldCheckIcon className="h-4 w-4" />
                        {exercise.exerciseType}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                        <UsersIcon className="h-4 w-4" />
                        {exercise.owner?.displayName ?? 'Ops'}
                      </span>
                    </div>
                    {exercise.followUpActions?.length ? (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
                        {exercise.followUpActions.slice(0, 3).map((action, index) => (
                          <li key={`${exercise.id}-follow-${index}`}>{action}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No continuity exercises logged yet.</p>
            )}
          </div>

          <form onSubmit={handleContinuitySubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Log continuity exercise</h3>
            <div className="mt-3 grid gap-3 text-sm">
              <input
                value={continuityDraft.scenarioKey}
                onChange={(event) => handleContinuityChange('scenarioKey', event.target.value)}
                required
                placeholder="Scenario key"
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <textarea
                value={continuityDraft.scenarioSummary}
                onChange={(event) => handleContinuityChange('scenarioSummary', event.target.value)}
                required
                placeholder="Summary"
                className="h-20 rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={continuityDraft.exerciseType}
                  onChange={(event) => handleContinuityChange('exerciseType', event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="tabletop">Tabletop</option>
                  <option value="functional">Functional</option>
                  <option value="full">Full scale</option>
                </select>
                <select
                  value={continuityDraft.outcome}
                  onChange={(event) => handleContinuityChange('outcome', event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="pass">Pass</option>
                  <option value="partial">Partial</option>
                  <option value="fail">Fail</option>
                </select>
              </div>
              <input
                type="datetime-local"
                value={continuityDraft.startedAt}
                onChange={(event) => handleContinuityChange('startedAt', event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <input
                value={continuityDraft.owner}
                onChange={(event) => handleContinuityChange('owner', event.target.value)}
                placeholder="Owner"
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <textarea
                value={continuityDraft.notes}
                onChange={(event) => handleContinuityChange('notes', event.target.value)}
                className="h-20 rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Lessons learned (one per line)"
              />
            </div>
            {continuityMessage && (
              <p className={`mt-3 text-xs ${continuityStatus === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>{continuityMessage}</p>
            )}
            <button
              type="submit"
              disabled={continuityStatus === 'submitting'}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-500 disabled:bg-slate-400"
            >
              {continuityStatus === 'submitting' ? 'Logging…' : 'Log exercise'}
            </button>
          </form>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex items-start justify-between">
          <div>
            <p className="dashboard-kicker">Operational timeline</p>
            <h2 className="dashboard-title">Key updates &amp; escalations</h2>
            <p className="dashboard-subtitle">
              Tracking {timeline.length} logged events across active and recently resolved incidents.
            </p>
          </div>
          <BoltIcon className="h-7 w-7 text-amber-500" aria-hidden="true" />
        </div>

        {timeline.length ? (
          <ol className="mt-5 space-y-3">
            {timeline.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{entry.label}</p>
                  <p className="text-xs text-slate-500">{entry.description ?? 'Timeline update recorded.'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                    <ClockIcon className="h-4 w-4" aria-hidden="true" />
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Pending'}
                  </span>
                  <SeverityBadge severity={entry.severity} />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title="No timeline entries" message="Timeline events will appear as incident updates are recorded." />
        )}
      </section>
    </div>
  );
}
