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
      req.user = { ...payload, id: payload.sub, role: userRole, sessionId: session.id };
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
