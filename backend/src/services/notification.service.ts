import { prisma } from '../lib/prisma';

/** The student-portal route that owns a video change request. */
export const INTRO_VIDEO_ACTION_URL = '/intro-video';

export interface VideoNotificationInput {
  studentId: string;
  title: string;
  message: string;
  /** Defaults to true. Set false for background notices with no action needed. */
  actionable?: boolean;
}

/**
 * Create a single student notification.
 *
 * Video notifications carry an explicit `actionUrl` so every notification
 * surface (inbox, header, dashboard) links straight to the introduction
 * video page instead of guessing the destination from the notification type.
 *
 * Notification delivery must never break the admin action that triggered it,
 * so failures are logged and swallowed.
 */
export async function notifyStudent(input: VideoNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        studentId: input.studentId,
        title: input.title,
        message: input.message,
        type: 'MODERATION',
        actionUrl: input.actionable === false ? null : INTRO_VIDEO_ACTION_URL,
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
