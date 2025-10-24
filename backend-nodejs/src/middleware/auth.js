import { verifyAccessToken } from '../config/jwtKeyStore.js';
import { updateRequestContext } from '../observability/requestContext.js';
import { sessionRegistry } from '../services/SessionRegistry.js';

const rolePriority = {
  user: 1,
  instructor: 2,
  staff: 2,
  admin: 3,
  service: 4
};

const defaultPermissionsByRole = {
  user: ['feed:read', 'creation:read'],
  instructor: ['feed:read', 'creation:read', 'creation:write'],
  staff: ['feed:read', 'creation:read', 'creation:write', 'governance:review'],
  admin: ['*'],
  service: ['*']
};

function resolveRequiredRoles(input) {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input.map((role) => String(role).toLowerCase()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return [input.toLowerCase()];
  }
  return [];
}

function getRolePriority(role) {
  if (!role) {
    return 0;
  }
  const normalised = String(role).toLowerCase();
  return rolePriority[normalised] ?? 0;
}

function normalisePermissions(permissions) {
  if (!permissions) {
    return [];
  }

  const unique = new Set();
  const sources = Array.isArray(permissions) ? permissions : String(permissions).split(/[\s,]+/);
  for (const permission of sources) {
    if (typeof permission !== 'string') {
      continue;
    }
    const trimmed = permission.trim();
    if (trimmed) {
      unique.add(trimmed);
    }
  }

  return Array.from(unique);
}

function resolvePermissions({ payload, role }) {
  const defaults = defaultPermissionsByRole[role] ?? [];
  const claimPermissions = normalisePermissions(payload?.permissions ?? payload?.perms);
  const scopePermissions = normalisePermissions(payload?.scope);

  const unique = new Set();
  for (const permission of [...defaults, ...claimPermissions, ...scopePermissions]) {
    unique.add(permission);
  }

  return Array.from(unique);
}

export default function auth(requiredRole) {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ success: false, message: 'Authorization header missing' });
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ success: false, message: 'Authorization header malformed' });
    }

    try {
      const payload = verifyAccessToken(token);
      if (!payload.sid) {
        return res.status(401).json({ success: false, message: 'Session identifier missing from token' });
      }

      const session = await sessionRegistry.ensureActive(payload.sid);
      const userRole = payload.role ?? payload.roles?.[0] ?? null;
      const permissions = resolvePermissions({ payload, role: userRole });
      const actor = {
        id: payload.sub,
        role: userRole,
        sessionId: session.id,
        tenantId: payload.tenantId ?? payload.tid ?? null,
        permissions
      };

      req.session = session;
      req.user = { ...payload, id: payload.sub, role: userRole, sessionId: session.id };
      req.actor = actor;
      req.permissions = permissions;
      updateRequestContext({ userId: payload.sub, userRole, sessionId: session.id });

      const requiredRoles = resolveRequiredRoles(requiredRole);
      if (requiredRoles.length > 0) {
        const userPriority = getRolePriority(userRole);
        const authorised = requiredRoles.some((role) => userPriority >= getRolePriority(role));
        if (!authorised) {
          return res.status(403).json({ success: false, message: 'Insufficient permissions' });
        }
      }
      return next();
    } catch (error) {
      const status = error.status ?? 401;
      const message =
        error.code === 'SESSION_REVOKED'
          ? 'Session has been revoked. Please sign in again.'
          : 'Invalid or expired token';
      return res.status(status).json({ success: false, message });
    }
  };
}
