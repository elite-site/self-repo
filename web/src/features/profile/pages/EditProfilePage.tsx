import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { PhotoCropModal } from '@/shared/ui/PhotoCropModal';
import type { StudentOutletContext } from '@/shared/layout/AppLayout';
import { useEditProfile } from '../hooks/useEditProfile';
import { PhotoUploadSection, SocialLinksForm } from '../components';

export const EditProfilePage: React.FC = () => {
  const { onPhotoChange } = useOutletContext<StudentOutletContext>() ?? {};
  const {
    profile,
    loading,
    saving,
    uploadingPhoto,
    removingPhoto,
    photoError,
    error,
    success,
    bio,
    setBio,
    specialQualities,
    setSpecialQualities,
    githubUrl,
    setGithubUrl,
    linkedinUrl,
    setLinkedinUrl,
    leetcodeUrl,
    setLeetcodeUrl,
    codechefUrl,
    setCodechefUrl,
    hackerrankUrl,
    setHackerrankUrl,
    codeforcesUrl,
    setCodeforcesUrl,
    portfolioUrl,
    setPortfolioUrl,
    fileInputRef,
    isCropModalOpen,
    setIsCropModalOpen,
    cropImageSrc,
    handleSave,
    handlePhotoSelect,
    handleCropComplete,
    handleRemovePhoto,
  } = useEditProfile(onPhotoChange);

  if (loading) {
    return <SkeletonPage label="Loading profile editor" cards={2} rows={4} />;
  }

  return (
    <div className="space-y-6 text-left page-enter max-w-4xl mx-auto pb-10" role="main">
      <div className="flex items-center justify-between">
        <Link to="/profile" className="inline-flex items-center gap-1.5 text-body-sm text-ink-secondary hover:text-ink font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary inline-flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving…' : 'Save Changes'}</span>
        </button>
      </div>

      {success && (
        <div className="p-4 bg-status-bg-approved border border-edge-strong rounded-lg text-status-approved text-body-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Profile saved successfully!
        </div>
      )}

      {error && (
        <div className="p-4 bg-status-bg-rejected border border-edge-strong rounded-lg text-status-rejected text-body-sm">
          {error}
        </div>
      )}

      <PhotoUploadSection
        profile={profile}
        uploadingPhoto={uploadingPhoto}
        removingPhoto={removingPhoto}
        photoError={photoError}
        fileInputRef={fileInputRef}
        onPhotoSelect={handlePhotoSelect}
        onRemovePhoto={handleRemovePhoto}
      />

      <div className="surface p-6 sm:p-8 space-y-4">
        <h2 className="font-heading text-body-md font-bold text-ink">Personal Introduction</h2>
        <div>
          <label htmlFor="bio-input" className="label">About Me (Bio)</label>
          <textarea
            id="bio-input"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Introduce yourself, your academic passions, career goals and tech stack…"
            className="textarea"
          />
        </div>
        <div>
          <label htmlFor="special-qualities-input" className="label">Special Qualities & Distinctions</label>
          <textarea
            id="special-qualities-input"
            rows={3}
            value={specialQualities}
            onChange={(e) => setSpecialQualities(e.target.value)}
            placeholder="Unique accomplishments, leadership roles, club memberships, or soft skills…"
            className="textarea"
          />
        </div>
      </div>

      <SocialLinksForm
        githubUrl={githubUrl}
        linkedinUrl={linkedinUrl}
        leetcodeUrl={leetcodeUrl}
        codechefUrl={codechefUrl}
        hackerrankUrl={hackerrankUrl}
        codeforcesUrl={codeforcesUrl}
        portfolioUrl={portfolioUrl}
        onGithubChange={setGithubUrl}
        onLinkedinChange={setLinkedinUrl}
        onLeetcodeChange={setLeetcodeUrl}
        onCodechefChange={setCodechefUrl}
        onHackerrankChange={setHackerrankUrl}
        onCodeforcesChange={setCodeforcesUrl}
        onPortfolioChange={setPortfolioUrl}
      />

      <PhotoCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropImageSrc}
        initialPosition={profile}
        onClose={() => setIsCropModalOpen(false)}
        onCropSave={handleCropComplete}
      />
    </div>
  );
};

export default EditProfilePage;
