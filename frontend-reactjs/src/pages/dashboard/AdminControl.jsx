import { useCallback, useEffect, useMemo, useState } from 'react';

import adminControlApi from '../../api/adminControlApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import AdminCrudResource from '../../components/dashboard/admin/AdminCrudResource.jsx';
import AdminPodcastManager from '../../components/dashboard/admin/AdminPodcastManager.jsx';
import AdminShell from '../../layouts/AdminShell.jsx';
import useAdminOperationsInsights from '../../hooks/useAdminOperationsInsights.js';
import {
  ADMIN_CONTROL_TABS,
  createAdminControlResourceConfigs
} from './admin/adminControlConfig.jsx';

export default function AdminControl() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const isAdmin = session?.user?.role === 'admin';
  const resourceConfigs = useMemo(() => createAdminControlResourceConfigs(), []);
  const tabOrder = useMemo(
    () => ADMIN_CONTROL_TABS.filter((tab) => resourceConfigs[tab.id]),
    [resourceConfigs]
  );
  const [activeTab, setActiveTab] = useState(() => tabOrder[0]?.id ?? ADMIN_CONTROL_TABS[0].id);

  const {
    insights,
    loading: insightsLoading,
    error: insightsError,
    refresh: refreshInsights
  } = useAdminOperationsInsights({ token: isAdmin ? token : null });

  const statusBlocks = useMemo(() => {
    if (!isAdmin) {
      return [];
    }

    const totals = insights.analytics?.totals ?? {};
    const counts = insights.analytics?.countsBySeverity ?? {};
    const releaseScore = insights.release?.readiness?.score ?? null;
    const readinessTone = releaseScore === null
      ? 'info'
      : releaseScore >= 80
        ? 'success'
        : releaseScore >= 60
          ? 'info'
          : 'warning';

    return [
      {
        id: 'audit-events',
        title: 'Audit events (24h)',
        value: totals.events ?? 0,
        helper: `${counts.warning ?? 0} warnings · ${counts.error ?? 0} errors`,
        tone: totals.events > 120 ? 'warning' : 'info'
      },
      {
        id: 'release-readiness',
        title: 'Release readiness',
        value: releaseScore === null ? '—' : `${releaseScore}%`,
        helper: insights.release?.readiness?.nextGate?.title ?? 'Checklist progress',
        tone: readinessTone
      },
      {
        id: 'flag-overrides',
        title: 'Flag overrides',
        value: insights.featureFlags?.summary?.overridden ?? 0,
        helper: 'Tenant-specific experiments',
        tone: (insights.featureFlags?.summary?.overridden ?? 0) > 0 ? 'warning' : 'neutral'
      },
      {
        id: 'governance-reviews',
        title: 'Upcoming governance reviews',
        value: insights.compliance?.contracts?.length ?? 0,
        helper: 'Contracts requiring operator attention',
        tone: (insights.compliance?.contracts?.length ?? 0) > 2 ? 'warning' : 'info'
      }
    ];
  }, [insights, isAdmin]);

  const alerts = useMemo(() => {
    if (!insightsError || !isAdmin) {
      return [];
    }
    return [
      {
        id: 'insights-error',
        tone: 'warning',
        title: 'Operational insights temporarily unavailable',
        description: insightsError.message
      }
    ];
  }, [insightsError, isAdmin]);

  useEffect(() => {
    if (!tabOrder.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabOrder[0]?.id ?? ADMIN_CONTROL_TABS[0].id);
    }
  }, [tabOrder, activeTab]);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  if (!isAdmin) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Admin privileges required"
        description="Switch to an administrator Learnspace or request elevated permissions to manage operational resources."
      />
    );
  }

  if (!token) {
    return (
      <DashboardStateMessage
        title="Admin authentication required"
        description="Sign in with an administrator account to access the operational control centre."
      />
    );
  }

  const config = resourceConfigs[activeTab];

  if (!config) {
    return (
      <DashboardStateMessage
        title="Module unavailable"
        description="The selected operational module is not currently enabled for your account. Choose another tab to continue."
      />
    );
  }

  return (
    <AdminShell
      title="Operational control centre"
      description="Activate, iterate, and retire platform programmes across communities, courses, tutors, live experiences, and media."
      navigation={tabOrder}
      activeNavigation={activeTab}
      onNavigate={handleTabChange}
      statusBlocks={statusBlocks}
      alerts={alerts}
      quickLinks={insights.quickLinks}
      auditTrail={insights.timeline}
      auditLoading={insightsLoading}
      onRefreshInsights={refreshInsights}
      analytics={insights.analytics}
      featureFlags={insights.featureFlags}
    >
      {activeTab === 'podcasts' ? (
        <AdminPodcastManager token={token} api={adminControlApi} />
      ) : (
        <AdminCrudResource
          token={token}
          title={config.title}
          description={config.description}
          entityName={config.entityName}
          listRequest={({ token: authToken, params, signal, context }) =>
            config.listRequest({ token: authToken, params, signal, context })
          }
          createRequest={({ token: authToken, payload, context }) =>
            config.createRequest({ token: authToken, payload, context })
          }
          updateRequest={({ token: authToken, id, payload, context }) =>
            config.updateRequest(id, { token: authToken, payload, context })
          }
          deleteRequest={({ token: authToken, id, context }) =>
            config.deleteRequest(id, { token: authToken, context })
          }
          fields={config.fields}
          columns={config.columns}
          statusOptions={config.statusOptions}
          searchPlaceholder={`Search ${config.entityName}s`}
        />
      )}
    </AdminShell>
  );
}
