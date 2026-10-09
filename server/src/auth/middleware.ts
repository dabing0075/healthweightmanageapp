import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      phone?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ code: 401, msg: '未登录或登录已过期' });
  }
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.phone = payload.phone;
    next();
  } catch {
    return res.status(401).json({ code: 401, msg: '未登录或登录已过期' });
  }
}
