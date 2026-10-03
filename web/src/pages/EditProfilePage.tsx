import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link, useOutletContext } from 'react-router-dom';
import {
  Camera,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Github,
  Linkedin,
  Globe,
  ArrowLeft,
  GraduationCap,
  ShieldAlert,
  Crop
} from 'lucide-react';
import { SkeletonPage } from '../components/ui/Skeleton';
import { api, resolveMediaUrl, invalidateApiCache } from '../services/api';
import { normalizeSocialLink, type SocialLinkKind } from '../utils/socialLinks';
import type { StudentOutletContext } from '../components/layout/AppLayout';
import { StudentProfile } from '../types';
import { PhotoCropModal } from '../components/PhotoCropModal';
import { getPhotoStyle } from '../utils/photoStyle';
import { compressImageToWebP } from '../utils/cropImage';
import { LeetCodeIcon, CodeChefIcon } from '../components/icons/PlatformIcons';
import { useToast } from '../components/Toast';
import { useReducedMotion } from '../hooks/useReducedMotion';

const COMMON_SKILLS = [
  'Python',
  'Java',
  'C++',
  'TypeScript',
  'JavaScript',
  'React',
  'Node.js',
  'Next.js',
  'PostgreSQL',
  'MongoDB',
  'Docker',
  'AWS',
  'Git',
  'Machine Learning',
  'Data Structures',
  'Tailwind CSS',
  'REST APIs',
  'Flutter',
];

export const EditProfilePage: React.FC = () => {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { onPhotoChange } = useOutletContext<StudentOutletContext>() ?? {};

  const [bio, setBio] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [leetcodeUrl, setLeetcodeUrl] = useState('');
  const [codechefUrl, setCodechefUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [linkErrors, setLinkErrors] = useState<Partial<Record<SocialLinkKind, string>>>({});

  // Photo Crop & Reposition state
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Reduced motion support
  const shouldReduce = useReducedMotion();

  // Clean up any pending object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    api.getProfile()
      .then((data) => {
        setProfile(data);
        setBio(data.bio || (data as any).biography || '');
        setGithubUrl(data.githubUrl || '');
        setLinkedinUrl(data.linkedinUrl || '');
        setLeetcodeUrl(data.leetcodeUrl || '');
        setCodechefUrl(data.codechefUrl || '');
        setPortfolioUrl(data.portfolioUrl || '');
        setSkills(Array.isArray(data.skills) ? data.skills : []);
      })
      .catch(() => {
        setError('Failed to load profile. Please refresh.');
        showToast('Failed to load profile. Please refresh.', 'error');
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate original file: must be a supported image under 5MB
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPEG, PNG, WEBP).');
      showToast('Please select a valid image file (JPEG, PNG, WEBP).', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const notice = `Image must be under 5MB (yours is ${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
      setPhotoError(notice);
      showToast(notice, 'error');
      e.target.value = '';
      return;
    }

    setPhotoError(null);
    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setIsCropModalOpen(true);
    e.target.value = '';
  };

  const handleCloseCropModal = () => {
    setIsCropModalOpen(false);
    if (cropImageSrc && cropImageSrc.startsWith('blob:')) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropImageSrc(null);
  };

  const handleCropSave = async (croppedBlob: Blob) => {
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const webpFile = new File([croppedBlob], 'photo.webp', { type: 'image/webp' });
      const formData = new FormData();
      formData.append('photo', webpFile);

      const res = await api.uploadProfilePhoto(formData);
      if (res.photoUrl) {
        const photoWithTimestamp = res.photoUrl.includes('?t=')
          ? res.photoUrl
          : `${res.photoUrl}${res.photoUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
        setProfile((prev) => (prev ? {
          ...prev,
          photoUrl: photoWithTimestamp,
          photoOffsetX: 50,
          photoOffsetY: 50,
          photoZoom: 1,
        } : prev));
        onPhotoChange?.(photoWithTimestamp);
        invalidateApiCache();
        showToast('Profile photo updated successfully', 'success');
        handleCloseCropModal();
      } else {
        throw new Error('No photo URL was returned.');
      }
    } catch (err: any) {
      const notice = err.response?.data?.message || err.message || 'Failed to upload photo. Please try again.';
      setPhotoError(notice);
      showToast(notice, 'error');
      throw err;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addSkill = (skill: string) => {
    const clean = skill.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
    }
    setCustomSkill('');
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  /**
   * Canonicalise one link field. The inputs accept any common paste format
   * (full URL, no protocol, `www.`, `@handle`, bare username), so the raw text
   * is normalised on blur and any unreadable value is reported inline instead of
   * silently failing the browser's native URL validation on submit.
   */
  const applyLink = (kind: SocialLinkKind, value: string) => {
    const result = normalizeSocialLink(kind, value);
    setLinkErrors((prev) => ({ ...prev, [kind]: result.ok ? undefined : result.error! }));
    return result.ok ? result.value : value;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    // Normalise every link first; an invalid value must block the save rather
    // than be persisted in a shape the profile page cannot render.
    const links: Array<[SocialLinkKind, string, (v: string) => void]> = [
      ['github', githubUrl, setGithubUrl],
      ['linkedin', linkedinUrl, setLinkedinUrl],
      ['leetcode', leetcodeUrl, setLeetcodeUrl],
      ['codechef', codechefUrl, setCodechefUrl],
      ['portfolio', portfolioUrl, setPortfolioUrl],
    ];
    const normalized: Record<string, string> = {};
    const errors: Partial<Record<SocialLinkKind, string>> = {};
    for (const [kind, raw, setter] of links) {
      const result = normalizeSocialLink(kind, raw);
      normalized[kind] = result.value;
      if (!result.ok) errors[kind] = result.error!;
      setter(result.ok ? result.value : raw);
    }
    setLinkErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please correct the highlighted links before saving.');
      showToast('Please correct the highlighted links before saving.', 'error');
      setSaving(false);
      return;
    }

    try {
      // Save profile fields and skills in parallel
      // Do NOT spread ...profile — it includes `biography` with the old value
      // which causes the backend to use the stale value instead of the new `bio`.
      await Promise.all([
        api.updateProfile({
          bio: bio.trim(),
          githubUrl: normalized.github,
          linkedinUrl: normalized.linkedin,
          leetcodeUrl: normalized.leetcode,
          codechefUrl: normalized.codechef,
          portfolioUrl: normalized.portfolio,
        }),
        api.updateSkills(skills),
      ]);
      invalidateApiCache();
      setSuccess(true);
      showToast('Profile saved.');
      setTimeout(() => {
        navigate('/profile');
      }, 1000);
    } catch (err: any) {
      const notice = err.response?.data?.message || 'Failed to save changes. Please try again.';
      setError(notice);
      showToast(notice, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SkeletonPage label="Loading student profile" cards={2} rows={3} />;
  }

  return (
    <div className="space-y-6 text-left page-enter">
      {/* HEADER WITH BACK LINK */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="p-2 rounded-lg border border-edge hover:bg-surface-canvas text-ink-secondary hover:text-ink transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-headline-lg font-black text-ink font-heading">Edit Student Profile</h1>
            <p className="text-body-sm text-ink-secondary">Update your biography, technical stack, and social links</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/profile')}
          className="text-body-sm font-bold text-ink-secondary hover:text-ink px-3 py-1.5 rounded-lg hover:bg-surface-canvas transition-colors cursor-pointer min-h-[44px]"
        >
          Cancel
        </button>
      </div>

      {/* FEEDBACK BANNERS */}
      {error && (
        <div className="p-4 bg-status-bg-rejected border border-status-rejected rounded-lg text-status-rejected text-body-sm flex items-center gap-2" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-status-bg-approved border border-status-approved rounded-lg text-status-approved text-body-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Profile saved successfully! Redirecting to profile...</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: PHOTO & AVATAR CARD */}
        <div className="surface space-y-4">
          <h2 className="text-label-lg font-bold text-ink font-heading">Profile Photo</h2>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group">
              {profile?.photoUrl ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-edge shadow-card">
                  <img
                    src={resolveMediaUrl(profile.photoUrl)}
                    alt={profile.name}
                    loading="lazy"
                    style={getPhotoStyle(profile)}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg bg-brand text-on-primary flex items-center justify-center font-black text-2xl shadow-card font-heading">
                  {profile?.name
                    ? profile.name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0]?.toUpperCase())
                        .join('')
                    : 'IT'}
                </div>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-scrim rounded-lg flex items-center justify-center text-on-primary">
                  <Loader2 className="w-6 h-6 animate-spin text-brand" />
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="btn btn-secondary min-h-[44px]"
                >
                  <Camera className="w-4 h-4" />
                  <span>{uploadingPhoto ? 'Uploading...' : profile?.photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
              </div>
              <p className="text-label-sm text-ink-muted">
                Recommended: Square image, max 5MB. Visible on public directory and resume card.
              </p>
              {photoError && <p className="text-label-sm text-status-rejected font-semibold" role="alert">{photoError}</p>}
            </div>
          </div>
        </div>

        {/* SECTION 2: BIOGRAPHY */}
        <div className="surface space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-label-lg font-bold text-ink font-heading">Personal Biography & Focus</label>
            <span
              className={`text-body-sm font-mono ${
                bio.length >= 280 ? 'text-status-rejected font-bold' : 'text-ink-muted'
              }`}
            >
              {bio.length}/300
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            rows={4}
            placeholder="Share a short introduction: your areas of interest, engineering goals, and technical passions..."
            className="textarea"
          />
          <p className="text-label-sm text-ink-muted">
            Keep it clear and professional. This appears on your showcase card in the student directory.
          </p>
        </div>

        {/* SECTION 3: TECHNICAL SKILLS */}
        <div className="surface space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-label-lg font-bold text-ink font-heading">Technical Skills & Stacks</h2>
              <p className="text-body-sm text-ink-secondary">Pick from common department skills or enter custom ones</p>
            </div>
            <span className="text-body-sm font-mono font-bold text-brand bg-brand-soft px-2.5 py-0.5 rounded-full border border-brand-soft-text/20">
              {skills.length} Selected
            </span>
          </div>

          {/* Current Skills Chips */}
          <div className="flex flex-wrap gap-2 min-h-[42px] p-3 rounded-lg bg-surface-sunken border border-edge">
            {skills.length === 0 ? (
              <span className="text-body-sm text-ink-muted italic">No skills selected yet. Select or type below.</span>
            ) : (
              skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface border border-edge text-body-sm font-bold text-ink shadow-card"
                >
                  <span>{s}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(s)}
                    className="p-0.5 text-ink-muted hover:text-status-rejected transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Custom Skill Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill(customSkill);
                }
              }}
              placeholder="Type a skill and press enter (e.g. Next.js, Kubernetes)"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={() => addSkill(customSkill)}
              disabled={!customSkill.trim()}
              className="btn btn-primary min-h-[44px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Suggestions */}
          <div className="space-y-2 pt-1">
            <span className="text-label-sm font-bold text-ink-muted uppercase tracking-wider">
              Quick Suggestions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SKILLS.filter((s) => !skills.includes(s)).slice(0, 14).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSkill(s)}
                  className="px-2.5 py-1 rounded-lg bg-surface-sunken border border-edge hover:border-brand hover:text-brand text-ink-secondary text-body-sm font-medium transition-colors cursor-pointer min-h-[44px]"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 4: PROFESSIONAL & REPOSITORY LINKS */}
        <div className="surface space-y-4">
          <h2 className="text-label-lg font-bold text-ink font-heading">Professional & Social Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-label-sm font-bold text-ink-secondary flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-ink-secondary" />
                <span>GitHub URL</span>
              </label>
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                onBlur={(e) => setGithubUrl(applyLink('github', e.target.value))}
                placeholder="jane, @jane or github.com/jane"
                className="input"
                aria-invalid={!!linkErrors.github}
                aria-describedby={linkErrors.github ? 'github-error' : undefined}
              />
              {linkErrors.github && (
                <span id="github-error" className="error-text" role="alert">{linkErrors.github}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-label-sm font-bold text-ink-secondary flex items-center gap-1.5">
                <Linkedin className="w-3.5 h-3.5 text-brand" />
                <span>LinkedIn URL</span>
              </label>
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                onBlur={(e) => setLinkedinUrl(applyLink('linkedin', e.target.value))}
                placeholder="jane, @jane or linkedin.com/in/jane"
                className="input"
                aria-invalid={!!linkErrors.linkedin}
                aria-describedby={linkErrors.linkedin ? 'linkedin-error' : undefined}
              />
              {linkErrors.linkedin && (
                <span id="linkedin-error" className="error-text" role="alert">{linkErrors.linkedin}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-label-sm font-bold text-ink-secondary flex items-center gap-1.5">
                <LeetCodeIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>LeetCode URL</span>
              </label>
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={leetcodeUrl}
                onChange={(e) => setLeetcodeUrl(e.target.value)}
                onBlur={(e) => setLeetcodeUrl(applyLink('leetcode', e.target.value))}
                placeholder="jane, @jane or leetcode.com/u/jane"
                className="input"
                aria-invalid={!!linkErrors.leetcode}
                aria-describedby={linkErrors.leetcode ? 'leetcode-error' : undefined}
              />
              {linkErrors.leetcode && (
                <span id="leetcode-error" className="error-text" role="alert">{linkErrors.leetcode}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-label-sm font-bold text-ink-secondary flex items-center gap-1.5">
                <CodeChefIcon className="w-3.5 h-3.5 text-amber-700" />
                <span>CodeChef URL</span>
              </label>
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={codechefUrl}
                onChange={(e) => setCodechefUrl(e.target.value)}
                onBlur={(e) => setCodechefUrl(applyLink('codechef', e.target.value))}
                placeholder="jane, @jane or codechef.com/users/jane"
                className="input"
                aria-invalid={!!linkErrors.codechef}
                aria-describedby={linkErrors.codechef ? 'codechef-error' : undefined}
              />
              {linkErrors.codechef && (
                <span id="codechef-error" className="error-text" role="alert">{linkErrors.codechef}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-label-sm font-bold text-ink-secondary flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-status-approved" />
                <span>Portfolio Website</span>
              </label>
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                onBlur={(e) => setPortfolioUrl(applyLink('portfolio', e.target.value))}
                placeholder="yourportfolio.dev or https://yourportfolio.dev"
                className="input"
                aria-invalid={!!linkErrors.portfolio}
                aria-describedby={linkErrors.portfolio ? 'portfolio-error' : undefined}
              />
              {linkErrors.portfolio && (
                <span id="portfolio-error" className="error-text" role="alert">{linkErrors.portfolio}</span>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5: READ-ONLY ACADEMIC RECORDS NOTICE */}
        <div className="surface-sunken p-6 text-body-sm text-ink-secondary space-y-3">
          <div className="flex items-center gap-2 font-bold text-ink font-heading">
            <GraduationCap className="w-4 h-4 text-brand" />
            <span>Academic Records Verification Notice</span>
          </div>
          <p className="leading-relaxed">
            Your legal name (<strong>{profile?.name}</strong>), Roll Number (<strong>{profile?.rollNo}</strong>), Year (
            <strong>Year {profile?.year}</strong>), Section (<strong>Sec {profile?.section}</strong>), and Department are
            officially bound to your college admission ledger. If any of these fields are misspelled or out of date, please
            submit a formal correction request from the Profile page.
          </p>
          <div>
            <Link
              to="/profile"
              className="inline-flex items-center gap-1 font-bold text-brand hover:text-brand-hover transition-colors"
            >
              <span>Go to Profile to Request Changes</span>
              <ShieldAlert className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* SAVE CTA */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/profile"
            className="btn btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary min-h-[44px]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Profile</span>
          </button>
        </div>
      </form>

      {/* PHOTO CROP & REPOSITION MODAL */}
      {isCropModalOpen && (
        <PhotoCropModal
          isOpen={isCropModalOpen}
          imageSrc={cropImageSrc}
          initialPosition={profile}
          onClose={handleCloseCropModal}
          onCropSave={handleCropSave}
          isSaving={uploadingPhoto}
        />
      )}
    </div>
  );
};

export default EditProfilePage;
