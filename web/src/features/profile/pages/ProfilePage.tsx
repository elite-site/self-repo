import React from 'react';
import { AlertCircle, ShieldCheck, Edit3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
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
    <div className="space-y-8 text-left page-enter max-w-6xl mx-auto pb-10" role="main">
      {/* 1. ASYMMETRIC PROFILE HERO */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <ProfileHeader
            profile={profile}
            onRequestCorrection={() => setModalOpen(true)}
          />
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                  <ShieldCheck size={16} aria-hidden="true" />
                  Academic Profile
                </span>
                <span className="badge badge-brand text-[11px]">Verified</span>
              </div>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                Official academic records are synchronized with the Department of Information Technology. If any information needs updating, submit a change request.
              </p>
              <div className="space-y-1.5 pt-2 text-label-xs font-mono text-ink-secondary">
                <div>Roll No: <span className="font-bold text-ink">{profile.rollNo}</span></div>
                <div>Batch: <span className="text-ink">Year {profile.year} - Sec {profile.section}</span></div>
                <div>Department: <span className="text-ink">{profile.branch || 'IT'}</span></div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-brand/20 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="btn btn-secondary text-xs px-3 py-1.5 rounded-full"
              >
                Request Correction
              </button>
              <Link
                to="/profile/edit"
                className="btn btn-primary text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1"
              >
                <Edit3 size={12} aria-hidden="true" />
                Edit Profile
              </Link>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. MASONRY PROFILE TABS & SECTIONS */}
      <MasonryGrid cols={2}>
        <MasonryItem>
          <ProfileBioSection profile={profile} />
        </MasonryItem>

        <MasonryItem>
          <ProfilePortfolioSection
            projects={projects}
            certificates={certificates}
            achievements={achievements}
            video={video}
            resume={resume}
          />
        </MasonryItem>
      </MasonryGrid>

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
