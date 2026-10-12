import { Request, Response } from 'express';
import { learningHomeService } from './learning-home.service';

export async function getLearningHome(req: Request, res: Response): Promise<void> {
  const studentId = req.student?.studentId || (req as any).studentId || '';
  const feed = await learningHomeService.getHomeFeed(studentId);
  res.json(feed);
}
