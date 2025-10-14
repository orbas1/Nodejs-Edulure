import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';
import { useDashboard } from '../../context/DashboardContext.jsx';

function deriveRoleSet(user) {
  const derived = new Set();
  if (!user) {
    derived.add('non-member');
    return derived;
  }

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

  if (derived.size === 0) {
    derived.add('non-member');
  }

  return derived;
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const { isAuthenticated, session } = useAuth();
  const { roles: dashboardRoles } = useDashboard();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const normalizedAllowed = allowedRoles.map((role) => String(role).toLowerCase());
    const derivedRoles = deriveRoleSet(session?.user);

    const aggregatedRoles = new Set(derivedRoles);
    dashboardRoles.forEach((role) => {
      if (!role) {
        return;
      }

      const identifier = role?.id ?? role?.code ?? role;
      if (identifier) {
        aggregatedRoles.add(String(identifier).toLowerCase());
      }
    });

    const hasAccess = normalizedAllowed.some((role) => aggregatedRoles.has(role));
    if (!hasAccess) {
      return <Navigate to="/" replace />;
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
