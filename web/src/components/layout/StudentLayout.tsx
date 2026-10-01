import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { StudentHeader } from './StudentHeader';
import { StudentSidebar } from './StudentSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { BrandedLoading } from '../BrandedLoading';
import { StudentSession } from '../../types';

interface StudentLayoutProps {
  session: StudentSession | null;
  onLogout: () => void;
  /**
   * Patches the app-level session so a change made inside a portal page (an
   * uploaded profile photo, for example) is reflected immediately in the header
   * avatar instead of only after the next login.
   */
  onPhotoChange?: (photoUrl: string | null) => void;
}

/** Context exposed to every page rendered inside the portal `<Outlet />`. */
export interface StudentOutletContext {
  onPhotoChange?: (photoUrl: string | null) => void;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ session, onLogout, onPhotoChange }) => {
  return (
    <div className="min-h-[100dvh] bg-surface-canvas flex flex-col font-sans">
      <StudentHeader session={session} onLogout={onLogout} />
      <div className="flex-1 flex overflow-hidden w-full min-h-[calc(100vh-var(--header,4rem))]">
        <StudentSidebar />
        <main className="flex-1 overflow-y-auto bg-surface-canvas p-6 sm:p-8 pb-24 md:pb-8 pt-header">
          <div className="w-full max-w-canvas mx-auto">
            {/* Every portal page is a lazy chunk, so navigating between them
                suspends. This boundary is deliberately *inside* the layout: the
                nearest one wins, so the header, sidebar and bottom nav stay put
                and only the content area swaps to a loading state. Falling
                through to the app-level boundary instead would blank the entire
                viewport on every click. */}
            <Suspense fallback={<BrandedLoading fullScreen={false} message="Loading Page" />}>
              <div className="page-enter">
                <Outlet context={{ onPhotoChange } satisfies StudentOutletContext} />
              </div>
            </Suspense>
          </div>
        </main>
      </div>
      <MobileBottomNav onLogout={onLogout} />
    </div>
  );
};

export default StudentLayout;
