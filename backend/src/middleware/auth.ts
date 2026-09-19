import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AdminJwtPayload {
  userId: string;
  email?: string;
  username?: string;
}

declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminJwtPayload;
    }
  }
}

export const requireAdminAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies?.[env.ADMIN_SESSION_COOKIE_NAME];

  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Admin authentication required. Please log in.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AdminJwtPayload;
    req.adminUser = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Your session has expired or is invalid. Please log in again.',
    });
  }
};
