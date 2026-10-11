import React from 'react';
import { X } from 'lucide-react';
import { useStudentDetail } from '../hooks/useStudentDetail';
import { StudentDetailHeader } from '../components/StudentDetailHeader';
import { StudentDetailOverview } from '../components/StudentDetailOverview';
import { MediaTab } from '../components/MediaTab';
import { PortfolioTab } from '../components/PortfolioTab';
import { StudentActionModals } from '../components/StudentActionModals';
import { StudentDetailSkeleton, StudentNotFound } from '../components/StudentDetailSkeleton';

export interface StudentDetailPageProps {
  studentId: string;
  onBack?: () => void;
}

export const StudentDetailPage: React.FC<StudentDetailPageProps> = ({ studentId, onBack }) => {
  const {
    student,
    introVideo,
    resume,
    achievements,
    certificates,
    projects,
    pendingChanges,
    loading,
    error,
    toast,
    setToast,
    requestModal,
    setRequestModal,
    requestNote,
    setRequestNote,
    deleteModal,
    setDeleteModal,
    deleteReason,
    setDeleteReason,
    openRequestModal,
    openDeleteModal,
    actionLoading,
    activeTab,
    setActiveTab,
    loadStudent,
    handleRequestChangeSubmit,
    handleDeleteSubmit,
  } = useStudentDetail(studentId);

  if (loading) return <StudentDetailSkeleton />;
  if (error || !student) return <StudentNotFound error={error} onBack={onBack} />;

  return (
    <div className="space-y-6 text-left pb-16">
      {toast && (
        <div className="fixed bottom-5 right-5 z-overlay bg-surface-inverse text-ink-inverse text-xs font-semibold px-4 py-3 rounded-lg shadow-modal animate-fade-in flex items-center gap-2" role="status">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} className="p-1 hover:opacity-75 rounded ml-2 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <StudentDetailHeader student={student} onBack={onBack} onRefresh={loadStudent} />

      <div className="flex items-center gap-1 border-b border-edge overflow-x-auto" role="tablist">
        {(['overview', 'portfolio', 'media'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 -mb-px whitespace-nowrap border-b-2 text-xs font-bold transition-colors cursor-pointer capitalize ${
              activeTab === tab ? 'border-brand text-brand' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {tab}
            {tab === 'overview' && pendingChanges.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-status-bg-changes text-status-changes text-xs font-bold">
                {pendingChanges.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <StudentDetailOverview
          pendingChanges={pendingChanges}
          projectsCount={projects.length}
          achievementsCount={achievements.length}
          certificatesCount={certificates.length}
          introVideo={introVideo}
          resume={resume}
        />
      )}

      {activeTab === 'media' && (
        <MediaTab
          introVideo={introVideo}
          resume={resume}
          onRequestChanges={openRequestModal}
          onDelete={openDeleteModal}
        />
      )}

      {activeTab === 'portfolio' && (
        <PortfolioTab
          student={student}
          onRequestChanges={openRequestModal}
          onDelete={openDeleteModal}
        />
      )}

      <StudentActionModals
        requestModal={requestModal}
        requestNote={requestNote}
        onRequestNoteChange={setRequestNote}
        onRequestClose={() => setRequestModal(null)}
        onRequestSubmit={handleRequestChangeSubmit}
        deleteModal={deleteModal}
        deleteReason={deleteReason}
        onDeleteReasonChange={setDeleteReason}
        onDeleteClose={() => setDeleteModal(null)}
        onDeleteSubmit={handleDeleteSubmit}
        actionLoading={actionLoading}
      />
    </div>
  );
};

export default StudentDetailPage;
