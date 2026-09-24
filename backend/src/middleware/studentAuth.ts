import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface StudentJwtPayload {
  studentId: string;
  rollNo: string;
  name: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      student?: StudentJwtPayload;
    }
  }
}

export const requireStudentAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Student authentication required. Please log in.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.STUDENT_JWT_SECRET) as StudentJwtPayload;
    req.student = decoded;
    (req as any).studentId = decoded.studentId;
    next();
  } catch {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Your session has expired or is invalid. Please log in again.',
    });
  }
};