import jwt from 'jsonwebtoken';

export default function auth(requiredRole) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ message: 'Authorization header missing' });
    }

    const [, token] = header.split(' ');
    if (!token) {
      return res.status(401).json({ message: 'Token missing' });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      if (requiredRole && payload.role !== requiredRole) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}
