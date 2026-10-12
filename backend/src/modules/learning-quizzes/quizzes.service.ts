import { quizzesRepository, QuizzesRepository } from './quizzes.repository';
import { NotFoundError, ForbiddenError, ConflictError } from '../../utils/appError';
import { QuizDetailResponse, QuizStartResponse, QuizSubmitPayload, QuizAttemptResult, QuizAdminInput } from './quizzes.types';
import { gradeQuizSubmission } from './quizzes.grader';

export class QuizzesService {
  constructor(private repo: QuizzesRepository = quizzesRepository) {}

  async getStudentQuiz(quizId: string, studentId: string): Promise<QuizDetailResponse> {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) throw new NotFoundError('Quiz not found');

    const attempts = await this.repo.findStudentAttempts(quizId, studentId);
    const submittedAttempts = attempts.filter((a) => a.submittedAt !== null);
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);

    const bestScore = submittedAttempts.length > 0 ? Math.max(...submittedAttempts.map((a) => a.score)) : null;
    const passed = bestScore !== null && totalPoints > 0 ? (bestScore / totalPoints) * 100 >= quiz.passPercent : false;

    const questions = quiz.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      text: q.text,
      points: q.points,
      options: q.options.map((o) => ({ id: o.id, order: o.order, text: o.text })),
    }));

    return {
      id: quiz.id,
      courseId: quiz.courseId,
      lessonId: quiz.lessonId,
      opensAt: quiz.opensAt ? quiz.opensAt.toISOString() : null,
      dueAt: quiz.dueAt ? quiz.dueAt.toISOString() : null,
      maxAttempts: quiz.maxAttempts,
      timeLimitMin: quiz.timeLimitMin,
      passPercent: quiz.passPercent,
      showAnswers: quiz.showAnswers,
      totalPoints,
      attemptsUsed: submittedAttempts.length,
      bestScore,
      passed,
      questions,
    };
  }

  async startQuizAttempt(quizId: string, studentId: string): Promise<QuizStartResponse> {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) throw new NotFoundError('Quiz not found');

    const now = new Date();
    if (quiz.opensAt && now < quiz.opensAt) throw new ForbiddenError('Quiz has not opened yet');
    if (quiz.dueAt && now > quiz.dueAt) throw new ForbiddenError('Quiz deadline has passed');

    const attempts = await this.repo.findStudentAttempts(quizId, studentId);
    const submittedCount = attempts.filter((a) => a.submittedAt !== null).length;
    if (submittedCount >= quiz.maxAttempts) throw new ForbiddenError('Maximum quiz attempts exceeded');

    const attempt = await this.repo.createQuizAttempt({ quizId, studentId, startedAt: now });
    return {
      attemptId: attempt.id,
      startedAt: attempt.startedAt.toISOString(),
      timeLimitMin: quiz.timeLimitMin,
      serverTime: now.toISOString(),
    };
  }

  async submitQuizAttempt(quizId: string, studentId: string, payload: QuizSubmitPayload): Promise<QuizAttemptResult> {
    const attempt = await this.repo.findQuizAttempt(payload.attemptId);
    if (!attempt || attempt.quizId !== quizId || attempt.studentId !== studentId) {
      throw new NotFoundError('Quiz attempt not found');
    }
    if (attempt.submittedAt !== null) {
      throw new ConflictError('Attempt has already been submitted');
    }

    const quiz = attempt.quiz;
    const now = new Date();

    if (quiz.dueAt && now > quiz.dueAt) {
      throw new ForbiddenError('Quiz deadline has passed');
    }
    if (quiz.timeLimitMin && quiz.timeLimitMin > 0) {
      const elapsedSec = (now.getTime() - attempt.startedAt.getTime()) / 1000;
      if (elapsedSec > quiz.timeLimitMin * 60 + 30) {
        throw new ForbiddenError('Time limit exceeded');
      }
    }

    const { score, maxScore, review } = gradeQuizSubmission(quiz.questions, payload.answers);
    const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = scorePercent >= quiz.passPercent;

    await this.repo.updateQuizAttempt(attempt.id, {
      submittedAt: now,
      score,
      maxScore,
      answers: payload.answers,
    });

    await this.repo.markLessonAndCourseComplete(studentId, quiz.lessonId, quiz.lesson.courseId);

    let answersReview: any[] | undefined = undefined;
    if (quiz.showAnswers === 'AFTER_SUBMIT') {
      answersReview = review;
    } else if (quiz.showAnswers === 'AFTER_DEADLINE' && quiz.dueAt && now > quiz.dueAt) {
      answersReview = review;
    }

    return {
      attemptId: attempt.id,
      score,
      maxScore,
      scorePercent,
      passed,
      submittedAt: now.toISOString(),
      answersReview,
    };
  }

  async getStudentAttempts(quizId: string, studentId: string) {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) throw new NotFoundError('Quiz not found');

    const attempts = await this.repo.findStudentAttempts(quizId, studentId);
    return {
      attempts: attempts.map((a) => ({
        id: a.id,
        startedAt: a.startedAt.toISOString(),
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
        score: a.score,
        maxScore: a.maxScore,
        passed: a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) >= quiz.passPercent : false,
      })),
    };
  }

  async createAdminQuiz(courseId: string, input: QuizAdminInput) {
    return this.repo.createQuiz(courseId, input);
  }

  async getAdminQuiz(quizId: string) {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) throw new NotFoundError('Quiz not found');
    return quiz;
  }

  async updateAdminQuiz(quizId: string, input: QuizAdminInput) {
    await this.getAdminQuiz(quizId);
    return this.repo.updateQuiz(quizId, input);
  }
}

export const quizzesService = new QuizzesService();
