import React from 'react';
import { Outlet } from 'react-router-dom';
import { StudentHeader } from './StudentHeader';
import { StudentSidebar } from './StudentSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { StudentSession } from '../../types';

interface StudentLayoutProps {
  session: StudentSession | null;
  onLogout: () => void;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ session, onLogout }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <StudentHeader session={session} onLogout={onLogout} />
      <div className="flex-1 flex overflow-hidden w-full h-[calc(100vh-61px)]">
        <StudentSidebar />
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          <div className="w-full max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomNav onLogout={onLogout} />
    </div>
  );
};

