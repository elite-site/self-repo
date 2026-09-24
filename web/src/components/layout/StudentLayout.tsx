import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../Navbar';
import { StudentSidebar } from './StudentSidebar';
import { StudentSession } from '../../types';

interface StudentLayoutProps {
  session: StudentSession | null;
  onLogout: () => void;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ session, onLogout }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Navbar session={session} onLogout={onLogout} onNavigate={() => {}} />
      <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full">
        <StudentSidebar />
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
