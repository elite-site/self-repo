/**
 * Instant Route Preloader
 * Dynamically loads route chunks when links are hovered or focused,
 * eliminating lazy-loading spin/lag on page navigation.
 */
const prefetchedRoutes = new Set<string>();

export function prefetchRoute(path: string): void {
  const cleanPath = path.split('?')[0].split('#')[0];
  if (!cleanPath || prefetchedRoutes.has(cleanPath)) return;
  prefetchedRoutes.add(cleanPath);

  switch (cleanPath) {
    case '/':
      import('@/pages/public/HomePage');
      break;
    case '/students':
      import('@/features/directory/pages/StudentDirectoryPage');
      break;
    case '/events':
      import('@/features/events/pages/PublicEventsPage');
      break;
    case '/settings':
      import('@/features/profile/pages/SettingsPage');
      break;
    case '/login':
      import('@/features/auth/pages/LoginPage');
      break;
    case '/dashboard':
      import('@/features/dashboard/pages/DashboardPage');
      break;
    case '/profile':
      import('@/features/profile/pages/ProfilePage');
      break;
    case '/profile/edit':
      import('@/features/profile/pages/EditProfilePage');
      break;
    case '/portfolio':
      import('@/features/portfolio/pages/PortfolioPage');
      break;
    case '/intro-video':
      import('@/features/video/pages/VideoPage');
      break;
    case '/resume':
      import('@/features/resume/pages/ResumePage');
      break;
    case '/registrations':
      import('@/features/events/pages/RegistrationsPage');
      break;
    case '/teams':
      import('@/features/teams/pages/TeamsPage');
      break;
    case '/voting':
      import('@/features/voting/pages/VotingPage');
      break;
    case '/notifications':
      import('@/features/notifications/pages/NotificationsPage');
      break;
    default:
      break;
  }
}
