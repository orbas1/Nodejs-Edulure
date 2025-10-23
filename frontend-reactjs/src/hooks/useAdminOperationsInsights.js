import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import auditLogApi from '../api/auditLogApi.js';

function normaliseTimeline(rawEvents) {
  return Array.isArray(rawEvents)
    ? rawEvents.map((event, index) => ({
        id: event.id ?? `${event.source ?? 'event'}-${index}`,
        occurredAt: event.occurredAt ? new Date(event.occurredAt).toISOString() : null,
        source: event.source ?? 'unknown',
        severity: event.severity ?? 'info',
        title: event.title ?? 'Activity',
        summary: event.summary ?? null,
        entity: event.entity ?? null,
        metadata: event.metadata ?? {},
        actor: event.actor ?? null
      }))
    : [];
}

function buildQuickLinks({ contracts = [], featureFlags, release }) {
  const links = [];

  if (contracts.length) {
    for (const contract of contracts.slice(0, 3)) {
      links.push({
        id: `contract-${contract.publicId ?? contract.id}`,
        label: contract.vendorName ?? 'Governance contract',
        description: contract.contractType ? `${contract.contractType} · ${contract.riskTier ?? 'tier n/a'}` : null,
        href: contract.metadata?.runbookUrl ?? contract.metadata?.docUrl ?? '#',
        tone: contract.riskTier === 'high' || contract.riskTier === 'critical' ? 'warning' : 'neutral',
        badge: contract.nextGovernanceCheckAt
          ? new Date(contract.nextGovernanceCheckAt).toLocaleDateString()
          : null
      });
    }
  }

  if (release?.readiness?.nextGate) {
    links.push({
      id: 'release-next-gate',
      label: release.readiness.nextGate.title ?? 'Next release gate',
      description: 'Track release checklist progress and assign owners.',
      href: '/dashboard/admin/release-readiness',
      tone: release.readiness.score >= 80 ? 'success' : 'warning',
      badge: `${release.readiness.score}%`
    });
  }

  if (featureFlags?.flags?.length) {
    const flagged = featureFlags.flags.filter((flag) => flag.overridden);
    if (flagged.length) {
      links.push({
        id: 'feature-flag-overrides',
        label: `${flagged.length} flag override${flagged.length > 1 ? 's' : ''}`,
        description: 'Review tenant overrides and ensure experiment context is documented.',
        href: '/dashboard/admin/feature-flags',
        tone: 'info'
      });
    }
  }

  return links;
}

export default function useAdminOperationsInsights({ token, limit = 40, tenantId } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    if (!token) {
      setData(null);
      setError(new Error('Missing authentication token'));
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const payload = await auditLogApi.fetchUnifiedAuditLog({
        token,
        limit,
        tenantId,
        signal: controller.signal
      });
      setData(payload);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [token, limit, tenantId]);

  useEffect(() => {
    load();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [load]);

  const insights = useMemo(() => {
    if (!data) {
      return {
        timeline: [],
        analytics: null,
        quickLinks: [],
        featureFlags: null,
        release: null,
        compliance: { contracts: [] }
      };
    }

    const timeline = normaliseTimeline(data.timeline);
    const quickLinks = buildQuickLinks({
      contracts: data.compliance?.contracts ?? [],
      featureFlags: data.featureFlags,
      release: data.release
    });

    return {
      timeline,
      analytics: data.analytics ?? null,
      quickLinks,
      featureFlags: data.featureFlags ?? null,
      release: data.release ?? null,
      compliance: {
        contracts: data.compliance?.contracts ?? []
      }
    };
  }, [data]);

  return {
    insights,
    loading,
    error,
    refresh: load
  };
}

