import PropTypes from 'prop-types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { DefaultService } from '@edulure/api-sdk';

import { prepareApiSdk } from '../api/sdkClient.js';
import { useAuth } from './AuthContext.jsx';

const ServiceHealthContext = createContext(null);
const DEFAULT_POLL_INTERVAL = 60000;

const LEVEL_BY_STATUS = {
  outage: 'critical',
  degraded: 'warning',
  unknown: 'warning',
  disabled: 'info'
};

function mapStatusToLevel(status) {
  return LEVEL_BY_STATUS[status] ?? 'info';
}

function deriveAlerts(manifest) {
  if (!manifest) {
    return [];
  }

  const capabilityByService = new Map();
  (manifest.capabilities ?? []).forEach((capability) => {
    (capability.dependencies ?? []).forEach((dependency) => {
      if (!capabilityByService.has(dependency)) {
        capabilityByService.set(dependency, []);
      }
      capabilityByService.get(dependency).push(capability);
    });
  });

  const alerts = [];

  (manifest.services ?? []).forEach((service) => {
    if (!service || service.status === 'operational') {
      return;
    }
    const affectedCaps = capabilityByService.get(service.key) ?? [];
    alerts.push({
      id: `service-${service.key}`,
      type: 'service',
      level: mapStatusToLevel(service.status),
      title: `${service.name} ${service.status === 'outage' ? 'unavailable' : 'degraded'}`,
      message: service.summary,
      affectedServices: [service.key],
      affectedCapabilities: affectedCaps.map((cap) => cap.capability),
      status: service.status,
      checkedAt: service.checkedAt
    });
  });

  (manifest.capabilities ?? []).forEach((capability) => {
    if (!capability || capability.status === 'operational') {
      return;
    }

    alerts.push({
      id: `capability-${capability.capability}`,
      type: 'capability',
      level: mapStatusToLevel(capability.status),
      title:
        capability.status === 'disabled'
          ? `${capability.name ?? capability.capability} disabled`
          : `${capability.name ?? capability.capability} impacted`,
      message: capability.summary,
      affectedServices: capability.dependencies ?? [],
      affectedCapabilities: [capability.capability],
      status: capability.status,
      evaluation: capability.evaluation,
      checkedAt: capability.generatedAt
    });
  });

  const severityRank = { critical: 3, warning: 2, info: 1 };
  alerts.sort((a, b) => severityRank[b.level] - severityRank[a.level]);

  return alerts;
}

export function ServiceHealthProvider({ children, pollIntervalMs = DEFAULT_POLL_INTERVAL }) {
  const { session, isAuthenticated } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: null,
    manifest: null,
    lastUpdated: null
  });
  const mountedRef = useRef(true);

  const fetchManifest = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const token = isAuthenticated ? session?.tokens?.accessToken : undefined;
      prepareApiSdk({ token });
      const response = await DefaultService.getRuntimeCapabilityManifest();
      const payload = response?.data ?? null;
      if (!mountedRef.current) {
        return;
      }
      setState({
        loading: false,
        error: null,
        manifest: payload,
        lastUpdated: payload?.generatedAt ?? new Date().toISOString()
      });
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        error,
        manifest: prev.manifest
      }));
    }
  }, [isAuthenticated, session?.tokens?.accessToken]);

  useEffect(() => {
    mountedRef.current = true;
    fetchManifest();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchManifest]);

  useEffect(() => {
    if (pollIntervalMs <= 0) {
      return undefined;
    }
    const interval = setInterval(() => {
      fetchManifest();
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchManifest, pollIntervalMs]);

  const alerts = useMemo(() => deriveAlerts(state.manifest), [state.manifest]);

  const servicesByKey = useMemo(() => {
    const map = new Map();
    (state.manifest?.services ?? []).forEach((service) => {
      map.set(service.key, service);
    });
    return map;
  }, [state.manifest]);

  const value = useMemo(
    () => ({
      loading: state.loading,
      error: state.error,
      manifest: state.manifest,
      lastUpdated: state.manifest?.generatedAt ?? state.lastUpdated,
      alerts,
      servicesByKey,
      refresh: fetchManifest
    }),
    [alerts, fetchManifest, servicesByKey, state.loading, state.error, state.manifest, state.lastUpdated]
  );

  return <ServiceHealthContext.Provider value={value}>{children}</ServiceHealthContext.Provider>;
}

ServiceHealthProvider.propTypes = {
  children: PropTypes.node.isRequired,
  pollIntervalMs: PropTypes.number
};

export function useServiceHealth() {
  const context = useContext(ServiceHealthContext);
  if (!context) {
    throw new Error('useServiceHealth must be used within a ServiceHealthProvider');
  }
  return context;
}
