import { prisma } from '../lib/prisma';
import { env } from '../config/env';

/**
 * Portal-wide operational limits.
 *
 * The video size limit is administrator-configurable and stored in
 * `PortalSettings`, but it has an environment-variable fallback so a fresh
 * deployment works with no admin configuration. The stored value wins when it
 * parses to a positive number; otherwise the env default applies.
 *
 * This exists because the limit used to be enforced in three places that could
 * disagree: the env var (enforced), a hard-coded constant in the student client
 * (a duplicate of the env default), and the admin setting (displayed, but never
 * read). Resolving it in one place makes the value an administrator edits the
 * same value that gets enforced.
 */
export const VIDEO_SIZE_SETTING_KEY = 'max_video_size_mb';

/** Hard ceiling on an upload body, independent of the configured limit. */
export function getMaxVideoHardCapMb(): number {
  const configured = parseInt(process.env.MAX_VIDEO_SIZE_HARD_CAP_MB || '', 10);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return 100;
}

function parsePositiveInt(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** The env-configured default, used whenever no admin override is stored. */
export function getDefaultMaxVideoSizeMb(): number {
  return parsePositiveInt(env.MAX_VIDEO_SIZE_MB) ?? 25;
}

/**
 * The effective video upload limit in megabytes: the administrator's value when
 * set, otherwise the environment default. Never exceeds the hard cap.
 */
export async function getMaxVideoSizeMb(): Promise<number> {
  const fallback = Math.min(getDefaultMaxVideoSizeMb(), getMaxVideoHardCapMb());

  try {
    const row = await prisma.portalSettings.findUnique({
      where: { key: VIDEO_SIZE_SETTING_KEY },
      select: { value: true },
    });
    if (!row) return fallback;
    return Math.min(parsePositiveInt(row.value) ?? fallback, getMaxVideoHardCapMb());
  } catch {
    // A settings lookup failure must not block an upload; use the safe default.
    return fallback;
  }
}
