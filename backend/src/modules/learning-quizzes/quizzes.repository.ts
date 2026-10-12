import { prisma } from '../../infrastructure/prisma';
import { QuizAdminInput } from './quizzes.types';
import { EnrollmentStatus } from '@prisma/client';

export class QuizzesRepository {
  async findQuizById(id: string) {
    return prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
        lesson: { select: { id: true, courseId: true } },
      },
    });
  }

  async findQuizAttempt(attemptId: string) {
    return prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: { options: { orderBy: { order: 'asc' } } },
            },
            lesson: { select: { id: true, courseId: true } },
          },
        },
      },
    });
  }

  async findStudentAttempts(quizId: string, studentId: string) {
    return prisma.quizAttempt.findMany({
      where: { quizId, studentId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async createQuizAttempt(data: { quizId: string; studentId: string; startedAt: Date }) {
    return prisma.quizAttempt.create({
      data: {
        quizId: data.quizId,
        studentId: data.studentId,
        startedAt: data.startedAt,
        answers: [],
      },
    });
  }

  async updateQuizAttempt(attemptId: string, data: { submittedAt: Date; score: number; maxScore: number; answers: any }) {
    return prisma.quizAttempt.update({
      where: { id: attemptId },
      data,
    });
  }

  async markLessonAndCourseComplete(studentId: string, lessonId: string, courseId: string) {
    await prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      create: {
        studentId,
        lessonId,
        courseId,
        completed: true,
        completedAt: new Date(),
      },
      update: {
        completed: true,
        completedAt: new Date(),
      },
    });

    const [total, completed] = await Promise.all([
      prisma.lesson.count({ where: { courseId } }),
      prisma.lessonProgress.count({ where: { studentId, courseId, completed: true } }),
    ]);

    if (total > 0 && completed >= total) {
      await prisma.enrollment.update({
        where: { studentId_courseId: { studentId, courseId } },
        data: { status: EnrollmentStatus.COMPLETED, completedAt: new Date() },
      });
    }
  }

  async createQuiz(courseId: string, input: QuizAdminInput) {
    return prisma.quiz.create({
      data: {
        courseId,
        lessonId: input.lessonId,
        opensAt: input.opensAt,
        dueAt: input.dueAt,
        maxAttempts: input.maxAttempts,
        timeLimitMin: input.timeLimitMin,
        passPercent: input.passPercent,
        showAnswers: input.showAnswers,
        questions: {
          create: input.questions.map((q) => ({
            order: q.order,
            type: q.type,
            text: q.text,
            explanation: q.explanation,
            points: q.points || 1,
            options: {
              create: q.options.map((o) => ({
                order: o.order,
                text: o.text,
                isCorrect: o.isCorrect,
              })),
            },
          })),
        },
      },
      include: {
        questions: { include: { options: true } },
      },
    });
  }

  async updateQuiz(quizId: string, input: QuizAdminInput) {
    // Replace questions atomically
    await prisma.quizQuestion.deleteMany({ where: { quizId } });
    return prisma.quiz.update({
      where: { id: quizId },
      data: {
        opensAt: input.opensAt,
        dueAt: input.dueAt,
        maxAttempts: input.maxAttempts,
        timeLimitMin: input.timeLimitMin,
        passPercent: input.passPercent,
        showAnswers: input.showAnswers,
        questions: {
          create: input.questions.map((q) => ({
            order: q.order,
            type: q.type,
            text: q.text,
            explanation: q.explanation,
            points: q.points || 1,
            options: {
              create: q.options.map((o) => ({
                order: o.order,
                text: o.text,
                isCorrect: o.isCorrect,
              })),
            },
          })),
        },
      },
      include: {
        questions: { include: { options: true } },
      },
    });
  }
}

export const quizzesRepository = new QuizzesRepository();
