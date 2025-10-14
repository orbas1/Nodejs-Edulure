import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';

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

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRoles = deriveRoleSet(session?.user);
    const allowed = allowedRoles.map((role) => String(role).toLowerCase());
    const hasRole = allowed.some((role) => userRoles.has(role));
    if (!hasRole) {
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
