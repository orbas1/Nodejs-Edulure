import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';
import { useDashboard } from '../../context/DashboardContext.jsx';

export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const { isAuthenticated, session } = useAuth();
  const { roles: dashboardRoles } = useDashboard();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const roleSet = new Set();
    const primaryRole = session?.user?.role;
    if (primaryRole) {
      roleSet.add(primaryRole);
    }
    dashboardRoles.forEach((role) => {
      if (role?.id) {
        roleSet.add(role.id);
      }
    });

    const hasAccess = allowedRoles.some((role) => roleSet.has(role));
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
