import { authApi } from '@/features/auth/api';
import { videoApi } from '@/features/video/api';
import { profileApi } from '@/features/profile/api';
import { portfolioApi } from '@/features/portfolio/api';
import { resumeApi } from '@/features/resume/api';
import { eventsApi } from '@/features/events/api';
import { teamsApi } from '@/features/teams/api';
import { votingApi } from '@/features/voting/api';
import { notificationsApi, pauseNotificationPolling, resumeNotificationPolling, isNotificationPollingPaused } from '@/features/notifications/api';
import { dashboardApi } from '@/features/dashboard/api';
import { githubApi } from '@/features/github/api';
import { directoryApi } from '@/features/directory/api';
import { publicProfileApi } from '@/features/public-profile/api';

import {
  client,
  getApiBaseUrl,
  resolveMediaUrl,
  cachedFetch,
  invalidateApiCache,
  uploadDirectToDrive,
  queryResumableSessionStatus,
  type UploadProgressInfo,
  type DirectUploadParams,
} from '@/shared/api';

export {
  client,
  getApiBaseUrl,
  resolveMediaUrl,
  cachedFetch,
  invalidateApiCache,
  uploadDirectToDrive,
  queryResumableSessionStatus,
  type UploadProgressInfo,
  type DirectUploadParams,
  pauseNotificationPolling,
  resumeNotificationPolling,
  isNotificationPollingPaused,
};

export const api = {
  // Auth
  ...authApi,

  // Video
  ...videoApi,

  // Profile
  ...profileApi,

  // Portfolio
  ...portfolioApi,

  // Resume
  ...resumeApi,

  // Events
  ...eventsApi,

  // Teams
  ...teamsApi,

  // Voting
  ...votingApi,

  // Notifications & Announcements
  ...notificationsApi,

  // Dashboard
  ...dashboardApi,

  // GitHub
  ...githubApi,

  // Directory & Public
  ...directoryApi,
  ...publicProfileApi,
};

export default api;
