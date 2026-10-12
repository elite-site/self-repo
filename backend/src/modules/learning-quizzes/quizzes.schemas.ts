import { ValidationError } from '../../utils/appError';
import { QuizQuestionType, QuizShowAnswers } from '@prisma/client';
import { QuizSubmitPayload, QuizAdminInput } from './quizzes.types';

export function parseQuizSubmitPayload(body: any): QuizSubmitPayload {
  if (!body || typeof body !== 'object') throw new ValidationError('Request body must be an object');
  if (!body.attemptId || typeof body.attemptId !== 'string') {
    throw new ValidationError('attemptId is required', [{ field: 'attemptId', message: 'attemptId is required' }]);
  }
  if (!Array.isArray(body.answers)) {
    throw new ValidationError('answers must be an array', [{ field: 'answers', message: 'answers array required' }]);
  }

  const answers = body.answers.map((a: any) => ({
    questionId: String(a.questionId),
    selectedOptionIds: Array.isArray(a.selectedOptionIds) ? a.selectedOptionIds.map(String) : [],
  }));

  return { attemptId: body.attemptId, answers };
}

export function parseQuizAdminInput(body: any): QuizAdminInput {
  if (!body || typeof body !== 'object') throw new ValidationError('Request body must be an object');
  if (!body.lessonId || typeof body.lessonId !== 'string') {
    throw new ValidationError('lessonId is required', [{ field: 'lessonId', message: 'lessonId is required' }]);
  }
  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    throw new ValidationError('At least one question is required', [{ field: 'questions', message: 'Questions required' }]);
  }

  const questions = body.questions.map((q: any, qIdx: number) => {
    if (!q.text || typeof q.text !== 'string') {
      throw new ValidationError(`Question ${qIdx + 1} text is required`);
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      throw new ValidationError(`Question ${qIdx + 1} must have at least 2 options`);
    }
    return {
      order: q.order !== undefined ? Number(q.order) : qIdx,
      type: (q.type as QuizQuestionType) || QuizQuestionType.SINGLE,
      text: String(q.text).trim(),
      explanation: q.explanation ? String(q.explanation).trim() : null,
      points: q.points !== undefined ? Math.max(1, Number(q.points)) : 1,
      options: q.options.map((o: any, oIdx: number) => ({
        order: o.order !== undefined ? Number(o.order) : oIdx,
        text: String(o.text).trim(),
        isCorrect: Boolean(o.isCorrect),
      })),
    };
  });

  return {
    lessonId: body.lessonId,
    opensAt: body.opensAt ? new Date(body.opensAt) : null,
    dueAt: body.dueAt ? new Date(body.dueAt) : null,
    maxAttempts: body.maxAttempts !== undefined ? Math.max(1, Number(body.maxAttempts)) : 1,
    timeLimitMin: body.timeLimitMin !== undefined && body.timeLimitMin !== null ? Number(body.timeLimitMin) : null,
    passPercent: body.passPercent !== undefined ? Math.min(100, Math.max(0, Number(body.passPercent))) : 50,
    showAnswers: (body.showAnswers as QuizShowAnswers) || QuizShowAnswers.AFTER_SUBMIT,
    questions,
  };
}
