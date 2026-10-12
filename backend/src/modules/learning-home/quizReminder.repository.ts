import { prisma } from '../../infrastructure/prisma';
import { NotificationType } from '@prisma/client';

export class QuizReminderRepository {
  async findQuizzesDueBetween(start: Date, end: Date) {
    return prisma.quiz.findMany({
      where: {
        dueAt: { gte: start, lte: end },
        course: { status: 'PUBLISHED' },
      },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        lesson: { select: { id: true, title: true } },
      },
    });
  }

  async findEnrolledStudentsWithoutCompletion(courseId: string, quizId: string, lessonId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, status: 'ACTIVE' },
      select: { studentId: true },
    });
    if (enrollments.length === 0) return [];

    const studentIds = enrollments.map((e) => e.studentId);

    const completedAttempts = await prisma.quizAttempt.findMany({
      where: {
        quizId,
        studentId: { in: studentIds },
        submittedAt: { not: null },
      },
      select: { studentId: true },
    });
    const completedSet = new Set(completedAttempts.map((a) => a.studentId));

    const completedProgress = await prisma.lessonProgress.findMany({
      where: {
        lessonId,
        studentId: { in: studentIds },
        completed: true,
      },
      select: { studentId: true },
    });
    for (const p of completedProgress) {
      completedSet.add(p.studentId);
    }

    return studentIds.filter((id) => !completedSet.has(id));
  }

  async hasRecentReminder(studentId: string, actionUrl: string): Promise<boolean> {
    const existing = await prisma.notification.findFirst({
      where: {
        studentId,
        actionUrl,
        type: NotificationType.LEARNING,
      },
    });
    return Boolean(existing);
  }

  async createNotification(data: {
    studentId: string;
    title: string;
    message: string;
    actionUrl: string;
  }) {
    return prisma.notification.create({
      data: {
        studentId: data.studentId,
        type: NotificationType.LEARNING,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
      },
    });
  }
}

export const quizReminderRepository = new QuizReminderRepository();
