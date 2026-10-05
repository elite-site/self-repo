import { prisma } from '../lib/prisma';

/** The student-portal route that owns a video change request. */
export const INTRO_VIDEO_ACTION_URL = '/intro-video';

export interface VideoNotificationInput {
  studentId: string;
  title: string;
  message: string;
  /** Defaults to true. Set false for background notices with no action needed. */
  actionable?: boolean;
  actionUrl?: string | null;
}

/**
 * Create a single student notification.
 *
 * Notifications carry an explicit `actionUrl` so every notification
 * surface (inbox, header, dashboard) links straight to the target
 * page instead of guessing the destination from the notification type.
 *
 * Notification delivery must never break the admin action that triggered it,
 * so failures are logged and swallowed.
 */
export async function notifyStudent(input: VideoNotificationInput): Promise<void> {
  try {
    const actionUrl = input.actionUrl !== undefined
      ? input.actionUrl
      : (input.actionable === false ? null : INTRO_VIDEO_ACTION_URL);

    await prisma.notification.create({
      data: {
        studentId: input.studentId,
        title: input.title,
        message: input.message,
        type: 'MODERATION',
        actionUrl,
      },
    });
  } catch (err) {
    console.warn('[notification] failed to create student notification:', err);
  }
}

/**
 * Tell a student their introduction video needs to be re-uploaded.
 * Used by the admin moderation queue and the "request new video" action.
 */
export async function notifyVideoChangeRequested(
  studentId: string,
  reason: string | null | undefined,
): Promise<void> {
  const note = (reason || '').trim();

  await notifyStudent({
    studentId,
    title: 'New introduction video requested',
    message: note
      ? `Your introduction video needs to be changed. Faculty note: "${note}" — please upload a new version, it will replace your current video.`
      : 'Your introduction video needs to be changed. Please upload a new version — it will replace your current video.',
  });
}

export interface EventNotificationInput {
  id: string;
  name: string;
  description?: string | null;
  slug?: string;
  eligibilityYears?: number[];
}

/**
 * Sends a notification to all students when an event is created by an admin.
 *
 * Scoped to active students in the database. When eligibilityYears is set,
 * targets only eligible years; otherwise fans out to all students.
 */
export async function notifyAllStudentsAboutEvent(
  event: EventNotificationInput,
): Promise<number> {
  try {
    const where: any = {};
    if (Array.isArray(event.eligibilityYears) && event.eligibilityYears.length > 0) {
      where.year = { in: event.eligibilityYears };
    }

    const students = await prisma.student.findMany({
      where,
      select: { id: true },
    });

    if (students.length === 0) return 0;

    const actionUrl = `/events/${event.id}`;
    const desc = event.description ? `: ${event.description}` : '';
    const message = `A new event "${event.name}" has been published${desc}. Click to view details and register!`;

    const result = await prisma.notification.createMany({
      data: students.map((student) => ({
        studentId: student.id,
        title: `New Event: ${event.name}`,
        message,
        type: 'EVENT' as const,
        actionUrl,
      })),
    });

    return result.count;
  } catch (err) {
    console.warn('[notification] failed to fan out event notifications to students:', err);
    return 0;
  }
}

