import { registerRoutePrefetchLoaders } from '@/shared/utils/prefetch';

registerRoutePrefetchLoaders({
  '/': () => import('@/pages/public/HomePage'),
  '/students': () => import('@/features/directory/pages/StudentDirectoryPage'),
  '/events': () => import('@/features/events/pages/PublicEventsPage'),
  '/settings': () => import('@/features/profile/pages/SettingsPage'),
  '/login': () => import('@/features/auth/pages/LoginPage'),
  '/dashboard': () => import('@/features/dashboard/pages/DashboardPage'),
  '/profile': () => import('@/features/profile/pages/ProfilePage'),
  '/profile/edit': () => import('@/features/profile/pages/EditProfilePage'),
  '/portfolio': () => import('@/features/portfolio/pages/PortfolioPage'),
  '/intro-video': () => import('@/features/video/pages/VideoPage'),
  '/resume': () => import('@/features/resume/pages/ResumePage'),
  '/registrations': () => import('@/features/events/pages/RegistrationsPage'),
  '/teams': () => import('@/features/teams/pages/TeamsPage'),
  '/voting': () => import('@/features/voting/pages/VotingPage'),
  '/notifications': () => import('@/features/notifications/pages/NotificationsPage'),
});
