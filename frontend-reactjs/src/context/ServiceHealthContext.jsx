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
import { useRealtime } from './RealtimeContext.jsx';

const ServiceHealthContext = createContext(null);
const DEFAULT_POLL_INTERVAL = 60000;

const EMPTY_STATUS_SUMMARY = Object.freeze({
  services: Object.freeze({ operational: 0, degraded: 0, outage: 0, disabled: 0, unknown: 0 }),
  capabilities: Object.freeze({ operational: 0, degraded: 0, outage: 0, disabled: 0, unknown: 0 })
});

function createDefaultServiceHealth() {
  return {
    loading: false,
    error: null,
    manifest: null,
    lastUpdated: null,
    alerts: [],
    servicesByKey: new Map(),
    impactMatrix: new Map(),
    statusSummary: EMPTY_STATUS_SUMMARY,
    getService: () => null,
    getCapability: () => null,
    refresh: async () => undefined
  };
}

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

function summariseStatus(manifest) {
  const serviceCounts = { operational: 0, degraded: 0, outage: 0, disabled: 0, unknown: 0 };
  const capabilityCounts = { operational: 0, degraded: 0, outage: 0, disabled: 0, unknown: 0 };

  (manifest?.services ?? []).forEach((service) => {
    if (!service?.status) {
      serviceCounts.unknown += 1;
      return;
    }
    serviceCounts[service.status] = (serviceCounts[service.status] ?? 0) + 1;
  });

  (manifest?.capabilities ?? []).forEach((capability) => {
    if (!capability?.status) {
      capabilityCounts.unknown += 1;
      return;
    }
    capabilityCounts[capability.status] = (capabilityCounts[capability.status] ?? 0) + 1;
  });

  return { services: serviceCounts, capabilities: capabilityCounts };
}

function buildImpactMatrix(manifest) {
  const matrix = new Map();
  (manifest?.capabilities ?? []).forEach((capability) => {
    if (!capability) {
      return;
    }
    matrix.set(capability.capability, {
      status: capability.status ?? 'unknown',
      affectedServices: capability.dependencies ?? [],
      evaluation: capability.evaluation ?? null,
      lastChecked: capability.generatedAt ?? manifest?.generatedAt ?? null
    });
  });
  return matrix;
}

export function ServiceHealthProvider({ children, pollIntervalMs = DEFAULT_POLL_INTERVAL }) {
  const { session, isAuthenticated } = useAuth();
  const { subscribe } = useRealtime();
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
  const statusSummary = useMemo(() => summariseStatus(state.manifest), [state.manifest]);
  const impactMatrix = useMemo(() => buildImpactMatrix(state.manifest), [state.manifest]);

  const servicesByKey = useMemo(() => {
    const map = new Map();
    (state.manifest?.services ?? []).forEach((service) => {
      map.set(service.key, service);
    });
    return map;
  }, [state.manifest]);

  useEffect(() => {
    if (typeof subscribe !== 'function') {
      return undefined;
    }
    return subscribe('operations.service_health.updated', (message) => {
      const payload = message?.payload ?? message;
      if (!payload) {
        return;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        error: null,
        manifest: payload.manifest ?? payload,
        lastUpdated: payload.generatedAt ?? payload.manifest?.generatedAt ?? new Date().toISOString()
      }));
    });
  }, [subscribe]);

  const getService = useCallback(
    (serviceKey) => {
      if (!serviceKey) {
        return null;
      }
      return servicesByKey.get(serviceKey) ?? null;
    },
    [servicesByKey]
  );

  const getCapability = useCallback(
    (capabilityKey) => {
      if (!capabilityKey) {
        return null;
      }
      return impactMatrix.get(capabilityKey) ?? null;
    },
    [impactMatrix]
  );

  const value = useMemo(
    () => ({
      loading: state.loading,
      error: state.error,
      manifest: state.manifest,
      lastUpdated: state.manifest?.generatedAt ?? state.lastUpdated,
      alerts,
      servicesByKey,
      impactMatrix,
      statusSummary,
      getService,
      getCapability,
      refresh: fetchManifest
    }),
    [
      alerts,
      fetchManifest,
      getCapability,
      getService,
      impactMatrix,
      servicesByKey,
      state.error,
      state.lastUpdated,
      state.loading,
      state.manifest,
      statusSummary
    ]
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
    return createDefaultServiceHealth();
  }
  return context;
}
