import { useState, useEffect, useRef, useCallback } from 'react';
import { profileApi } from '../api';
import { StudentProfile } from '../types';
import type { SocialLinkKind } from '@/shared/utils/socialLinks';
import { compressImageToWebP } from '@/shared/utils/cropImage';
import { invalidateApiCache } from '@/shared/api';
import { useToast } from '@/shared/ui/Toast';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

export function useEditProfile(onPhotoChangeProp?: (newUrl: string | null) => void) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [skillError, setSkillError] = useState<string | null>(null);

  const [bio, setBio] = useState('');
  const [specialQualities, setSpecialQualities] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [leetcodeUrl, setLeetcodeUrl] = useState('');
  const [codechefUrl, setCodechefUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [linkErrors] = useState<Partial<Record<SocialLinkKind, string>>>({});

  // Crop state
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await profileApi.getProfile();
      setProfile(data);
      setBio(data.bio || '');
      setSpecialQualities(data.specialQualities || '');
      const rawSkills = (data.skills || []).map((s: any) => typeof s === 'string' ? s : s.skill?.name || s.name).filter(Boolean);
      setSkills(rawSkills);
      setGithubUrl(data.githubUrl || '');
      setLinkedinUrl(data.linkedinUrl || '');
      setLeetcodeUrl(data.leetcodeUrl || '');
      setCodechefUrl(data.codechefUrl || '');
      setPortfolioUrl(data.portfolioUrl || '');
    } catch {
      setError('Could not load profile. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const addSkill = (nameToAdd?: string) => {
    const value = nameToAdd !== undefined ? nameToAdd : skillInput;
    const trimmed = value.trim();
    if (!trimmed) return;

    if (trimmed.length < 1 || trimmed.length > 30) {
      setSkillError('Skill must be between 1 and 30 characters');
      return;
    }

    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillError(`"${trimmed}" is already added`);
      return;
    }

    if (skills.length >= 10) {
      setSkillError('Maximum 10 skills reached');
      return;
    }

    setSkills((prev) => [...prev, trimmed]);
    setSkillInput('');
    setSkillError(null);
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
    setSkillError(null);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (skills.length < 2) {
      setSkillError('Add at least 2 skills');
      setError('Add at least 2 skills');
      return;
    }

    setSaving(true);
    setError(null);
    setSkillError(null);
    setSuccess(false);

    try {
      const [updated] = await Promise.all([
        profileApi.updateProfile({
          bio,
          specialQualities,
          githubUrl: githubUrl.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          leetcodeUrl: leetcodeUrl.trim() || undefined,
          codechefUrl: codechefUrl.trim() || undefined,
          portfolioUrl: portfolioUrl.trim() || undefined,
        }),
        profileApi.updateSkills(skills),
      ]);
      setProfile((prev) => (prev ? { ...prev, ...updated, skills } : null));
      setSuccess(true);
      showToast('Profile updated successfully!');
      invalidateApiCache();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update profile.');
      showToast('Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file.');
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const objUrl = URL.createObjectURL(file);
    objectUrlRef.current = objUrl;
    setCropImageSrc(objUrl);
    setIsCropModalOpen(true);
    setPhotoError(null);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsCropModalOpen(false);
    setUploadingPhoto(true);
    setPhotoError(null);

    try {
      const webpBlob = await compressImageToWebP(croppedBlob);
      const formData = new FormData();
      formData.append('photo', webpBlob, 'profile.webp');

      const res = await profileApi.uploadProfilePhoto(formData);
      if (res.photoUrl) {
        setProfile((prev) => (prev ? { ...prev, photoUrl: res.photoUrl } : null));
        if (onPhotoChangeProp) onPhotoChangeProp(res.photoUrl);
        showToast('Photo uploaded successfully!');
        invalidateApiCache();
      }
    } catch (err: any) {
      setPhotoError(err?.response?.data?.message || 'Failed to upload photo.');
      showToast('Failed to upload photo.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    const confirmed = await confirm({
      title: 'Remove profile photo?',
      description: 'Your photo will be deleted and your initials will be displayed instead.',
      confirmLabel: 'Remove photo',
      tone: 'danger',
    });
    if (!confirmed) return;

    setRemovingPhoto(true);
    setPhotoError(null);
    try {
      await profileApi.deleteProfilePhoto();
      setProfile((prev) => (prev ? { ...prev, photoUrl: undefined } : null));
      if (onPhotoChangeProp) onPhotoChangeProp(null);
      showToast('Photo removed.');
      invalidateApiCache();
    } catch (err: any) {
      setPhotoError(err?.response?.data?.message || 'Failed to remove photo.');
    } finally {
      setRemovingPhoto(false);
    }
  };

  return {
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
    setSkills,
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
    linkErrors,
    fileInputRef,
    isCropModalOpen,
    setIsCropModalOpen,
    cropImageSrc,
    handleSave,
    handlePhotoSelect,
    handleCropComplete,
    handleRemovePhoto,
  };
}
