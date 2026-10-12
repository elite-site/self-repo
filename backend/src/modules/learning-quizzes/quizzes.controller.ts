import { Request, Response } from 'express';
import { quizzesService } from './quizzes.service';
import { parseQuizSubmitPayload, parseQuizAdminInput } from './quizzes.schemas';

export async function getStudentQuiz(req: Request, res: Response) {
  const result = await quizzesService.getStudentQuiz(req.params.quizId, req.student!.studentId);
  res.json(result);
}

export async function startQuizAttempt(req: Request, res: Response) {
  const result = await quizzesService.startQuizAttempt(req.params.quizId, req.student!.studentId);
  res.status(201).json(result);
}

export async function submitQuizAttempt(req: Request, res: Response) {
  const payload = parseQuizSubmitPayload(req.body);
  const result = await quizzesService.submitQuizAttempt(req.params.quizId, req.student!.studentId, payload);
  res.json(result);
}

export async function getStudentAttempts(req: Request, res: Response) {
  const result = await quizzesService.getStudentAttempts(req.params.quizId, req.student!.studentId);
  res.json(result);
}

export async function createAdminQuiz(req: Request, res: Response) {
  const input = parseQuizAdminInput(req.body);
  const result = await quizzesService.createAdminQuiz(req.params.id, input);
  res.status(201).json(result);
}

export async function getAdminQuiz(req: Request, res: Response) {
  const result = await quizzesService.getAdminQuiz(req.params.quizId);
  res.json(result);
}

export async function updateAdminQuiz(req: Request, res: Response) {
  const input = parseQuizAdminInput(req.body);
  const result = await quizzesService.updateAdminQuiz(req.params.quizId, input);
  res.json(result);
}
