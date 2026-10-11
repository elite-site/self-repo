import React from 'react';
import { AlertCircle } from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { useProfile } from '../hooks/useProfile';
import {
  ProfileHeader,
  ProfileBioSection,
  ProfilePortfolioSection,
  AcademicChangeRequestModal,
} from '../components';

export const ProfilePage: React.FC = () => {
  const {
    profile,
    video,
    resume,
    projects,
    achievements,
    certificates,
    portfolio,
    loading,
    error,
    modalOpen,
    setModalOpen,
    fieldName,
    setFieldName,
    requestedValue,
    setRequestedValue,
    reason,
    setReason,
    submittingReq,
    reqSuccess,
    reqError,
    fetchProfileData,
    handleSubmitChangeRequest,
  } = useProfile();

  if (loading) {
    return <SkeletonPage label="Loading profile" cards={3} rows={4} />;
  }

  if (error || !profile) {
    return (
      <div className="surface max-w-xl mx-auto p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-status-rejected mx-auto" />
        <h2 className="text-body-md font-bold text-ink font-heading">Profile Not Found</h2>
        <p className="text-body-sm text-ink-muted">{error || 'Unable to load profile data.'}</p>
        <button onClick={fetchProfileData} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left page-enter max-w-5xl mx-auto" role="main">
      <ProfileHeader
        profile={profile}
        onRequestCorrection={() => setModalOpen(true)}
      />

      <ProfileBioSection profile={profile} />

      <ProfilePortfolioSection
        projects={projects}
        certificates={certificates}
        achievements={achievements}
        video={video}
        resume={resume}
      />

      <AcademicChangeRequestModal
        isOpen={modalOpen}
        fieldName={fieldName}
        requestedValue={requestedValue}
        reason={reason}
        submitting={submittingReq}
        success={reqSuccess}
        error={reqError}
        onFieldNameChange={setFieldName}
        onRequestedValueChange={setRequestedValue}
        onReasonChange={setReason}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitChangeRequest}
      />
    </div>
  );
};

export default ProfilePage;
