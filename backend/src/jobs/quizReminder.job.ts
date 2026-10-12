import cron from 'node-cron';
import { env } from '../config/env';
import { quizReminderRepository, QuizReminderRepository } from '../modules/learning-home/quizReminder.repository';
import { logger } from '../utils/logger';

let isRunning = false;
let started = false;

export async function processQuizReminders(
  repo: QuizReminderRepository = quizReminderRepository
): Promise<{ count: number }> {
  if (!env.FEATURE_LEARNINGHUB) {
    return { count: 0 };
  }

  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dueQuizzes = await repo.findQuizzesDueBetween(now, in24Hours);
  let totalNotifications = 0;

  for (const quiz of dueQuizzes) {
    const uncompletedStudentIds = await repo.findEnrolledStudentsWithoutCompletion(
      quiz.courseId,
      quiz.id,
      quiz.lessonId
    );

    const actionUrl = `/learning/lessons/${quiz.lessonId}`;
    const formattedDue = quiz.dueAt ? quiz.dueAt.toISOString() : 'soon';

    for (const studentId of uncompletedStudentIds) {
      const alreadySent = await repo.hasRecentReminder(studentId, actionUrl);
      if (alreadySent) continue;

      await repo.createNotification({
        studentId,
        title: `Quiz Due Soon: ${quiz.lesson.title}`,
        message: `Your quiz for "${quiz.lesson.title}" in course "${quiz.course.title}" is due on ${formattedDue}. Don't forget to complete it!`,
        actionUrl,
      });
      totalNotifications++;
    }
  }

  return { count: totalNotifications };
}

async function tick(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    const result = await processQuizReminders();
    if (result.count > 0) {
      logger.info(`[QuizReminder] Dispatched ${result.count} quiz reminder notifications`);
    }
  } catch (err) {
    logger.error('[QuizReminder] Error running quiz reminder tick', { err });
  } finally {
    isRunning = false;
  }
}

export function startQuizReminderScheduler(): void {
  if (process.env.NODE_ENV === 'test') return;
  if (!env.FEATURE_LEARNINGHUB) return;
  if (started) return;
  started = true;

  // Run every hour
  cron.schedule('0 * * * *', () => {
    void tick();
  });
}
