import { apiClient, authApi, ApiError, normalizeApiError } from '@/shared/api';
import { activityLogApi } from '@/features/activity-log/api';
import { analyticsApi } from '@/features/analytics/api';
import { announcementsApi } from '@/features/announcements/api';
import { emailAutomationApi } from '@/features/email-automation/api';
import { eventsApi } from '@/features/events/api';
import { githubApi } from '@/features/github/api';
import { moderationApi } from '@/features/moderation/api';
import { registrationsApi } from '@/features/registrations/api';
import { rolesApi } from '@/features/roles/api';
import { settingsApi } from '@/features/settings/api';
import { storageApi } from '@/features/storage/api';
import { studentsApi } from '@/features/students/api';

export {
  apiClient,
  authApi,
  ApiError,
  normalizeApiError,
  activityLogApi,
  analyticsApi,
  announcementsApi,
  emailAutomationApi,
  eventsApi,
  githubApi,
  moderationApi,
  registrationsApi,
  rolesApi,
  settingsApi,
  storageApi,
  studentsApi,
};

export const client = apiClient;

export const adminApi = {
  ...authApi,
  ...eventsApi,
  ...analyticsApi,
  ...moderationApi,
  ...studentsApi,
  ...registrationsApi,
  ...emailAutomationApi,
  ...announcementsApi,
  ...rolesApi,
  ...settingsApi,
  ...storageApi,
  ...githubApi,
  ...activityLogApi,
};

export const api = adminApi;
export default adminApi;
