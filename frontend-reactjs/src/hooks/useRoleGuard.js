import { useMemo } from 'react';

import { useAuth } from '../context/AuthContext.jsx';
import { useDashboard } from '../context/DashboardContext.jsx';

const hasListFormat = typeof Intl !== 'undefined' && typeof Intl.ListFormat === 'function';
const listFormatter = hasListFormat ? new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }) : null;

function normaliseRoleIdentifier(role) {
  if (role == null) {
    return null;
  }
  const trimmed = String(role).trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.toLowerCase();
}

function formatRoleLabel(role) {
  const readable = role
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return readable.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function joinRoleLabels(roles) {
  const labels = roles.map(formatRoleLabel);
  if (!labels.length) {
    return '';
  }
  if (listFormatter) {
    return listFormatter.format(labels);
  }
  if (labels.length === 1) {
    return labels[0];
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

function buildRoleSet(session, dashboardRoles) {
  const set = new Set();
  const user = session?.user;

  if (user) {
    [user.role, user.primaryRole, user.communityRole].forEach((role) => {
      const normalised = normaliseRoleIdentifier(role);
      if (normalised) {
        set.add(normalised);
      }
    });

    if (Array.isArray(user.roles)) {
      user.roles.forEach((role) => {
        const identifier = role?.id ?? role?.code ?? role?.name ?? role;
        const normalised = normaliseRoleIdentifier(identifier);
        if (normalised) {
          set.add(normalised);
        }
      });
    }

    if (Array.isArray(user.permissions)) {
      user.permissions.forEach((permission) => {
        const normalised = normaliseRoleIdentifier(permission);
        if (normalised) {
          set.add(normalised);
        }
      });
    }

    if (user.permissions && typeof user.permissions === 'object' && !Array.isArray(user.permissions)) {
      Object.entries(user.permissions).forEach(([key, value]) => {
        const normalisedKey = normaliseRoleIdentifier(key);
        if (normalisedKey) {
          set.add(normalisedKey);
        }
        if (Array.isArray(value)) {
          value.forEach((entry) => {
            const normalised = normaliseRoleIdentifier(entry);
            if (normalised) {
              set.add(normalised);
            }
          });
        }
      });
    }
  }

  if (Array.isArray(dashboardRoles)) {
    dashboardRoles.forEach((role) => {
      const identifier = role?.id ?? role?.code ?? role?.name ?? role;
      const normalised = normaliseRoleIdentifier(identifier);
      if (normalised) {
        set.add(normalised);
      }
    });
  }

  if (set.size === 0) {
    set.add('non-member');
  }

  return set;
}

export default function useRoleGuard(requiredRoles = []) {
  const { isAuthenticated, session } = useAuth();
  const { roles: dashboardRoles } = useDashboard();

  return useMemo(() => {
    const aggregatedRoles = buildRoleSet(session, dashboardRoles);

    if (!requiredRoles?.length) {
      return { allowed: true, explanation: null, roles: aggregatedRoles, missingRoles: [] };
    }

    const normalisedRequired = requiredRoles
      .map(normaliseRoleIdentifier)
      .filter((role) => Boolean(role));

    if (normalisedRequired.length === 0) {
      return { allowed: true, explanation: null, roles: aggregatedRoles, missingRoles: [] };
    }

    const missingRoles = normalisedRequired.filter((role) => !aggregatedRoles.has(role));

    if (missingRoles.length === 0) {
      return { allowed: true, explanation: null, roles: aggregatedRoles, missingRoles: [] };
    }

    const label = joinRoleLabels(missingRoles);
    const explanation = !isAuthenticated
      ? 'Sign in to access this workspace. Your session is required to confirm permissions.'
      : `Your account is missing the required ${label} permission${missingRoles.length > 1 ? 's' : ''}. Contact an administrator to request access.`;

    return { allowed: false, explanation, roles: aggregatedRoles, missingRoles };
  }, [dashboardRoles, isAuthenticated, requiredRoles, session]);
}

export { normaliseRoleIdentifier };
