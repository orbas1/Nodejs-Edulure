import PropTypes from 'prop-types';
import { Link, Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';
import { useDashboard } from '../../context/DashboardContext.jsx';

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

  const baseRole = user.role ? String(user.role).toLowerCase() : null;
  const communityRole = user.communityRole ? String(user.communityRole).toLowerCase() : null;

  if (baseRole) {
    derived.add(baseRole);
    const mapped =
      {
        learner: 'member',
        instructor: 'owner'
      }[baseRole];
    if (mapped) {
      derived.add(mapped);
    }
  }

  if (communityRole) {
    derived.add(communityRole);
  }

  if (Array.isArray(user.roles)) {
    user.roles
      .map((role) => (typeof role === 'string' ? role : role?.id ?? role?.code ?? role?.name))
      .filter(Boolean)
      .forEach((role) => {
        derived.add(String(role).toLowerCase());
      });
  }

  if (Array.isArray(user.scopes)) {
    user.scopes.filter(Boolean).forEach((scope) => derived.add(String(scope).toLowerCase()));
  }

  if (Array.isArray(user.permissions)) {
    user.permissions
      .filter(Boolean)
      .forEach((permission) => {
        const value = String(permission).toLowerCase();
        derived.add(value);
        derived.add(`perm:${value}`);
      });
  }

  if (derived.size === 0) {
    derived.add('non-member');
  }

  return derived;
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

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const normalizedAllowed = allowedRoles
      .map((role) => String(role).trim().toLowerCase())
      .filter(Boolean);
    const allowAny = normalizedAllowed.some((role) => role === '*' || role === 'any');

    if (!allowAny) {
      const aggregatedRoles = new Set(deriveRoleSet(session?.user));

      (Array.isArray(dashboardRoles) ? dashboardRoles : []).forEach((role) => {
        if (!role) return;

        const identifier = role?.id ?? role?.code ?? role?.name ?? role;
        if (identifier) {
          aggregatedRoles.add(String(identifier).toLowerCase());
        }
        if (Array.isArray(role?.permissions)) {
          role.permissions
            .filter(Boolean)
            .forEach((permission) => aggregatedRoles.add(String(permission).toLowerCase()));
        }
      });

      const hasAccess = normalizedAllowed.some((role) => aggregatedRoles.has(role));

      if (!hasAccess) {
        return (
          <section className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-6 py-16" role="alert">
            <div className="max-w-md space-y-4 text-center">
              <h1 className="text-2xl font-semibold text-slate-900">Access restricted</h1>
              <p className="text-sm leading-relaxed text-slate-600">
                You do not have the required permissions to view this area. If you believe this is a mistake, refresh your
                dashboard or contact an administrator to request access.
              </p>
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
  allowedRoles: PropTypes.arrayOf(PropTypes.string)
};

ProtectedRoute.defaultProps = {
  allowedRoles: undefined
};
