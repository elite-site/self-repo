import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, CheckCircle2, X } from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { PhotoCropModal } from '@/shared/ui/PhotoCropModal';
import type { StudentOutletContext } from '@/shared/layout/AppLayout';
import { useEditProfile } from '../hooks/useEditProfile';
import { PhotoUploadSection, SocialLinksForm } from '../components';

const COMMON_SKILLS = ['Python', 'Java', 'HTML', 'CSS', 'SQL', 'React'];

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
    skills,
    skillInput,
    setSkillInput,
    skillError,
    setSkillError,
    addSkill,
    removeSkill,
    githubUrl,
    setGithubUrl,
    linkedinUrl,
    setLinkedinUrl,
    leetcodeUrl,
    setLeetcodeUrl,
    codechefUrl,
    setCodechefUrl,
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

      <div className="surface p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-body-md font-bold text-ink">Skills</h2>
          <span className="text-body-sm text-ink-muted">{skills.length} / 10 skills</span>
        </div>
        <p className="text-body-sm text-ink-secondary">
          Add between 2 and 10 technical or professional skills to display on your profile.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => {
              setSkillInput(e.target.value);
              if (skillError) setSkillError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
              }
            }}
            disabled={skills.length >= 10}
            placeholder="e.g. React, Python, SQL..."
            className="input flex-1"
            aria-label="Skill name"
          />
          <button
            type="button"
            onClick={() => addSkill()}
            disabled={skills.length >= 10}
            className="btn btn-secondary"
          >
            Add
          </button>
        </div>

        <div className="space-y-1">
          {skills.length >= 10 && (
            <p className="text-label-sm text-status-warning">Maximum 10 skills reached</p>
          )}
          {skillError ? (
            <p className="text-label-sm text-status-rejected">{skillError}</p>
          ) : skills.length < 2 ? (
            <p className="text-label-sm text-status-rejected">Add at least 2 skills</p>
          ) : null}
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-edge bg-surface-sunken text-body-sm font-medium text-ink"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  aria-label={`Remove ${skill}`}
                  className="text-ink-muted hover:text-ink inline-flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="space-y-1.5 pt-2">
          <span className="text-label-sm text-ink-muted">Quick add suggestions:</span>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SKILLS.map((suggestion) => {
              const isAdded = skills.some((s) => s.toLowerCase() === suggestion.toLowerCase());
              const isDisabled = isAdded || skills.length >= 10;
              return (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => addSkill(suggestion)}
                  className={`px-2.5 py-1 rounded-md text-label-sm border transition-colors ${
                    isDisabled
                      ? 'border-edge opacity-50 cursor-not-allowed bg-surface-sunken text-ink-muted'
                      : 'border-edge bg-surface hover:bg-surface-hover text-ink cursor-pointer'
                  }`}
                >
                  + {suggestion}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <SocialLinksForm
        githubUrl={githubUrl}
        linkedinUrl={linkedinUrl}
        leetcodeUrl={leetcodeUrl}
        codechefUrl={codechefUrl}
        portfolioUrl={portfolioUrl}
        onGithubChange={setGithubUrl}
        onLinkedinChange={setLinkedinUrl}
        onLeetcodeChange={setLeetcodeUrl}
        onCodechefChange={setCodechefUrl}
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
