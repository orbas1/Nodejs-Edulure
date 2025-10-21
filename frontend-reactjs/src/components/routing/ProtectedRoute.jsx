import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Link, Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';
import { useDashboard } from '../../context/DashboardContext.jsx';

function ensureArray(value) {
  if (!value && value !== 0) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  return [value];
}

function addNormalised(target, value, prefix) {
  if (value === null || value === undefined) return;
  const normalised = String(value).trim().toLowerCase();
  if (!normalised) return;
  target.add(normalised);
  if (prefix) {
    target.add(`${prefix}:${normalised}`);
  }
}

function deriveRoleSet(user) {
  const derived = new Set();
  if (!user) {
    derived.add('guest');
    derived.add('non-member');
    derived.add('anonymous');
    return derived;
  }

  derived.add('authenticated');
  derived.add('user');

  addNormalised(derived, user.role, 'role');
  addNormalised(derived, user.communityRole, 'role');

  const membershipSources = [
    user.membership,
    ...ensureArray(user.memberships),
    ...ensureArray(user.communityMemberships)
  ].filter(Boolean);

  membershipSources.forEach((membership) => {
    addNormalised(derived, membership?.role ?? membership?.name ?? membership?.code, 'role');
    addNormalised(derived, membership?.status, 'membership');
    addNormalised(derived, membership?.tier ?? membership?.type ?? membership?.level, 'membership');
    if (membership?.status && String(membership.status).toLowerCase() !== 'non-member') {
      derived.add('member');
      derived.add('community');
    }
  });

  ensureArray(user.roles).forEach((role) => {
    if (typeof role === 'string' || typeof role === 'number') {
      addNormalised(derived, role, 'role');
      return;
    }
    if (!role || typeof role !== 'object') return;

    const identifier = role.id ?? role.code ?? role.name ?? role.value ?? role.role ?? role.type ?? role.slug;
    addNormalised(derived, identifier, 'role');

    ensureArray(role.aliases).forEach((alias) => addNormalised(derived, alias, 'role'));
    ensureArray(role.permissions).forEach((permission) => addNormalised(derived, permission, 'perm'));
    ensureArray(role.scopes).forEach((scope) => addNormalised(derived, scope, 'scope'));
    ensureArray(role.tags).forEach((tag) => addNormalised(derived, tag, 'tag'));
    ensureArray(role.labels).forEach((label) => addNormalised(derived, label, 'label'));
    ensureArray(role.capabilities).forEach((capability) => addNormalised(derived, capability, 'capability'));
    ensureArray(role.groups).forEach((group) => addNormalised(derived, group, 'group'));
  });

  ensureArray(user.scopes).forEach((scope) => addNormalised(derived, scope, 'scope'));
  ensureArray(user.permissions).forEach((permission) => addNormalised(derived, permission, 'perm'));
  ensureArray(user.capabilities).forEach((capability) => addNormalised(derived, capability, 'capability'));
  ensureArray(user.tags).forEach((tag) => addNormalised(derived, tag, 'tag'));
  ensureArray(user.labels).forEach((label) => addNormalised(derived, label, 'label'));
  ensureArray(user.groups).forEach((group) => addNormalised(derived, group, 'group'));
  ensureArray(user.teams).forEach((team) => addNormalised(derived, team, 'team'));

  if (derived.size === 0) {
    derived.add('non-member');
  }

  return derived;
}

function normaliseAllowedRoles(allowedRoles) {
  if (!allowedRoles && allowedRoles !== 0) return [];

  const base = Array.isArray(allowedRoles)
    ? allowedRoles
    : allowedRoles instanceof Set
      ? Array.from(allowedRoles)
      : [allowedRoles];

  const flattened = base.flatMap((entry) => {
    if (entry instanceof Set) {
      return Array.from(entry);
    }
    if (Array.isArray(entry)) {
      return entry;
    }
    if (typeof entry === 'string') {
      return entry.split(',');
    }
    if (typeof entry === 'number') {
      return [String(entry)];
    }
    if (entry && typeof entry === 'object') {
      return [
        entry.role,
        entry.value,
        entry.code,
        entry.name,
        entry.id,
        entry.permission,
        entry.scope,
        entry.type,
        entry.label,
        entry.slug
      ].filter((value) => typeof value === 'string' || typeof value === 'number');
    }
    return [];
  });

  return Array.from(
    new Set(
      flattened
        .map((token) => String(token).trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function startCase(value) {
  return value
    .replace(/[:/_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatRoleLabel(token) {
  if (!token) return '';
  const cleaned = token.replace(/[-_]/g, ' ');
  const [maybePrefix, ...rest] = cleaned.split(':');
  if (rest.length === 0) {
    return startCase(cleaned);
  }

  const prefixMap = {
    perm: 'Permission',
    role: 'Role',
    scope: 'Scope',
    membership: 'Membership',
    capability: 'Capability',
    tag: 'Tag',
    label: 'Label',
    group: 'Group',
    team: 'Team'
  };

  const descriptor = prefixMap[maybePrefix.trim().toLowerCase()];
  if (!descriptor) {
    return startCase(cleaned);
  }

  return `${descriptor}: ${startCase(rest.join(':').trim())}`;
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const { isAuthenticated, session, isLoading: authLoading } = useAuth();
  const {
    roles: dashboardRoles = [],
    loading: dashboardLoading = false,
    error: dashboardError = null,
    refresh: refreshDashboard = () => {}
  } = useDashboard();

  const normalizedAllowed = useMemo(() => normaliseAllowedRoles(allowedRoles), [allowedRoles]);

  const aggregatedRoles = useMemo(() => {
    const aggregate = deriveRoleSet(session?.user);
    ensureArray(session?.capabilities).forEach((capability) => addNormalised(aggregate, capability, 'capability'));
    ensureArray(session?.permissions).forEach((permission) => addNormalised(aggregate, permission, 'perm'));
    ensureArray(session?.scopes).forEach((scope) => addNormalised(aggregate, scope, 'scope'));

    ensureArray(dashboardRoles).forEach((role) => {
      if (typeof role === 'string' || typeof role === 'number') {
        addNormalised(aggregate, role, 'role');
        return;
      }
      if (!role || typeof role !== 'object') return;

      const identifier = role.id ?? role.code ?? role.name ?? role.slug ?? role.type ?? role.role;
      addNormalised(aggregate, identifier, 'role');
      ensureArray(role.aliases).forEach((alias) => addNormalised(aggregate, alias, 'role'));
      ensureArray(role.permissions).forEach((permission) => addNormalised(aggregate, permission, 'perm'));
      ensureArray(role.scopes).forEach((scope) => addNormalised(aggregate, scope, 'scope'));
      ensureArray(role.tags).forEach((tag) => addNormalised(aggregate, tag, 'tag'));
      ensureArray(role.labels).forEach((label) => addNormalised(aggregate, label, 'label'));
      ensureArray(role.capabilities).forEach((capability) => addNormalised(aggregate, capability, 'capability'));
    });

    return aggregate;
  }, [dashboardRoles, session]);

  const requiredRoleDescriptions = useMemo(
    () =>
      normalizedAllowed
        .filter((role) => role !== '*' && role !== 'any')
        .map((role) => formatRoleLabel(role))
        .filter(Boolean),
    [normalizedAllowed]
  );

  const verifyingAccess = Boolean(authLoading || dashboardLoading);

  if (!isAuthenticated && !verifyingAccess) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (verifyingAccess) {
    return (
      <section
        aria-busy="true"
        aria-live="polite"
        className="flex min-h-[50vh] items-center justify-center bg-slate-50 px-6 py-16"
        data-testid="protected-route-loading"
      >
        <div className="space-y-4 text-center">
          <span className="mx-auto block h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm font-semibold text-slate-700">Checking your access…</p>
          <p className="text-xs text-slate-500">Hang tight while we confirm your permissions for this area.</p>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (normalizedAllowed.length > 0) {
    const allowAny = normalizedAllowed.some((role) => role === '*' || role === 'any');

    if (!allowAny) {
      const hasAccess = normalizedAllowed.some((role) => aggregatedRoles.has(role));

      if (!hasAccess) {
        return (
          <section className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-6 py-16" role="alert">
            <div className="max-w-lg space-y-6 text-center">
              <h1 className="text-2xl font-semibold text-slate-900">Access restricted</h1>
              <p className="text-sm leading-relaxed text-slate-600">
                You do not have the required permissions to view this area. If you believe this is a mistake, refresh your
                dashboard or contact an administrator to request access.
              </p>
              {requiredRoleDescriptions.length > 0 ? (
                <div className="rounded-xl bg-white/80 p-4 text-left shadow-inner">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required access</p>
                  <ul className="mt-2 space-y-2">
                    {requiredRoleDescriptions.map((label) => (
                      <li key={label} className="flex items-start gap-2 text-sm text-slate-600">
                        <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {dashboardError ? (
                <p className="text-xs font-semibold text-red-600">{dashboardError.message ?? 'Unable to verify access.'}</p>
              ) : null}
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => refreshDashboard?.()}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                >
                  Retry access check
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
                >
                  Go to homepage
                </Link>
              </div>
            </div>
          </section>
        );
      }
    }
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])),
    PropTypes.instanceOf(Set),
    PropTypes.string
  ])
};

ProtectedRoute.defaultProps = {
  allowedRoles: undefined
};
