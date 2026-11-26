import { registerRoutePrefetchLoaders } from '@/shared/utils/prefetch';
import { hasStoredToken } from '@/shared/utils/sessionBootstrap';

let appShellPrefetched = false;

export function prefetchAppShell(): void {
  if (appShellPrefetched) return;
  appShellPrefetched = true;
  void import('@/shared/layout/AppLayout');
}

registerRoutePrefetchLoaders({
  '/': () => import('@/pages/public/HomePage'),
  '/students': () => import('@/features/directory/pages/StudentDirectoryPage'),
  '/events': () =>
    hasStoredToken()
      ? import('@/features/events/pages/EventsPage')
      : import('@/features/events/pages/PublicEventsPage'),
  '/settings': () => import('@/features/profile/pages/SettingsPage'),
  '/login': () => import('@/features/auth/pages/LoginPage'),
  '/dashboard': () => import('@/features/dashboard/pages/DashboardPage'),
  '/learning': () => import('@/features/learning/pages/LearningHomePage'),
  '/learning/courses': () => import('@/features/learning/pages/CoursesGridPage'),
  '/learning/my-learning': () => import('@/features/learning/pages/MyLearningPage'),
  '/resources': () => import('@/features/resources/pages/ResourcesPage'),
  '/profile': () => import('@/features/profile/pages/ProfilePage'),
  '/profile/edit': () => import('@/features/profile/pages/EditProfilePage'),
  '/portfolio': () => import('@/features/portfolio/pages/PortfolioPage'),
  '/portfolio/projects': () => import('@/features/portfolio/pages/PortfolioPage'),
  '/portfolio/achievements': () => import('@/features/portfolio/pages/PortfolioPage'),
  '/portfolio/certificates': () => import('@/features/portfolio/pages/PortfolioPage'),
  '/github': () => import('@/features/github/pages/GithubPage'),
  '/codechef': () => import('@/features/codechef/pages/CodeChefPage'),
  '/intro-video': () => import('@/features/video/pages/VideoPage'),
  '/resume': () => import('@/features/resume/pages/ResumePage'),
  '/registrations': () => import('@/features/events/pages/RegistrationsPage'),
  '/teams': () => import('@/features/teams/pages/TeamsPage'),
  '/voting': () => import('@/features/voting/pages/VotingPage'),
  '/notifications': () => import('@/features/notifications/pages/NotificationsPage'),
});
