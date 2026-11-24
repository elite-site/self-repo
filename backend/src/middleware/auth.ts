import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError, UnauthorizedError } from '../utils/appError';

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

export const requireAdminAuth = (req: Request, _res: Response, next: NextFunction): void => {
  let token = req.cookies?.[env.ADMIN_SESSION_COOKIE_NAME];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1].trim();
  }

  if (!token) {
    next(new UnauthorizedError('Admin authentication required. Please log in.'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AdminJwtPayload;
    req.adminUser = decoded;
    next();
  } catch {
    next(new AppError('INVALID_TOKEN', 'Your session has expired or is invalid. Please log in again.', 401));
  }
};
