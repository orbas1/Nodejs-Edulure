import PropTypes from 'prop-types';
import { ArrowPathIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const BUILT_IN_ROLES = [
  { roleKey: 'moderator', name: 'Moderator' },
  { roleKey: 'member', name: 'Member' }
];

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
  interactive
}) {
  const roleOptions = [...roles.map((role) => ({ roleKey: role.roleKey, name: role.name })), ...BUILT_IN_ROLES];

  const memberCounts = roles.reduce((acc, role) => {
    const count = assignments.filter((assignment) => assignment.role === role.roleKey).length;
    acc.set(role.roleKey, count);
    return acc;
  }, new Map());

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="dashboard-kicker text-slate-500">Governance</p>
          <h3 className="text-lg font-semibold text-slate-900">Role controls</h3>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <p className="mt-2 text-xs text-slate-500">
        Configure moderators, voice hosts, and broadcast leads. Align permissions with programme policies in minutes.
      </p>

      <div className="mt-4 space-y-3">
        {loading && roles.length === 0 ? (
          <p className="text-xs text-slate-500">Loading roles…</p>
        ) : error ? (
          <p className="text-xs text-rose-600">Unable to load roles. Refresh to retry.</p>
        ) : roles.length === 0 ? (
          <p className="text-xs text-slate-500">No roles configured. Draft your first custom role to unlock delegation.</p>
        ) : (
          <ul className="space-y-2">
            {roles.map((role) => (
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

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onCreateSubmit();
        }}
        className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Create role</p>
        <label className="text-xs font-medium text-slate-500">
          Name
          <input
            type="text"
            required
            value={createForm.name}
            onChange={(event) => onCreateChange({ ...createForm, name: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Role key
          <input
            type="text"
            required
            value={createForm.roleKey}
            onChange={(event) => onCreateChange({ ...createForm, roleKey: event.target.value })}
            placeholder="community.moderator"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Description
          <textarea
            rows={3}
            value={createForm.description}
            onChange={(event) => onCreateChange({ ...createForm, description: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <input
              type="checkbox"
              checked={createForm.canBroadcast}
              onChange={(event) => onCreateChange({ ...createForm, canBroadcast: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            Broadcast access
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <input
              type="checkbox"
              checked={createForm.canModerate}
              onChange={(event) => onCreateChange({ ...createForm, canModerate: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            Moderate chats
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <input
              type="checkbox"
              checked={createForm.canHostVoice}
              onChange={(event) => onCreateChange({ ...createForm, canHostVoice: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            Host voice rooms
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <input
            type="checkbox"
            checked={createForm.isDefaultAssignable}
            onChange={(event) => onCreateChange({ ...createForm, isDefaultAssignable: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          Default assignable
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/50"
          disabled={!interactive}
        >
          Create role
        </button>
      </form>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onAssignmentSubmit();
        }}
        className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assign role</p>
        <label className="text-xs font-medium text-slate-500">
          Member ID
          <input
            type="text"
            required
            value={assignmentForm.userId}
            onChange={(event) => onAssignmentChange({ ...assignmentForm, userId: event.target.value })}
            placeholder="user_123"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Role key
          <select
            value={assignmentForm.roleKey}
            onChange={(event) => onAssignmentChange({ ...assignmentForm, roleKey: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
          disabled={!interactive}
        >
          Assign role
        </button>
      </form>
    </section>
  );
}

RoleManagementPanel.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.object).isRequired,
  assignments: PropTypes.arrayOf(PropTypes.object).isRequired,
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
  interactive: PropTypes.bool.isRequired
};

RoleManagementPanel.defaultProps = {
  error: null
};
