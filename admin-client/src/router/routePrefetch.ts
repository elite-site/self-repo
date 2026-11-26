type AdminRouteLoader = () => Promise<unknown>;

const ADMIN_ROUTE_LOADERS: Record<string, AdminRouteLoader> = {
  dashboard: () => import('@/features/analytics/pages/DashboardPage'),
  students: () => import('@/features/students/pages/StudentsPage'),
  github: () => import('@/features/github/pages/AdminGithubPage'),
  codechef: () => import('@/features/codechef/pages/AdminCodeChefPage'),
  moderation: () => import('@/features/moderation/pages/ModerationPage'),
  submissions: () => import('@/features/moderation/pages/ModerationPage'),
  learning: () => import('@/features/learning/pages/AdminCoursesPage'),
  resources: () => import('@/features/resources/pages/AdminResourcesPage'),
  events: () => import('@/features/events/pages/AdminEventsPage'),
  'event-registrations': () => import('@/features/registrations/pages/EventRegistrationsPage'),
  voting: () => import('@/features/events/pages/VotingManagementPage'),
  'voting-results': () => import('@/features/events/pages/VotingResultsPage'),
  communications: () => import('@/features/announcements/pages/AnnouncementsPage'),
  'email-automation': () => import('@/features/email-automation/pages/EmailAutomationPage'),
  'email-history': () => import('@/features/email-automation/pages/EmailHistoryPage'),
  analytics: () => import('@/features/analytics/pages/AnalyticsPage'),
  exports: () => import('@/features/registrations/pages/ExportsPage'),
  storage: () => import('@/features/storage/pages/StoragePage'),
  roles: () => import('@/features/roles/pages/RolesPermissionsPage'),
  'audit-logs': () => import('@/features/activity-log/pages/AuditLogsPage'),
  activity: () => import('@/features/activity-log/pages/AuditLogsPage'),
  settings: () => import('@/features/settings/pages/SettingsPage'),
};

const prefetched = new Set<string>();

function normalizeTab(tabOrPath: string): string {
  const clean = tabOrPath.split('?')[0].split('#')[0].replace(/^\/admin\/?/, '').replace(/^\//, '');
  const firstSegment = clean.split('/')[0];
  return firstSegment || 'dashboard';
}

export function prefetchAdminRoute(tabOrPath: string): void {
  const tab = normalizeTab(tabOrPath);
  if (prefetched.has(tab)) return;
  prefetched.add(tab);
  void ADMIN_ROUTE_LOADERS[tab]?.();
}

export function prefetchActiveAdminRoute(): void {
  if (typeof window === 'undefined') return;
  if (!window.location.pathname.startsWith('/admin')) return;
  prefetchAdminRoute(window.location.pathname);
}
