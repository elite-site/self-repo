import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link, useOutletContext } from 'react-router-dom';
import {
  User,
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
  Sparkles,
  Crop
} from 'lucide-react';
import { api, resolveMediaUrl } from '../services/api';
import { normalizeSocialLink, type SocialLinkKind } from '../utils/socialLinks';
import type { StudentOutletContext } from '../components/layout/StudentLayout';
import { StudentProfile } from '../types';
import { PhotoCropModal } from '../components/PhotoCropModal';
import { getPhotoStyle } from '../utils/photoStyle';

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
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [linkErrors, setLinkErrors] = useState<Partial<Record<SocialLinkKind, string>>>({});

  // Photo Crop & Reposition state
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

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
        setPortfolioUrl(data.portfolioUrl || '');
        setSkills(Array.isArray(data.skills) ? data.skills : []);
      })
      .catch(() => setError('Failed to load profile. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate original file: must be a supported image under 5MB
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPEG, PNG, WEBP).');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image must be under 5MB.');
      e.target.value = '';
      return;
    }

    setPhotoError(null);
    setUploadingPhoto(true);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await api.uploadProfilePhoto(formData);
      if (res.photoUrl) {
        setProfile((prev) => (prev ? { ...prev, photoUrl: res.photoUrl, photoOffsetX: 50, photoOffsetY: 50, photoZoom: 1 } : prev));
        onPhotoChange?.(res.photoUrl);
        setCropImageSrc(resolveMediaUrl(res.photoUrl));
        setIsCropModalOpen(true);
      } else {
        setPhotoError('The photo was uploaded but no image URL was returned. Please try again.');
      }
    } catch (err: any) {
      setPhotoError(err.response?.data?.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRepositionPhoto = () => {
    if (!profile?.photoUrl) return;
    setPhotoError(null);
    setCropImageSrc(resolveMediaUrl(profile.photoUrl));
    setIsCropModalOpen(true);
  };

  const handleCloseCropModal = () => {
    setIsCropModalOpen(false);
    setCropImageSrc(null);
  };

  const handleSavePosition = async (pos: { photoOffsetX: number; photoOffsetY: number; photoZoom: number }) => {
    setPhotoError(null);
    try {
      await api.updateProfile(pos);
      setProfile((prev) => (prev ? { ...prev, ...pos } : prev));
      setIsCropModalOpen(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save photo position.';
      setPhotoError(errorMsg);
      throw new Error(errorMsg);
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
          portfolioUrl: normalized.portfolio,
        }),
        api.updateSkills(skills),
      ]);
      setSuccess(true);
      setTimeout(() => {
        navigate('/profile');
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="h-10 bg-slate-200 rounded w-1/4"></div>
        <div className="h-64 bg-slate-200 rounded-2xl w-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER WITH BACK LINK */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0B192C]">Edit Student Profile</h1>
            <p className="text-xs text-neutral-500">Update your biography, technical stack, and social links</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/profile')}
          className="text-xs font-bold text-neutral-500 hover:text-[#0B192C] px-3 py-1.5 rounded-lg hover:bg-neutral-100"
        >
          Cancel
        </button>
      </div>

      {/* FEEDBACK BANNERS */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Profile saved successfully! Redirecting to profile...</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: PHOTO & AVATAR CARD */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-[#0B192C]">Profile Photo</h2>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group">
              {profile?.photoUrl ? (
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-neutral-200 shadow-sm">
                  <img
                    src={resolveMediaUrl(profile.photoUrl)}
                    alt={profile.name}
                    style={getPhotoStyle(profile)}
                  />
                  {!uploadingPhoto && (
                    <button
                      type="button"
                      onClick={handleRepositionPhoto}
                      title="Reposition Photo"
                      className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity cursor-pointer text-[11px] font-bold"
                    >
                      <Crop className="w-4 h-4" />
                      <span>Reposition</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-[#0B192C] text-white flex items-center justify-center font-black text-2xl shadow-sm">
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
                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center text-white">
                  <Loader2 className="w-6 h-6 animate-spin" />
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
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-[#0B192C] text-xs font-bold transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-neutral-600" />
                  <span>{uploadingPhoto ? 'Uploading...' : profile?.photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                {profile?.photoUrl && (
                  <button
                    type="button"
                    onClick={handleRepositionPhoto}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-[#0B192C] text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Crop className="w-4 h-4 text-[#DC2626]" />
                    <span>Reposition Photo</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                Recommended: Square image, max 5MB. Visible on public directory and resume card.
              </p>
              {photoError && <p className="text-[11px] text-red-600 font-semibold">{photoError}</p>}
            </div>
          </div>
        </div>

        {/* SECTION 2: BIOGRAPHY */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-[#0B192C]">Personal Biography & Focus</label>
            <span
              className={`text-xs font-mono ${
                bio.length >= 280 ? 'text-[#DC2626] font-bold' : 'text-neutral-400'
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
            className="w-full p-3 bg-neutral-50 border border-[#CBD5E1] rounded-xl text-xs text-[#0B192C] focus:outline-none focus:border-[#DC2626] focus:bg-white transition-all leading-relaxed"
          />
          <p className="text-[11px] text-neutral-400">
            Keep it clear and professional. This appears on your showcase card in the student directory.
          </p>
        </div>

        {/* SECTION 3: TECHNICAL SKILLS */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0B192C]">Technical Skills & Stacks</h2>
              <p className="text-xs text-neutral-500">Pick from common department skills or enter custom ones</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#DC2626] bg-red-50 px-2 py-0.5 rounded-full">
              {skills.length} Selected
            </span>
          </div>

          {/* Current Skills Chips */}
          <div className="flex flex-wrap gap-2 min-h-[42px] p-3 rounded-xl bg-neutral-50 border border-neutral-200">
            {skills.length === 0 ? (
              <span className="text-xs text-neutral-400 italic">No skills selected yet. Select or type below.</span>
            ) : (
              skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[#CBD5E1] text-xs font-bold text-[#0B192C] shadow-2xs"
                >
                  <span>{s}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(s)}
                    className="p-0.5 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
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
              className="flex-1 p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#DC2626]"
            />
            <button
              type="button"
              onClick={() => addSkill(customSkill)}
              disabled={!customSkill.trim()}
              className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 text-[#0B192C] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Suggestions */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Quick Suggestions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SKILLS.filter((s) => !skills.includes(s)).slice(0, 14).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSkill(s)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-red-50 hover:text-[#DC2626] text-neutral-600 text-xs font-medium transition-colors cursor-pointer"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 4: PROFESSIONAL & REPOSITORY LINKS */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-[#0B192C]">Professional & Social Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-neutral-500" />
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
                className="w-full p-2.5 bg-neutral-50 border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#DC2626] focus:bg-white"
              />
              {linkErrors.github && (
                <span className="text-[11px] text-[#DC2626]">{linkErrors.github}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                <Linkedin className="w-3.5 h-3.5 text-blue-600" />
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
                className="w-full p-2.5 bg-neutral-50 border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#DC2626] focus:bg-white"
              />
              {linkErrors.linkedin && (
                <span className="text-[11px] text-[#DC2626]">{linkErrors.linkedin}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
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
                className="w-full p-2.5 bg-neutral-50 border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#DC2626] focus:bg-white"
              />
              {linkErrors.portfolio && (
                <span className="text-[11px] text-[#DC2626]">{linkErrors.portfolio}</span>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5: READ-ONLY ACADEMIC RECORDS NOTICE */}
        <div className="bg-neutral-50 border border-[#E2E8F0] rounded-2xl p-6 text-xs text-neutral-600 space-y-3">
          <div className="flex items-center gap-2 font-bold text-[#0B192C]">
            <GraduationCap className="w-4 h-4 text-[#DC2626]" />
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
              className="inline-flex items-center gap-1 font-bold text-[#DC2626] hover:underline"
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
            className="px-5 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Profile</span>
          </button>
        </div>
      </form>

      {/* PHOTO CROP & REPOSITION MODAL */}
      <PhotoCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropImageSrc}
        initialPosition={profile}
        onClose={handleCloseCropModal}
        onSavePosition={handleSavePosition}
        isSaving={uploadingPhoto}
      />
    </div>
  );
};
