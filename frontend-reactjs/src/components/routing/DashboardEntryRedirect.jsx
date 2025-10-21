import { useCallback, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import DashboardStateMessage from '../dashboard/DashboardStateMessage.jsx';
import { useDashboard } from '../../context/DashboardContext.jsx';

export default function DashboardEntryRedirect() {
  const { activeRole, roles, loading, error, refresh } = useDashboard();
  const navigate = useNavigate();

  const resolvedRole = useMemo(() => activeRole ?? roles[0]?.id ?? null, [activeRole, roles]);
  const hasResolvedRole = Boolean(resolvedRole);

  const handleRetry = useCallback(() => {
    if (typeof refresh === 'function') {
      refresh();
    }
  }, [refresh]);

  const handleBrowseCommunity = useCallback(() => {
    navigate('/feed', { replace: true });
  }, [navigate]);

  if (loading && !hasResolvedRole) {
    return (
      <DashboardStateMessage
        variant="loading"
        title="Preparing your workspace"
        description="We are syncing your dashboards and permissions."
      />
    );
  }

  if (hasResolvedRole) {
    return <Navigate to={`/dashboard/${resolvedRole}`} replace />;
  }

  if (error) {
    const message = error?.message ?? 'We could not load your dashboard data. Please try again.';
    return (
      <DashboardStateMessage
        variant="error"
        title="Unable to load dashboard"
        description={message}
        actionLabel="Retry"
        onAction={handleRetry}
      />
    );
  }

  return (
    <DashboardStateMessage
      title="No dashboards assigned yet"
      description="You do not have any dashboards yet. Browse the community while we get things ready."
      actionLabel="Browse community"
      onAction={handleBrowseCommunity}
    />
  );
}
