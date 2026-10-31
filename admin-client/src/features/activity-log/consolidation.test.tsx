import { Suspense, type ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const activityLogApiMock = vi.hoisted(() => ({
  getActivityLogs: vi.fn(),
  getActivityLogsExportUrl: vi.fn(() => '/admin/api/activity-logs/export'),
}));

vi.mock('./api', () => ({ activityLogApi: activityLogApiMock }));

import { adminRoutes } from '@/App';
import { ADMIN_NAV_GROUPS } from '@/shared/layout/Sidebar';

const emptyResponse = {
  logs: [],
  stats: {
    totalActivities: 0,
    applicationsToday: 0,
    adminActions: 0,
    errorsCount: 0,
    successRate: 100,
  },
  pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
};

function renderAdminRoute(path: string) {
  const router = createMemoryRouter(
    [{ path: '/admin', element: <Outlet />, children: adminRoutes }],
    { initialEntries: [path] },
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>,
  );

  return { router, ...view };
}

beforeEach(() => {
  activityLogApiMock.getActivityLogs.mockReset();
  activityLogApiMock.getActivityLogs.mockResolvedValue(emptyResponse);
});

describe('activity-log route consolidation', () => {
  it('keeps /activity as a redirect to the canonical audit page', () => {
    const aliasRoute = adminRoutes.find((route) => route.path === 'activity');
    expect(aliasRoute).toBeDefined();

    const aliasElement = aliasRoute?.element as ReactElement<{ to: string; replace?: boolean }>;
    expect(aliasElement?.props.to).toBe('/admin/audit-logs');
    expect(aliasElement?.props.replace).toBe(true);
  });

  it('renders the same audit page for both paths', async () => {
    const aliasView = renderAdminRoute('/admin/activity');

    expect(
      await screen.findByRole('heading', { name: /security governance & audit trail/i }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(aliasView.router.state.location.pathname).toBe('/admin/audit-logs');
    });
    aliasView.unmount();

    renderAdminRoute('/admin/audit-logs');
    expect(
      await screen.findByRole('heading', { name: /security governance & audit trail/i }),
    ).toBeInTheDocument();
  });

  it('lists exactly one audit-log entry in the sidebar', () => {
    const items = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

    expect(items.filter((item) => item.id === 'audit-logs')).toHaveLength(1);
    expect(items.filter((item) => item.label.toLowerCase().includes('activity'))).toHaveLength(0);
  });
});
