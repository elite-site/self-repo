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
      import('../pages/public/HomePage');
      break;
    case '/students':
      import('../pages/public/StudentDirectoryPage');
      break;
    case '/events':
      import('../pages/public/PublicEventsPage');
      break;
    case '/settings':
      import('../pages/SettingsPage');
      break;
    case '/login':
      import('../pages/LoginPage');
      break;
    case '/dashboard':
      import('../pages/DashboardPage');
      break;
    case '/profile':
      import('../pages/ProfilePage');
      break;
    case '/profile/edit':
      import('../pages/EditProfilePage');
      break;
    case '/portfolio':
      import('../pages/PortfolioPage');
      break;
    case '/intro-video':
      import('../pages/VideoPage');
      break;
    case '/resume':
      import('../pages/ResumePage');
      break;
    case '/registrations':
      import('../pages/RegistrationsPage');
      break;
    case '/teams':
      import('../pages/TeamsPage');
      break;
    case '/voting':
      import('../pages/VotingPage');
      break;
    case '/notifications':
      import('../pages/NotificationsPage');
      break;
    default:
      break;
  }
}
