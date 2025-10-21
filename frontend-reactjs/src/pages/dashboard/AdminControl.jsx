import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

import adminControlApi from '../../api/adminControlApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import AdminCrudResource from '../../components/dashboard/admin/AdminCrudResource.jsx';
import AdminPodcastManager from '../../components/dashboard/admin/AdminPodcastManager.jsx';
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
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Operational control centre</h1>
          <p className="mt-2 text-sm text-slate-600">
            Activate, iterate, and retire platform programmes across communities, courses, tutors, live experiences, and media.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {tabOrder.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={clsx(
                'rounded-full border px-4 py-2 text-xs font-semibold transition',
                activeTab === tab.id
                  ? 'border-primary bg-primary text-white shadow'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'
              )}
              aria-pressed={activeTab === tab.id}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

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
    </div>
  );
}
