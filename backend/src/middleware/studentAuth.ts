import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError, UnauthorizedError } from '../utils/appError';

export interface StudentJwtPayload {
  studentId: string;
  rollNo: string;
  name: string;
  email?: string;
}

export const STUDENT_SESSION_COOKIE_NAME = 'pc_student_session';

declare global {
  namespace Express {
    interface Request {
      student?: StudentJwtPayload;
    }
  }
}

export const requireStudentAuth = (req: Request, _res: Response, next: NextFunction): void => {
  let token = req.cookies?.[STUDENT_SESSION_COOKIE_NAME] || null;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1].trim();
  }

  if (!token && typeof req.query?.token === 'string') {
    token = req.query.token.trim();
  }

  if (!token) {
    next(new UnauthorizedError('Student authentication required. Please log in.'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.STUDENT_JWT_SECRET) as StudentJwtPayload;
    req.student = decoded;
    (req as any).studentId = decoded.studentId;
    next();
  } catch {
    next(new AppError('INVALID_TOKEN', 'Your session has expired or is invalid. Please log in again.', 401));
  }
};
