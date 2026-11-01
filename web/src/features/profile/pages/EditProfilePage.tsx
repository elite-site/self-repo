import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { PhotoCropModal } from '@/shared/ui/PhotoCropModal';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
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
    <div className="space-y-6 text-left page-enter max-w-5xl mx-auto pb-10" role="main">
      {/* 1. ASYMMETRICAL TOP BAR */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 text-body-sm text-ink-secondary hover:text-ink font-semibold"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Profile
              </Link>
              <h1 className="mt-2 font-heading text-headline-md font-bold text-ink">
                Edit Student Profile
              </h1>
              <p className="text-body-sm text-ink-secondary">
                Update your biography, showcase photo, and technical portfolio links.
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary min-h-[44px] px-6 inline-flex items-center gap-1.5 self-start sm:self-center shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving…' : 'Save Changes'}</span>
            </button>
          </div>

          {success && (
            <div className="p-4 bg-status-bg-approved border border-edge-strong rounded-xl text-status-approved text-body-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Profile saved successfully!
            </div>
          )}

          {error && (
            <div className="p-4 bg-status-bg-rejected border border-edge-strong rounded-xl text-status-rejected text-body-sm">
              {error}
            </div>
          )}
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                <Sparkles size={14} aria-hidden="true" />
                Profile Guidelines
              </span>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                A clear headshot and complete LinkedIn and GitHub links significantly improve your visibility to recruiters in the public directory.
              </p>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. MASONRY EDITING SECTIONS */}
      <MasonryGrid cols={2}>
        <MasonryItem>
          <div className="space-y-6">
            <PhotoUploadSection
              profile={profile}
              uploadingPhoto={uploadingPhoto}
              removingPhoto={removingPhoto}
              photoError={photoError}
              fileInputRef={fileInputRef}
              onPhotoSelect={handlePhotoSelect}
              onRemovePhoto={handleRemovePhoto}
            />

            <div className="surface p-6 sm:p-8 space-y-4 rounded-2xl">
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
                <label htmlFor="qualities-input" className="label">Special Qualities & Distinctions</label>
                <textarea
                  id="qualities-input"
                  rows={3}
                  value={specialQualities}
                  onChange={(e) => setSpecialQualities(e.target.value)}
                  placeholder="Leadership experiences, department contributions, hackathon wins, honors…"
                  className="textarea"
                />
              </div>
            </div>
          </div>
        </MasonryItem>

        <MasonryItem>
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
        </MasonryItem>
      </MasonryGrid>

      <PhotoCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => setIsCropModalOpen(false)}
        onCropSave={handleCropComplete}
      />
    </div>
  );
};

export default EditProfilePage;
