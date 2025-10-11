import { verifyAccessToken } from '../config/jwtKeyStore.js';
import { updateRequestContext } from '../observability/requestContext.js';
import { sessionRegistry } from '../services/SessionRegistry.js';

const rolePriority = {
  user: 1,
  instructor: 2,
  admin: 3
};

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
      req.user = { ...payload, id: payload.sub, sessionId: session.id };
      updateRequestContext({ userId: payload.sub, userRole: payload.role, sessionId: session.id });
      if (requiredRole) {
        const userPriority = rolePriority[payload.role] ?? 0;
        const requiredPriority = rolePriority[requiredRole];
        if (userPriority < requiredPriority) {
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
