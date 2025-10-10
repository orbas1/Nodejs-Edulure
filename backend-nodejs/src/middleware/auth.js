import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { ACCESS_TOKEN_AUDIENCE } from '../services/AuthService.js';

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
      const payload = jwt.verify(token, env.security.jwtSecret, {
        audience: ACCESS_TOKEN_AUDIENCE,
        issuer: 'edulure-platform'
      });
      req.user = { ...payload, id: payload.sub };
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
