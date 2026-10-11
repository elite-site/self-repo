import React from 'react';
import { ActivityLogView } from '../components/ActivityLogView';
import { ACTIVE_EVENT_ID } from '@/shared/layout/Sidebar';

export interface ActivityLogPageProps {
  activeEventId?: string;
}

export const ActivityLogPage: React.FC<ActivityLogPageProps> = ({
  activeEventId = ACTIVE_EVENT_ID,
}) => {
  return <ActivityLogView activeEventId={activeEventId} />;
};

export default ActivityLogPage;
