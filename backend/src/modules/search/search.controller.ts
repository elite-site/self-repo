import { Request, Response } from 'express';
import { UnauthorizedError } from '../../utils/appError';
import { searchService } from './search.service';
import { parseSearchQuery } from './search.schemas';

export async function search(req: Request, res: Response): Promise<void> {
  if (!req.student?.studentId) {
    throw new UnauthorizedError('Student authentication required.');
  }
  const parsed = parseSearchQuery(req.query);
  const result = await searchService.search(req.student.studentId, parsed);
  // Personal items are included in results, so prevent shared proxy caching (API-7).
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(result);
}
