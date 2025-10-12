import PropTypes from 'prop-types';
import { createContext, useContext, useMemo, useState } from 'react';
import {
  availableDashboardRoles,
  dashboardSearchIndex,
  dashboardUserProfile,
  instructorDashboardData,
  learnerDashboardData
} from '../data/dashboardData.js';

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const [activeRole, setActiveRole] = useState(availableDashboardRoles[0]?.id ?? 'learner');

  const value = useMemo(
    () => ({
      activeRole,
      setActiveRole,
      profile: dashboardUserProfile,
      roles: availableDashboardRoles,
      dashboards: {
        learner: learnerDashboardData,
        instructor: instructorDashboardData
      },
      searchIndex: dashboardSearchIndex
    }),
    [activeRole]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

DashboardProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
