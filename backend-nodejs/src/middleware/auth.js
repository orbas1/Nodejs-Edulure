import { verifyAccessToken } from '../config/jwtKeyStore.js';
import { updateRequestContext } from '../observability/requestContext.js';

const rolePriority = {
  user: 1,
  instructor: 2,
  admin: 3
};

export default function auth(requiredRole) {
  return (req, res, next) => {
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
      req.user = { ...payload, id: payload.sub };
      updateRequestContext({ userId: payload.sub, userRole: payload.role });
      if (requiredRole) {
        const userPriority = rolePriority[payload.role] ?? 0;
        const requiredPriority = rolePriority[requiredRole];
        if (userPriority < requiredPriority) {
          return res.status(403).json({ success: false, message: 'Insufficient permissions' });
        }
      }
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  };
}
