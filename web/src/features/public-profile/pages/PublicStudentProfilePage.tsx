import React from 'react';
import { ChevronUp } from 'lucide-react';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PublicProfileProps } from '../types';
import { usePublicStudentProfile } from '../hooks/usePublicStudentProfile';
import {
  PublicProfileNavbar,
  PublicProfileHero,
  PublicProfileAbout,
  PublicProfileSkills,
  PublicProfileProjects,
  PublicProfileEducation,
  PublicProfileContact,
  PublicProfileSkeleton,
  PublicProfileNotFound,
} from '../components';

export const PublicStudentProfilePage: React.FC<PublicProfileProps> = () => {
  const {
    student,
    loading,
    error,
    retry,
    name,
    firstName,
    restOfName,
    initials,
    profile,
    bio,
    specialQualities,
    profileSkills,
    githubSkills,
    allProjects,
    achievements,
    certificates,
    hasResume,
    introVideo,
    photo,
    resumeDownloadHref,
    imageError,
    setImageError,
    mobileMenuOpen,
    setMobileMenuOpen,
    activeSection,
    showScrollTop,
    department,
    handleShare,
  } = usePublicStudentProfile();

  if (loading) {
    return <PublicProfileSkeleton />;
  }

  if (error && !student) {
    return (
      <div className="min-h-[100dvh] bg-[#070B16] text-slate-100 flex items-center justify-center p-6">
        <ErrorState
          title="Unable to load profile"
          message={error}
          onRetry={retry}
        />
      </div>
    );
  }

  if (!student) {
    return <PublicProfileNotFound />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#070B16] text-slate-100 font-sans selection:bg-rose-500 selection:text-white antialiased overflow-x-clip scroll-smooth print:bg-white print:text-black">
      <style>{`
        @media print {
          *, *::before, *::after {
            color: #0f172a !important;
            background-color: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
            border-color: #cbd5e1 !important;
          }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(225,29,72,0.14),rgba(255,255,255,0))] print:hidden" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_80%_100%,rgba(59,130,246,0.08),rgba(0,0,0,0))] print:hidden" />

      {/* Sticky Navbar */}
      <PublicProfileNavbar
        name={name}
        initials={initials}
        activeSection={activeSection}
        hasResume={hasResume}
        resumeDownloadHref={resumeDownloadHref}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onShare={handleShare}
      />

      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 space-y-14 sm:space-y-20 pb-20 print:p-0 print:space-y-8">
        <PublicProfileHero
          student={student}
          firstName={firstName}
          restOfName={restOfName}
          name={name}
          initials={initials}
          bio={bio}
          profile={profile}
          hasResume={hasResume}
          resumeDownloadHref={resumeDownloadHref}
          photo={photo}
          imageError={imageError}
          setImageError={setImageError}
          department={department}
        />

        <PublicProfileAbout
          name={name}
          bio={bio}
          specialQualities={specialQualities}
          introVideo={introVideo}
        />

        <PublicProfileSkills skills={githubSkills} profileSkills={profileSkills} />

        <PublicProfileProjects projects={allProjects} />

        <PublicProfileEducation
          student={student}
          achievements={achievements}
          certificates={certificates}
          department={department}
        />

        <PublicProfileContact
          student={student}
          profile={profile}
        />
      </main>

      {/* Compact Footer */}
      <footer className="border-t border-slate-800/80 py-8 text-xs text-slate-400 print:hidden">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {name}. All rights reserved.</p>
          <p className="text-slate-500">Built using modern web technologies · ELITE Portal</p>
        </div>
      </footer>

      {/* Floating Scroll to Top button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 min-h-[44px] min-w-[44px] flex items-center justify-center p-3 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-950/50 hover:bg-rose-600 transition-all duration-200 print:hidden"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
          aria-label="Scroll to top"
        >
          <ChevronUp size={18} />
        </button>
      )}
    </div>
  );
};

export default PublicStudentProfilePage;
