import clsx from 'clsx';
import {
  ArrowTrendingUpIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  SignalIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import {
  createFieldServiceAssignment,
  updateFieldServiceAssignment,
  closeFieldServiceAssignment
} from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

const toneClasses = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  primary: 'bg-primary/10 text-primary-dark ring-primary/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  critical: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  muted: 'bg-slate-50 text-slate-600 ring-slate-200'
};

const riskClasses = {
  critical: 'bg-rose-50 text-rose-700 ring-rose-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  on_track: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  closed: 'bg-slate-100 text-slate-600 ring-slate-200',
  cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
  default: 'bg-slate-50 text-slate-600 ring-slate-200'
};

const statusBadgeClasses = {
  completed: 'bg-emerald-500/10 text-emerald-700 ring-emerald-200',
  dispatched: 'bg-primary/10 text-primary-dark ring-primary/20',
  en_route: 'bg-sky-100 text-sky-700 ring-sky-200',
  on_site: 'bg-purple-100 text-purple-700 ring-purple-200',
  investigating: 'bg-amber-50 text-amber-700 ring-amber-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
  pending: 'bg-slate-100 text-slate-600 ring-slate-200'
};

function resolveToneClasses(tone) {
  return toneClasses[tone] ?? toneClasses.muted;
}

function resolveRiskClasses(riskLevel) {
  return riskClasses[riskLevel] ?? riskClasses.default;
}

function resolveStatusClasses(status) {
  return statusBadgeClasses[status] ?? statusBadgeClasses.pending;
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(parsed);
  } catch (error) {
    return value;
  }
}

function FieldServices() {
  const { role, dashboard, refresh } = useOutletContext();
  const workspace = dashboard?.fieldServices ?? null;
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [assignmentsState, setAssignmentsState] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [assignmentFormVisible, setAssignmentFormVisible] = useState(false);
  const [assignmentFormMode, setAssignmentFormMode] = useState('create');
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [assignmentFormErrors, setAssignmentFormErrors] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({
    serviceType: '',
    priority: 'Standard',
    owner: '',
    location: '',
    scheduledFor: '',
    supportChannel: '',
    briefUrl: ''
  });
  const [assignmentFormStep, setAssignmentFormStep] = useState(1);
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('all');
  const [assignmentPriorityFilter, setAssignmentPriorityFilter] = useState('all');

  const allowedRoles = useMemo(() => new Set(['learner', 'instructor']), []);
  if (!allowedRoles.has(role)) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Restricted Learnspace"
        description="Field service operations are available from the learner and instructor dashboards only."
      />
    );
  }

  if (!workspace) {
    return (
      <DashboardStateMessage
        title="Field service data not yet available"
        description="We couldn't find any service assignments linked to your Learnspace. Refresh the dashboard once operations syncs complete."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const summaryCards = workspace.summary?.cards ?? [];
  const assignments = assignmentsState;
  const incidents = workspace.incidents ?? [];
  const timeline = workspace.timeline ?? [];
  const providers = workspace.providers ?? [];
  const mapView = workspace.map ?? null;
  const lastUpdatedLabel = formatDateTime(workspace.summary?.updatedAt ?? workspace.lastUpdated);
  const hasAssignments = assignments.length > 0;
  const disableActions = pendingAction !== null;

  const filteredAssignments = useMemo(() => {
    const search = assignmentSearchTerm.trim().toLowerCase();
    const statusFilterValue = assignmentStatusFilter.toLowerCase();
    const priorityFilterValue = assignmentPriorityFilter.toLowerCase();
    return assignmentsState.filter((assignment) => {
      const matchesStatus =
        statusFilterValue === 'all' || (assignment.status ?? '').toLowerCase() === statusFilterValue;
      if (!matchesStatus) {
        return false;
      }
      const matchesPriority =
        priorityFilterValue === 'all' || (assignment.priority ?? '').toLowerCase() === priorityFilterValue;
      if (!matchesPriority) {
        return false;
      }
      if (!search) {
        return true;
      }
      const haystack = [
        assignment.serviceType,
        assignment.owner,
        assignment.location,
        assignment.supportChannel,
        assignment.customer?.name,
        assignment.provider?.name,
        assignment.briefUrl
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return haystack.some((value) => value.includes(search));
    });
  }, [assignmentsState, assignmentPriorityFilter, assignmentSearchTerm, assignmentStatusFilter]);
  const hasFilteredAssignments = filteredAssignments.length > 0;

  useEffect(() => {
    setAssignmentsState(Array.isArray(workspace.assignments) ? workspace.assignments : []);
  }, [workspace.assignments]);

  const resetAssignmentForm = useCallback(() => {
    setAssignmentForm({
      serviceType: '',
      priority: 'Standard',
      owner: '',
      location: '',
      scheduledFor: '',
      supportChannel: '',
      briefUrl: ''
    });
    setAssignmentFormErrors([]);
    setEditingAssignmentId(null);
    setAssignmentFormMode('create');
    setAssignmentFormStep(1);
  }, []);

  const closeAssignmentForm = useCallback(() => {
    setAssignmentFormVisible(false);
    resetAssignmentForm();
  }, [resetAssignmentForm]);

  const openAssignmentCreateForm = useCallback(() => {
    resetAssignmentForm();
    setAssignmentFormMode('create');
    setAssignmentFormVisible(true);
  }, [resetAssignmentForm]);

  const openAssignmentEditForm = useCallback((assignment) => {
    setAssignmentFormMode('edit');
    setEditingAssignmentId(assignment.id);
    setAssignmentForm({
      serviceType: assignment.serviceType ?? '',
      priority: assignment.priority ?? 'Standard',
      owner: assignment.owner ?? assignment.dispatchLead ?? '',
      location: assignment.location ?? assignment.address ?? '',
      scheduledFor: assignment.scheduledAtRaw ?? assignment.scheduledAt ?? '',
      supportChannel: assignment.supportChannel ?? assignment.support?.channel ?? '',
      briefUrl: assignment.briefUrl ?? assignment.briefing ?? assignment.playbook ?? ''
    });
    setAssignmentFormStep(1);
    setAssignmentFormVisible(true);
  }, []);

  const handleAssignmentFormChange = useCallback((event) => {
    const { name, value } = event.target;
    setAssignmentForm((current) => ({ ...current, [name]: value }));
  }, []);

  const validateAssignmentForm = useCallback(
    (scope = 'all') => {
      const errors = [];
      const allowStep = (step) => scope === 'all' || scope === step;
      if (allowStep(1)) {
        if (!assignmentForm.serviceType || assignmentForm.serviceType.trim().length < 3) {
          errors.push('Specify the service or incident type.');
        }
        if (!assignmentForm.owner || assignmentForm.owner.trim().length < 2) {
          errors.push('Assign an accountable owner or squad.');
        }
        if (!assignmentForm.location || assignmentForm.location.trim().length < 3) {
          errors.push('Provide the deployment location.');
        }
      }
      if (allowStep(2)) {
        if (!assignmentForm.scheduledFor) {
          errors.push('Set the targeted arrival window.');
        }
        if (assignmentForm.briefUrl) {
          try {
            const parsed = new URL(assignmentForm.briefUrl);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
              errors.push('Briefing links should start with http or https.');
            }
          } catch (error) {
            errors.push('Provide a valid URL for the briefing link.');
          }
        }
      }
      setAssignmentFormErrors(errors);
      return errors.length === 0;
    },
    [assignmentForm]
  );

  const handleAdvanceAssignmentForm = useCallback(() => {
    if (validateAssignmentForm(1)) {
      setAssignmentFormStep(2);
      setAssignmentFormErrors([]);
    }
  }, [validateAssignmentForm]);

  const handleRewindAssignmentForm = useCallback(() => {
    setAssignmentFormStep(1);
    setAssignmentFormErrors([]);
  }, []);

  const handleAssignmentFormSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage assignments.' });
        return;
      }
      if (!validateAssignmentForm('all')) {
        return;
      }

      const payload = {
        serviceType: assignmentForm.serviceType.trim(),
        priority: assignmentForm.priority,
        owner: assignmentForm.owner.trim(),
        location: assignmentForm.location.trim(),
        scheduledFor: assignmentForm.scheduledFor,
        supportChannel: assignmentForm.supportChannel?.trim() || undefined,
        briefUrl: assignmentForm.briefUrl?.trim() || undefined
      };

      if (assignmentFormMode === 'create') {
        setPendingAction('assignment-create');
        setStatusMessage({ type: 'pending', message: `Dispatching ${payload.serviceType}…` });
        try {
          const response = await createFieldServiceAssignment({ token, payload });
          const assignment = response?.data ?? {};
          const newAssignment = {
            id: assignment.id ?? `assignment-${Date.now()}`,
            serviceType: assignment.serviceType ?? payload.serviceType,
            priority: assignment.priority ?? payload.priority,
            owner: assignment.owner ?? payload.owner,
            location: assignment.location ?? payload.location,
            scheduledAt: formatDateTime(assignment.scheduledFor ?? payload.scheduledFor),
            scheduledAtRaw: assignment.scheduledFor ?? payload.scheduledFor,
            status: assignment.status ?? 'dispatched',
            statusLabel: assignment.statusLabel ?? 'Dispatched',
            supportChannel: assignment.supportChannel ?? payload.supportChannel,
            briefUrl: assignment.briefUrl ?? payload.briefUrl
          };
          setAssignmentsState((current) => [newAssignment, ...current]);
          setStatusMessage({ type: 'success', message: `${newAssignment.serviceType} dispatched.` });
          closeAssignmentForm();
        } catch (createError) {
          setStatusMessage({
            type: 'error',
            message: createError instanceof Error ? createError.message : 'Unable to dispatch assignment.'
          });
        } finally {
          setPendingAction(null);
        }
        return;
      }

      setPendingAction(`assignment-update-${editingAssignmentId}`);
      setStatusMessage({ type: 'pending', message: `Updating ${payload.serviceType}…` });
      try {
        await updateFieldServiceAssignment({ token, assignmentId: editingAssignmentId, payload });
        setAssignmentsState((current) =>
          current.map((assignment) =>
            assignment.id === editingAssignmentId
              ? {
                  ...assignment,
                  serviceType: payload.serviceType,
                  priority: payload.priority,
                  owner: payload.owner,
                  location: payload.location,
                  scheduledAt: formatDateTime(payload.scheduledFor),
                  scheduledAtRaw: payload.scheduledFor,
                  supportChannel: payload.supportChannel ?? assignment.supportChannel,
                  briefUrl: payload.briefUrl ?? assignment.briefUrl
                }
              : assignment
          )
        );
        setStatusMessage({ type: 'success', message: `${payload.serviceType} updated.` });
        closeAssignmentForm();
      } catch (updateError) {
        setStatusMessage({
          type: 'error',
          message: updateError instanceof Error ? updateError.message : 'Unable to update assignment.'
        });
      } finally {
        setPendingAction(null);
      }
    },
    [
      assignmentForm,
      assignmentFormMode,
      closeAssignmentForm,
      createFieldServiceAssignment,
      editingAssignmentId,
      setAssignmentsState,
      token,
      updateFieldServiceAssignment,
      validateAssignmentForm
    ]
  );

  const handleAssignmentStatusChange = useCallback(
    async (assignment, status) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage assignments.' });
        return;
      }
      setPendingAction(`assignment-status-${assignment.id}`);
      setStatusMessage({ type: 'pending', message: `Updating ${assignment.serviceType} status…` });
      try {
        await updateFieldServiceAssignment({ token, assignmentId: assignment.id, payload: { status } });
        setAssignmentsState((current) =>
          current.map((item) =>
            item.id === assignment.id
              ? {
                  ...item,
                  status,
                  statusLabel:
                    status === 'completed'
                      ? 'Completed'
                      : status === 'on_site'
                        ? 'On site'
                        : status === 'en_route'
                          ? 'En route'
                          : 'Dispatched'
                }
              : item
          )
        );
        setStatusMessage({ type: 'success', message: `${assignment.serviceType} status updated.` });
      } catch (statusError) {
        setStatusMessage({
          type: 'error',
          message: statusError instanceof Error ? statusError.message : 'Unable to update status.'
        });
      } finally {
        setPendingAction(null);
      }
    },
    [setAssignmentsState, token, updateFieldServiceAssignment]
  );

  const handleResolveAssignment = useCallback(
    async (assignment) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage assignments.' });
        return;
      }
      setPendingAction(`assignment-close-${assignment.id}`);
      setStatusMessage({ type: 'pending', message: `Closing ${assignment.serviceType}…` });
      try {
        await closeFieldServiceAssignment({ token, assignmentId: assignment.id, payload: { resolution: 'Learner closed' } });
        setAssignmentsState((current) => current.filter((item) => item.id !== assignment.id));
        setStatusMessage({ type: 'success', message: `${assignment.serviceType} closed.` });
      } catch (closeError) {
        setStatusMessage({
          type: 'error',
          message: closeError instanceof Error ? closeError.message : 'Unable to close assignment.'
        });
      } finally {
        setPendingAction(null);
      }
    },
    [closeFieldServiceAssignment, setAssignmentsState, token]
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="dashboard-kicker">Operational intelligence</p>
          <h1 className="dashboard-title">Field service control tower</h1>
          <p className="dashboard-subtitle">
            Coordinate technicians, monitor live incidents, and maintain SLA coverage across every in-flight engagement.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-primary-pill" onClick={() => refresh?.()}>
            Sync latest telemetry
          </button>
          <button type="button" className="dashboard-pill" onClick={openAssignmentCreateForm}>
            Schedule new dispatch
          </button>
          <button type="button" className="dashboard-pill">
            Export service ledger
          </button>
        </div>
      </div>

      <section className="dashboard-section">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Stability overview</h2>
            <p className="text-sm text-slate-600">Live indicators for current assignments, SLA posture, and incident load.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />
            <span>Updated {lastUpdatedLabel}</span>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.key}
              className={clsx(
                'rounded-2xl border border-transparent p-5 ring-1 shadow-sm',
                resolveToneClasses(card.tone)
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold">{card.value}</p>
              <p className="mt-2 text-xs text-slate-600">{card.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-3">
        <section className="dashboard-section xl:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Active engagements</h2>
              <p className="text-sm text-slate-600">
                Track ETA adherence, assignment owners, and current mitigation steps for every live job.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <SignalIcon className="h-4 w-4" aria-hidden="true" />
              <span>
                {filteredAssignments.length} of {assignments.length} in dashboard scope
              </span>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Search assignments
              <input
                type="search"
                value={assignmentSearchTerm}
                onChange={(event) => setAssignmentSearchTerm(event.target.value)}
                placeholder="Search service, owner, or location"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Status
              <select
                value={assignmentStatusFilter}
                onChange={(event) => setAssignmentStatusFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All statuses</option>
                <option value="dispatched">Dispatched</option>
                <option value="en_route">En route</option>
                <option value="on_site">On site</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Priority
              <select
                value={assignmentPriorityFilter}
                onChange={(event) => setAssignmentPriorityFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="standard">Standard</option>
                <option value="routine">Routine</option>
              </select>
            </label>
          </div>
          {hasFilteredAssignments ? (
            <div className="mt-6 space-y-4">
              {filteredAssignments.map((assignment) => (
                <article
                  key={assignment.id}
                  className="dashboard-card-muted relative overflow-hidden p-5 ring-1 ring-inset ring-slate-200 transition hover:-translate-y-0.5 hover:ring-primary/40"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                            resolveStatusClasses(assignment.status)
                          )}
                        >
                          <span>{assignment.statusLabel}</span>
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {assignment.priority}
                        </span>
                        <span className="text-xs text-slate-500">Ref {assignment.reference}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{assignment.serviceType}</h3>
                        {assignment.summary ? (
                          <p className="mt-1 text-sm text-slate-600">{assignment.summary}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" aria-hidden="true" />
                          <span>Requested {assignment.requestedAtLabel ?? formatDateTime(assignment.requestedAt)}</span>
                        </div>
                        {assignment.scheduledForLabel ? (
                          <div className="flex items-center gap-1">
                            <GlobeAltIcon className="h-4 w-4" aria-hidden="true" />
                            <span>Scheduled {assignment.scheduledForLabel}</span>
                          </div>
                        ) : null}
                        {assignment.metrics?.elapsedMinutes != null ? (
                          <div className="flex items-center gap-1">
                            <BoltIcon className="h-4 w-4" aria-hidden="true" />
                            <span>{assignment.metrics.elapsedMinutes} min elapsed</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-3 lg:w-64">
                      <div
                        className={clsx(
                          'inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-inset',
                          resolveRiskClasses(assignment.riskLevel)
                        )}
                      >
                        Risk: {assignment.riskLevel?.replace(/_/g, ' ') ?? 'review'}
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next action</p>
                        <p className="mt-2 text-sm text-slate-700">{assignment.nextAction ?? 'Monitor progress'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="font-semibold text-slate-600">Provider</p>
                          <p className="mt-1 text-slate-900">
                            {assignment.provider?.name ?? 'Unassigned'}
                          </p>
                          {assignment.provider?.lastCheckInRelative ? (
                            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                              Checked {assignment.provider.lastCheckInRelative}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="font-semibold text-slate-600">Customer</p>
                          <p className="mt-1 text-slate-900">{assignment.customer?.name ?? 'Service requester'}</p>
                          {assignment.location?.label ? (
                            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                              {assignment.location.label}
                            </p>
                          ) : null}
                        </div>
                        {assignment.supportChannel ? (
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="font-semibold text-slate-600">Support channel</p>
                            <p className="mt-1 text-slate-900">{assignment.supportChannel}</p>
                          </div>
                        ) : null}
                        {assignment.briefUrl ? (
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="font-semibold text-slate-600">Briefing link</p>
                            <a
                              href={assignment.briefUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              View playbook
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                    <button
                      type="button"
                      className="dashboard-pill px-3 py-1"
                      onClick={() => openAssignmentEditForm(assignment)}
                    >
                      Edit briefing
                    </button>
                    <button
                      type="button"
                      className="dashboard-pill px-3 py-1"
                      onClick={() => handleAssignmentStatusChange(assignment, 'en_route')}
                      disabled={disableActions}
                    >
                      {pendingAction === `assignment-status-${assignment.id}` && assignment.status !== 'en_route'
                        ? 'Updating…'
                        : 'Mark en route'}
                    </button>
                    <button
                      type="button"
                      className="dashboard-pill px-3 py-1"
                      onClick={() => handleAssignmentStatusChange(assignment, 'on_site')}
                      disabled={disableActions}
                    >
                      {pendingAction === `assignment-status-${assignment.id}` && assignment.status !== 'on_site'
                        ? 'Updating…'
                        : 'Mark on site'}
                    </button>
                    <button
                      type="button"
                      className="dashboard-pill bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      onClick={() => handleAssignmentStatusChange(assignment, 'completed')}
                      disabled={disableActions}
                    >
                      {pendingAction === `assignment-status-${assignment.id}` && assignment.status !== 'completed'
                        ? 'Updating…'
                        : 'Mark completed'}
                    </button>
                    <button
                      type="button"
                      className="dashboard-pill bg-rose-50 text-rose-600 hover:bg-rose-100"
                      onClick={() => handleResolveAssignment(assignment)}
                      disabled={disableActions}
                    >
                      {pendingAction === `assignment-close-${assignment.id}` ? 'Closing…' : 'Close assignment'}
                    </button>
                  </div>
                  {assignment.timeline?.length ? (
                    <div className="mt-5 grid gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-xs text-slate-600 lg:grid-cols-2">
                      {assignment.timeline.slice(-2).map((event) => (
                        <div key={event.id} className="flex items-start gap-2">
                          <ShieldExclamationIcon className="h-4 w-4 flex-none text-slate-400" aria-hidden="true" />
                          <div>
                            <p className="font-semibold text-slate-700">{event.label}</p>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">
                              {event.relativeTime ?? event.timestamp}
                            </p>
                            {event.notes ? <p className="mt-1 text-slate-600">{event.notes}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <DashboardStateMessage
                title={assignments.length ? 'No assignments match your filters' : 'No live assignments'}
                description={
                  assignments.length
                    ? 'Adjust your search, status, or priority filters to surface relevant dispatches.'
                    : 'Assign a provider or sync new jobs from your service hub to populate the operations board.'
                }
                actionLabel={assignments.length ? 'Reset filters' : 'Refresh'}
                onAction={() => {
                  if (assignments.length) {
                    setAssignmentSearchTerm('');
                    setAssignmentStatusFilter('all');
                    setAssignmentPriorityFilter('all');
                  } else {
                    refresh?.();
                  }
                }}
              />
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Geospatial watch</h2>
              <p className="text-sm text-slate-600">
                Rapid snapshot of technician and customer coordinates with route coverage.
              </p>
            </div>
            <MapPinIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-slate-100 shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Map center</p>
            <p className="mt-2 text-sm font-medium">
              {mapView?.center
                ? `${mapView.center.lat?.toFixed(3) ?? '—'}, ${mapView.center.lng?.toFixed(3) ?? '—'}`
                : 'Calibrating coordinates'}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
              Bounds {mapView?.bounds ? `${mapView.bounds.minLat?.toFixed(2)} to ${mapView.bounds.maxLat?.toFixed(2)}` : 'pending'}
            </p>
            <div className="mt-6 space-y-3">
              {(mapView?.assignments ?? []).slice(0, 4).map((entry) => (
                <div key={entry.orderId} className="flex items-center justify-between gap-3 rounded-xl bg-white/10 p-3 text-xs">
                  <div>
                    <p className="font-semibold text-white">{entry.reference}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-300">{entry.status}</p>
                  </div>
                  <div className="text-right text-slate-200">
                    {entry.etaMinutes != null ? <p>ETA {entry.etaMinutes} min</p> : <p>ETA pending</p>}
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{entry.priority}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="dashboard-section">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Live event stream</h2>
              <p className="text-sm text-slate-600">Chronological feed of updates, escalations, and customer touchpoints.</p>
            </div>
            <ClockIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-4">
            {timeline.length ? (
              timeline.slice(0, 8).map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{event.label}</p>
                      <p className="text-xs text-slate-500">{event.relativeTime ?? event.timestamp}</p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{event.status}</span>
                  </div>
                  {event.notes ? <p className="mt-3 text-sm text-slate-600">{event.notes}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <UserCircleIcon className="h-4 w-4" aria-hidden="true" />
                      <span>{event.author ?? 'Operations desk'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="h-4 w-4" aria-hidden="true" />
                      <span>Order #{event.orderId}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <DashboardStateMessage
                title="No recent activity"
                description="Service events will appear here once technicians check in or updates are logged."
              />
            )}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Incident response queue</h2>
              <p className="text-sm text-slate-600">Escalations that need triage, reprioritisation, or customer messaging.</p>
            </div>
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-4">
            {incidents.length ? (
              incidents.slice(0, 6).map((incident) => (
                <div key={incident.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{incident.orderReference}</p>
                      <p className="text-xs text-slate-500">Severity: {incident.severity ?? 'review'}</p>
                    </div>
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                        resolveRiskClasses(incident.severity?.toLowerCase())
                      )}
                    >
                      {incident.status}
                    </span>
                  </div>
                  {incident.notes ? <p className="mt-2 text-sm text-slate-600">{incident.notes}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <ShieldExclamationIcon className="h-4 w-4" aria-hidden="true" />
                      <span>{incident.relativeTime ?? incident.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowTrendingUpIcon className="h-4 w-4" aria-hidden="true" />
                      <span>{incident.nextAction ?? 'Review mitigation plan'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <UserCircleIcon className="h-4 w-4" aria-hidden="true" />
                      <span>{incident.owner ?? 'Operations desk'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <DashboardStateMessage
                title="No open incidents"
                description="Escalations will surface here as soon as field events flag a risk or SLA breach."
              />
            )}
          </div>
        </section>
      </div>

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Provider performance matrix</h2>
            <p className="text-sm text-slate-600">
              Review utilisation, punctuality, and incident ratios across your active service partners.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
            <span>{providers.length} providers monitored</span>
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {providers.length ? (
            providers.map((provider) => (
              <div key={provider.id} className="dashboard-card-muted flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{provider.name}</p>
                    <p className="text-xs text-slate-500">{provider.specialties?.join(', ') || 'Generalist'}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {provider.metrics?.completedAssignments ?? 0} completed
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="font-semibold text-slate-700">Active</p>
                    <p className="mt-1 text-slate-900">{provider.metrics?.activeAssignments ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="font-semibold text-slate-700">On-time rate</p>
                    <p className="mt-1 text-slate-900">{provider.metrics?.onTimeRate ?? '—'}%</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="font-semibold text-slate-700">Avg ETA</p>
                    <p className="mt-1 text-slate-900">{provider.metrics?.averageEtaMinutes ?? '—'} min</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="font-semibold text-slate-700">Incidents</p>
                    <p className="mt-1 text-slate-900">{provider.metrics?.incidentCount ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-wide text-slate-500">
                  <span>{provider.lastCheckInRelative ? `Check-in ${provider.lastCheckInRelative}` : 'Awaiting check-in'}</span>
                  {provider.location?.label ? <span>{provider.location.label}</span> : <span>Location pending</span>}
                </div>
              </div>
            ))
          ) : (
            <DashboardStateMessage
              title="No providers synced"
              description="Invite or activate a field service provider to populate utilisation and coverage analytics."
            />
          )}
        </div>
      </section>

      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-3xl border px-5 py-4 text-sm ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : statusMessage.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-primary/20 bg-primary/5 text-primary'
          }`}
        >
          {statusMessage.message}
        </div>
      ) : null}

      {assignmentFormVisible ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-kicker text-primary-dark">
                  {assignmentFormMode === 'create' ? 'Schedule dispatch' : 'Update dispatch details'}
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {assignmentFormMode === 'create'
                    ? 'Book a new technician deployment'
                    : 'Refine the current assignment brief'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Capture location, owner, and scheduling data to keep the operations hub in sync.
                </p>
              </div>
              <button type="button" className="dashboard-pill" onClick={closeAssignmentForm}>
                Close
              </button>
            </div>

            {assignmentFormErrors.length ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <ul className="list-disc space-y-1 pl-5">
                  {assignmentFormErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <form className="mt-6 space-y-6" onSubmit={handleAssignmentFormSubmit}>
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <div className={`flex items-center gap-2 ${assignmentFormStep === 1 ? 'text-primary' : ''}`}>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      assignmentFormStep === 1 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    1
                  </span>
                  <span>Briefing details</span>
                </div>
                <span className="text-slate-300">—</span>
                <div className={`flex items-center gap-2 ${assignmentFormStep === 2 ? 'text-primary' : ''}`}>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      assignmentFormStep === 2 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    2
                  </span>
                  <span>Deployment logistics</span>
                </div>
              </div>

              {assignmentFormStep === 1 ? (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-900">
                    Service type
                    <input
                      type="text"
                      name="serviceType"
                      value={assignmentForm.serviceType}
                      onChange={handleAssignmentFormChange}
                      required
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Network optimisation audit"
                    />
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-900">
                      Priority
                      <select
                        name="priority"
                        value={assignmentForm.priority}
                        onChange={handleAssignmentFormChange}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Standard">Standard</option>
                        <option value="Routine">Routine</option>
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-slate-900">
                      Owner / Squad
                      <input
                        type="text"
                        name="owner"
                        value={assignmentForm.owner}
                        onChange={handleAssignmentFormChange}
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Ops Team Bravo"
                      />
                    </label>
                  </div>
                  <label className="block text-sm font-medium text-slate-900">
                    Service location
                    <input
                      type="text"
                      name="location"
                      value={assignmentForm.location}
                      onChange={handleAssignmentFormChange}
                      required
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Cape Town - Waterfront Campus"
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button type="button" className="dashboard-pill" onClick={closeAssignmentForm}>
                      Cancel
                    </button>
                    <button type="button" className="dashboard-primary-pill" onClick={handleAdvanceAssignmentForm}>
                      Continue to logistics
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-900">
                    Scheduled arrival
                    <input
                      type="datetime-local"
                      name="scheduledFor"
                      value={assignmentForm.scheduledFor}
                      onChange={handleAssignmentFormChange}
                      required
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-900">
                    Support channel (optional)
                    <input
                      type="text"
                      name="supportChannel"
                      value={assignmentForm.supportChannel}
                      onChange={handleAssignmentFormChange}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="#field-support or hotline"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-900">
                    Briefing link (optional)
                    <input
                      type="url"
                      name="briefUrl"
                      value={assignmentForm.briefUrl}
                      onChange={handleAssignmentFormChange}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="https://"
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button type="button" className="dashboard-pill" onClick={handleRewindAssignmentForm}>
                      Back
                    </button>
                    <button type="button" className="dashboard-pill" onClick={closeAssignmentForm}>
                      Cancel
                    </button>
                    <button type="submit" className="dashboard-primary-pill" disabled={disableActions}>
                      {assignmentFormMode === 'create' ? 'Dispatch assignment' : 'Save changes'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default FieldServices;
