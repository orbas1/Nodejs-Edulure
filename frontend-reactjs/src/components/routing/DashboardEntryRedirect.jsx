import { useCallback, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import DashboardStateMessage from '../dashboard/DashboardStateMessage.jsx';
import { useDashboard } from '../../context/DashboardContext.jsx';

const ACTIVE_ROLE_STATUSES = new Set(['active', 'approved', 'enabled', 'granted', 'current']);
const PENDING_ROLE_STATUSES = new Set([
  'pending',
  'awaiting-approval',
  'requested',
  'invited',
  'processing',
  'queued',
  'pending-verification',
  'verification-required'
]);
const SUSPENDED_ROLE_STATUSES = new Set([
  'suspended',
  'revoked',
  'denied',
  'blocked',
  'disabled',
  'inactive'
]);
const EXPIRED_ROLE_STATUSES = new Set(['expired', 'deprovisioned', 'ended']);

function toLowerSet(values = []) {
  return new Set(values.map((value) => String(value).toLowerCase()));
}

function extractExpiresAt(role) {
  const candidate =
    role?.expiresAt ??
    role?.expirationDate ??
    role?.expiry ??
    role?.access?.expiresAt ??
    role?.metadata?.expiresAt ??
    null;

  if (!candidate) return null;

  const date = candidate instanceof Date ? candidate : new Date(candidate);
  const timestamp = Number.isFinite(date.getTime()) ? date.getTime() : null;
  return timestamp ?? null;
}

function normaliseRole(role, index) {
  if (!role) {
    return null;
  }

  if (typeof role === 'string') {
    const identifier = role.trim();
    if (!identifier) return null;
    return {
      id: identifier,
      label: identifier,
      status: null,
      derivedState: 'active',
      requiresVerification: false,
      requiresMfa: false,
      reason: null,
      expiresAt: null
    };
  }

  const identifier =
    role.id ??
    role.code ??
    role.slug ??
    role.roleId ??
    role.key ??
    role.name ??
    `role-${index}`;
  const label =
    role.name ??
    role.label ??
    role.title ??
    role.displayName ??
    role.type ??
    String(identifier);

  const rawStatus =
    role.status ??
    role.state ??
    role.accessState ??
    role.access?.status ??
    role.metadata?.status ??
    null;
  const status = rawStatus ? String(rawStatus).toLowerCase() : null;

  const flags = toLowerSet([
    ...(Array.isArray(role.flags) ? role.flags : []),
    ...(Array.isArray(role.requirements) ? role.requirements : []),
    role.requirement,
    role.compliance?.requirement,
    role.compliance?.status
  ].filter(Boolean));

  const requiresVerification =
    role.requiresVerification === true ||
    role.requireIdentityVerification === true ||
    role.identityVerificationRequired === true ||
    flags.has('verification-required') ||
    flags.has('identity-check') ||
    (typeof role.verificationStatus === 'string' && role.verificationStatus.toLowerCase() !== 'verified') ||
    status === 'pending-verification' ||
    status === 'verification-required';

  const requiresMfa =
    role.requiresMfa === true ||
    role.requiresTwoFactor === true ||
    role.requireTwoFactor === true ||
    role.mfaRequired === true ||
    role.enforceMfa === true ||
    flags.has('mfa-required') ||
    flags.has('2fa-required') ||
    status === 'mfa-required';

  const isDisabled =
    role.disabled === true ||
    role.isDisabled === true ||
    role.active === false ||
    role.enabled === false ||
    role.access?.disabled === true;

  const reason =
    role.reason ??
    role.denialReason ??
    role.suspensionReason ??
    role.rejectionReason ??
    role.metadata?.reason ??
    null;

  const expiresAt = extractExpiresAt(role);
  const isExpired = typeof expiresAt === 'number' ? expiresAt < Date.now() : false;

  let derivedState = 'unknown';
  if (isExpired || EXPIRED_ROLE_STATUSES.has(status)) {
    derivedState = 'expired';
  } else if (SUSPENDED_ROLE_STATUSES.has(status) || isDisabled) {
    derivedState = 'suspended';
  } else if (PENDING_ROLE_STATUSES.has(status) || requiresVerification || requiresMfa) {
    derivedState = 'pending';
  } else if (ACTIVE_ROLE_STATUSES.has(status) || !status) {
    derivedState = 'active';
  }

  return {
    id: String(identifier),
    label: String(label),
    status,
    derivedState,
    requiresVerification,
    requiresMfa,
    reason: reason ? String(reason) : null,
    expiresAt
  };
}

function formatRoleLabel(role) {
  return role?.label ?? 'your dashboard';
}

function formatExpiry(role) {
  if (!role?.expiresAt) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(role.expiresAt);
  } catch (error) {
    return null;
  }
}

export default function DashboardEntryRedirect() {
  const { activeRole, roles, loading, error, refresh } = useDashboard();
  const navigate = useNavigate();

  const normalisedRoles = useMemo(
    () =>
      (Array.isArray(roles) ? roles : [])
        .map((role, index) => normaliseRole(role, index))
        .filter(Boolean),
    [roles]
  );

  const resolvedRole = useMemo(() => {
    if (normalisedRoles.length === 0) {
      return null;
    }

    const explicitActive = normalisedRoles.find((role) => role.id === activeRole && role.derivedState === 'active');
    if (explicitActive) {
      return explicitActive.id;
    }

    const firstActive = normalisedRoles.find((role) => role.derivedState === 'active');
    if (firstActive) {
      return firstActive.id;
    }

    return null;
  }, [activeRole, normalisedRoles]);

  const hasResolvedRole = Boolean(resolvedRole);

  const verificationRole = useMemo(
    () => normalisedRoles.find((role) => role.requiresVerification),
    [normalisedRoles]
  );
  const mfaRole = useMemo(() => normalisedRoles.find((role) => role.requiresMfa), [normalisedRoles]);
  const pendingRole = useMemo(
    () => normalisedRoles.find((role) => role.derivedState === 'pending' && !role.requiresVerification && !role.requiresMfa),
    [normalisedRoles]
  );
  const suspendedRole = useMemo(
    () => normalisedRoles.find((role) => role.derivedState === 'suspended'),
    [normalisedRoles]
  );
  const expiredRole = useMemo(
    () => normalisedRoles.find((role) => role.derivedState === 'expired'),
    [normalisedRoles]
  );

  const handleRetry = useCallback(() => {
    if (typeof refresh === 'function') {
      refresh();
    }
  }, [refresh]);

  const handleBrowseCommunity = useCallback(() => {
    navigate('/feed', { replace: true });
  }, [navigate]);

  const handleVerifyIdentity = useCallback(() => {
    navigate('/settings/security/verification');
  }, [navigate]);

  const handleSecureAccount = useCallback(() => {
    navigate('/settings/security/mfa');
  }, [navigate]);

  const handleContactSupport = useCallback(() => {
    if (typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open('mailto:support@edulure.com', '_blank', 'noopener');
    }
  }, []);

  if (loading && !hasResolvedRole && normalisedRoles.length === 0) {
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

  if (verificationRole) {
    const roleLabel = formatRoleLabel(verificationRole);
    return (
      <DashboardStateMessage
        title="Verify your identity"
        description={`We need to verify your identity before granting access to the ${roleLabel} workspace.`}
        actionLabel="Start verification"
        onAction={handleVerifyIdentity}
      />
    );
  }

  if (mfaRole) {
    const roleLabel = formatRoleLabel(mfaRole);
    return (
      <DashboardStateMessage
        title="Secure your account"
        description={`Enable multi-factor authentication to unlock the ${roleLabel} dashboard.`}
        actionLabel="Secure account"
        onAction={handleSecureAccount}
      />
    );
  }

  if (pendingRole) {
    const roleLabel = formatRoleLabel(pendingRole);
    return (
      <DashboardStateMessage
        title="Access awaiting approval"
        description={`Your ${roleLabel} dashboard access is pending approval. We'll notify you once it's ready.`}
        actionLabel="Check again"
        onAction={handleRetry}
      />
    );
  }

  if (suspendedRole) {
    const roleLabel = formatRoleLabel(suspendedRole);
    const reason = suspendedRole.reason
      ? suspendedRole.reason
      : `Your ${roleLabel} dashboard access is temporarily paused. Reach out so we can help reinstate it.`;
    return (
      <DashboardStateMessage
        variant="error"
        title="Dashboard access paused"
        description={reason}
        actionLabel="Contact support"
        onAction={handleContactSupport}
      />
    );
  }

  if (expiredRole) {
    const roleLabel = formatRoleLabel(expiredRole);
    const formattedExpiry = formatExpiry(expiredRole);
    const description = formattedExpiry
      ? `Access to the ${roleLabel} dashboard expired on ${formattedExpiry}. Request a renewal to continue.`
      : `Access to the ${roleLabel} dashboard has expired. Request a renewal to continue.`;
    return (
      <DashboardStateMessage
        title="Dashboard access expired"
        description={description}
        actionLabel="Request renewal"
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
