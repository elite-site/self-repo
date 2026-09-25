import React from 'react';
import { StudentsTable } from '../components/StudentsTable';
import { ACTIVE_EVENT_ID } from '../components/Sidebar';

export const Students: React.FC = () => {
  return (
    <div className="space-y-6">
      <StudentsTable activeEventId={ACTIVE_EVENT_ID} onSelectSubmission={() => {}} />
    </div>
  );
};
