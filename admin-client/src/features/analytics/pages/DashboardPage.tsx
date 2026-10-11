import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStats } from '../hooks/useStats';
import { StatsDashboard } from '../components/StatsDashboard';
import { ACTIVE_EVENT_ID } from '@/shared/layout/Sidebar';

export const DashboardPage: React.FC = () => {
  const { stats, loading } = useStats(ACTIVE_EVENT_ID);
  const navigate = useNavigate();

  return (
    <StatsDashboard
      stats={stats}
      loading={loading}
      onNavigateTab={(t) => navigate(`/admin/${t}`)}
    />
  );
};

export default DashboardPage;
