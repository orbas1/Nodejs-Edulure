import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { ArrowPathIcon, ShieldCheckIcon, UsersIcon, KeyIcon } from '@heroicons/react/24/outline';

const DEFAULT_PERMISSIONS = {
  post: true,
  broadcast: false,
  moderate: false,
  manageRoles: false,
  manageResources: false,
  scheduleEvents: false,
  hostVoice: false
};

const BUILT_IN_ROLES = [
  {
    roleKey: 'moderator',
    name: 'Moderator',
    description: 'Trusted community moderator with broadcast rights.',
    permissions: {
      ...DEFAULT_PERMISSIONS,
      broadcast: true,
      moderate: true,
      manageResources: true,
      scheduleEvents: true,
      hostVoice: true
    }
  },
  {
    roleKey: 'member',
    name: 'Member',
    description: 'Standard channel participant with message access.',
    permissions: {
      ...DEFAULT_PERMISSIONS
    }
  }
];

const CAPABILITY_LABELS = {
  post: 'Post updates',
  broadcast: 'Broadcast to channel',
  moderate: 'Moderate messages',
  manageRoles: 'Manage roles',
  manageResources: 'Manage resources',
  scheduleEvents: 'Schedule events',
  hostVoice: 'Host live audio'
};

const defaultAssignmentsShape = [];

function normaliseRole(role) {
  const roleKey = role.roleKey ?? role.key ?? role.name ?? '';
  const name = role.name ?? role.label ?? roleKey;
  const permissions = { ...DEFAULT_PERMISSIONS, ...(role.permissions ?? {}) };
  const description = role.description ?? `${name} default permissions`;
  return {
    ...role,
    roleKey,
    name,
    description,
    permissions
  };
}

function normaliseAssignment(assignment) {
  if (!assignment) return null;
  const resolvedRoleKey =
    assignment.roleKey ??
    assignment.role ??
    assignment.role_id ??
    assignment.roleId ??
    (typeof assignment === 'string' ? assignment : '');
  const userId = assignment.userId ?? assignment.memberId ?? assignment.user_id ?? assignment.id ?? null;
  return {
    ...assignment,
    userId,
    roleKey: resolvedRoleKey ? String(resolvedRoleKey).trim() : '',
    isViewer: Boolean(assignment.isViewer ?? assignment.viewer ?? assignment.isSelf)
  };
}

function collectViewerCapabilities(definitions, assignments) {
  const capabilities = { ...DEFAULT_PERMISSIONS };
  const definitionMap = new Map(definitions.map((definition) => [definition.roleKey, definition.permissions]));
  const viewerAssignments = assignments.filter((assignment) => assignment?.isViewer || assignment?.userId === 'self');
  if (viewerAssignments.length === 0) {
    return capabilities;
  }
  viewerAssignments.forEach((assignment) => {
    const permissions = definitionMap.get(assignment.roleKey);
    if (!permissions) return;
    Object.entries(permissions).forEach(([key, value]) => {
      if (value) {
        capabilities[key] = true;
      }
    });
  });
  return capabilities;
}

export default function RoleManagementPanel({
  roles,
  assignments,
  loading,
  error,
  onRefresh,
  createForm,
  onCreateChange,
  onCreateSubmit,
  assignmentForm,
  onAssignmentChange,
  onAssignmentSubmit,
  interactive,
  roleInsights
}) {
  const safeRoles = Array.isArray(roles) ? roles.filter(Boolean).map(normaliseRole) : [];
  const safeAssignments = Array.isArray(assignments)
    ? assignments
        .map((assignment) => normaliseAssignment(assignment))
        .filter((assignment) => assignment && assignment.roleKey)
    : defaultAssignmentsShape;

  const definedRoles = useMemo(
    () =>
      safeRoles.filter((role) => role.roleKey),
    [safeRoles]
  );

  const builtinRoleRecords = useMemo(() => {
    const definedKeys = new Set(definedRoles.map((role) => role.roleKey));
    return BUILT_IN_ROLES.filter((role) => !definedKeys.has(role.roleKey)).map((role) => ({
      id: role.roleKey,
      roleKey: role.roleKey,
      name: role.name,
      description: role.description,
      permissions: role.permissions
    }));
  }, [definedRoles]);

  const displayRoles = useMemo(
    () => [...definedRoles, ...builtinRoleRecords],
    [definedRoles, builtinRoleRecords]
  );

  const roleOptions = useMemo(() => {
    const optionMap = new Map();
    [...displayRoles, ...BUILT_IN_ROLES].forEach((role) => {
      const roleKey = role.roleKey ?? role.key;
      if (!roleKey || optionMap.has(roleKey)) return;
      optionMap.set(roleKey, { roleKey, name: role.name ?? role.label ?? roleKey });
    });
    return Array.from(optionMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [displayRoles]);

  const memberCounts = useMemo(() => {
    const counts = new Map();
    safeAssignments.forEach((assignment) => {
      const normalised = assignment.roleKey;
      if (!normalised) return;
      counts.set(normalised, (counts.get(normalised) ?? 0) + 1);
    });
    return counts;
  }, [safeAssignments]);

  const orphanedRoleKeys = useMemo(() => {
    const knownRoleKeys = new Set(displayRoles.map((role) => role.roleKey));
    const extras = new Set();
    safeAssignments.forEach((assignment) => {
      const normalised = assignment.roleKey;
      if (normalised && !knownRoleKeys.has(normalised)) {
        extras.add(normalised);
      }
    });
    return Array.from(extras).sort();
  }, [displayRoles, safeAssignments]);

  const viewerCapabilities = useMemo(
    () => collectViewerCapabilities(displayRoles, safeAssignments),
    [displayRoles, safeAssignments]
  );

  const totalAssignments = safeAssignments.length;
  const totalRoles = displayRoles.length;
  const managedRoleKeys = new Set(displayRoles.map((role) => role.roleKey));

  const createState = createForm ?? {};
  const safeCreateForm = {
    name: createState.name ?? '',
    roleKey: createState.roleKey ?? '',
    description: createState.description ?? '',
    canBroadcast: Boolean(createState.canBroadcast),
    canModerate: Boolean(createState.canModerate),
    canHostVoice: Boolean(createState.canHostVoice),
    isDefaultAssignable: Boolean(createState.isDefaultAssignable)
  };

  const assignmentState = assignmentForm ?? {};
  const safeAssignmentForm = {
    userId: assignmentState.userId ?? '',
    roleKey: assignmentState.roleKey ?? ''
  };

  const highlightedRoles = Array.isArray(roleInsights)
    ? roleInsights.filter((insight) => insight?.roleKey).slice(0, 3)
    : [];

  const createRoleKeyExists = managedRoleKeys.has(safeCreateForm.roleKey.trim());
  const isCreateDisabled =
    !interactive ||
    !safeCreateForm.name.trim() ||
    !safeCreateForm.roleKey.trim() ||
    createRoleKeyExists;

  const isAssignmentDisabled =
    !interactive ||
    !safeAssignmentForm.userId.trim() ||
    !safeAssignmentForm.roleKey.trim();

  const handleRefresh = () => {
    if (!interactive) return;
    onRefresh();
  };

  const handleCreateSubmit = (event) => {
    event.preventDefault();
    if (!interactive) return;
    if (isCreateDisabled) return;
    const payload = {
      name: safeCreateForm.name.trim(),
      roleKey: safeCreateForm.roleKey.trim(),
      description: safeCreateForm.description.trim(),
      permissions: {
        ...DEFAULT_PERMISSIONS,
        broadcast: Boolean(safeCreateForm.canBroadcast),
        moderate: Boolean(safeCreateForm.canModerate),
        hostVoice: Boolean(safeCreateForm.canHostVoice),
        manageRoles: Boolean(safeCreateForm.canModerate),
        manageResources: Boolean(safeCreateForm.canModerate || safeCreateForm.canBroadcast),
        scheduleEvents: Boolean(safeCreateForm.canBroadcast)
      },
      defaultAssignable: Boolean(safeCreateForm.isDefaultAssignable)
    };
    onCreateSubmit(payload);
  };

  const handleAssignmentSubmit = (event) => {
    event.preventDefault();
    if (!interactive) return;
    if (isAssignmentDisabled) return;
    const payload = {
      userId: safeAssignmentForm.userId.trim(),
      roleKey: safeAssignmentForm.roleKey.trim()
    };
    onAssignmentSubmit(payload);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="dashboard-kicker text-slate-500">Governance</p>
          <h3 className="text-lg font-semibold text-slate-900">Role controls</h3>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!interactive}
          aria-disabled={!interactive}
          aria-busy={loading}
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </header>

      {highlightedRoles.length ? (
        <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
          {highlightedRoles.map((insight) => (
            <div key={insight.roleKey} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
              <p className="font-semibold text-slate-700">{insight.roleKey}</p>
              <p className="mt-1">Members: {insight.members ?? 0}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Live: {insight.online ?? 0} · Away: {insight.away ?? 0}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-2 text-xs text-slate-500">
        Configure moderators, voice hosts, and broadcast leads. Align permissions with programme policies in minutes. RBAC
        changes require moderator privileges.
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
          <ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {totalRoles} roles
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
          <UsersIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {totalAssignments} assignments
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
          <KeyIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {viewerCapabilities.manageRoles ? 'Can manage roles' : 'Read only'}
        </span>
      </div>

      <div className="mt-3 text-xs" aria-live="polite">
        {error ? (
          <p className="text-rose-600">
            {typeof error === 'string' ? error : error?.message ?? 'Unable to load roles. Refresh to retry.'}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {loading && displayRoles.length === 0 ? (
          <p className="text-xs text-slate-500">Loading roles…</p>
        ) : displayRoles.length === 0 ? (
          <p className="text-xs text-slate-500">No roles configured. Draft your first custom role to unlock delegation.</p>
        ) : (
          <ul className="space-y-2">
            {displayRoles.map((role) => (
              <li
                key={role.id ?? role.roleKey}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-slate-600"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{role.name}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{role.roleKey}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{role.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(role.permissions)
                        .filter(([, enabled]) => enabled)
                        .map(([permission]) => (
                          <span key={`${role.roleKey}-${permission}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                            {CAPABILITY_LABELS[permission] ?? permission}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <p>{memberCounts.get(role.roleKey) ?? 0} members</p>
                  <p className="mt-1">Broadcast: {role.permissions?.broadcast ? 'Yes' : 'No'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {orphanedRoleKeys.length > 0 ? (
        <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-[11px] text-amber-700">
          Found assignments for undefined roles: {orphanedRoleKeys.join(', ')}. Sync RBAC metadata to prevent drift.
        </p>
      ) : null}

      <form onSubmit={handleCreateSubmit} className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Create role</p>
        {createRoleKeyExists ? (
          <p className="text-[11px] text-amber-600">A role with this key already exists.</p>
        ) : null}
        <label className="text-xs font-medium text-slate-500">
          Name
          <input
            type="text"
            required
            value={safeCreateForm.name}
            onChange={(event) => onCreateChange({ ...createForm, name: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!interactive}
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Role key
          <input
            type="text"
            required
            value={safeCreateForm.roleKey}
            onChange={(event) => onCreateChange({ ...createForm, roleKey: event.target.value })}
            placeholder="community.moderator"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!interactive}
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Description
          <textarea
            rows={3}
            value={safeCreateForm.description}
            onChange={(event) => onCreateChange({ ...createForm, description: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!interactive}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <input
              type="checkbox"
              checked={safeCreateForm.canBroadcast}
              onChange={(event) => onCreateChange({ ...createForm, canBroadcast: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
              disabled={!interactive}
            />
            Broadcast access
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <input
              type="checkbox"
              checked={safeCreateForm.canModerate}
              onChange={(event) => onCreateChange({ ...createForm, canModerate: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
              disabled={!interactive}
            />
            Moderate chats
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <input
              type="checkbox"
              checked={safeCreateForm.canHostVoice}
              onChange={(event) => onCreateChange({ ...createForm, canHostVoice: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
              disabled={!interactive}
            />
            Host voice rooms
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <input
            type="checkbox"
            checked={safeCreateForm.isDefaultAssignable}
            onChange={(event) => onCreateChange({ ...createForm, isDefaultAssignable: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
            disabled={!interactive}
          />
          Default assignable
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/50"
          disabled={isCreateDisabled}
        >
          {isCreateDisabled ? 'Fill required fields' : 'Create role'}
        </button>
      </form>

      <form onSubmit={handleAssignmentSubmit} className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assign role</p>
        <label className="text-xs font-medium text-slate-500">
          Member ID
          <input
            type="text"
            required
            value={safeAssignmentForm.userId}
            onChange={(event) => onAssignmentChange({ ...assignmentForm, userId: event.target.value })}
            placeholder="user_123"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!interactive}
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Role key
          <select
            value={safeAssignmentForm.roleKey}
            onChange={(event) => onAssignmentChange({ ...assignmentForm, roleKey: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!interactive}
          >
            <option value="">Select role</option>
            {roleOptions.map((role) => (
              <option key={role.roleKey} value={role.roleKey}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isAssignmentDisabled}
        >
          {isAssignmentDisabled ? 'Provide member & role' : 'Assign role'}
        </button>
      </form>
    </section>
  );
}

RoleManagementPanel.propTypes = {
  roles: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      roleKey: PropTypes.string,
      key: PropTypes.string,
      name: PropTypes.string,
      label: PropTypes.string,
      description: PropTypes.string,
      permissions: PropTypes.shape({
        broadcast: PropTypes.bool
      })
    })
  ).isRequired,
  assignments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      roleKey: PropTypes.string,
      role: PropTypes.string,
      role_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      roleId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })
  ).isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.any,
  onRefresh: PropTypes.func.isRequired,
  createForm: PropTypes.shape({
    name: PropTypes.string,
    roleKey: PropTypes.string,
    description: PropTypes.string,
    canBroadcast: PropTypes.bool,
    canModerate: PropTypes.bool,
    canHostVoice: PropTypes.bool,
    isDefaultAssignable: PropTypes.bool
  }).isRequired,
  onCreateChange: PropTypes.func.isRequired,
  onCreateSubmit: PropTypes.func.isRequired,
  assignmentForm: PropTypes.shape({
    userId: PropTypes.string,
    roleKey: PropTypes.string
  }).isRequired,
  onAssignmentChange: PropTypes.func.isRequired,
  onAssignmentSubmit: PropTypes.func.isRequired,
  interactive: PropTypes.bool.isRequired,
  roleInsights: PropTypes.arrayOf(
    PropTypes.shape({
      roleKey: PropTypes.string.isRequired,
      members: PropTypes.number,
      online: PropTypes.number,
      away: PropTypes.number
    })
  )
};

RoleManagementPanel.defaultProps = {
  error: null,
  roleInsights: []
};
