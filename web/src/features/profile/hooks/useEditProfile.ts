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

  const [bio, setBio] = useState('');
  const [specialQualities, setSpecialQualities] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [leetcodeUrl, setLeetcodeUrl] = useState('');
  const [codechefUrl, setCodechefUrl] = useState('');
  const [hackerrankUrl, setHackerrankUrl] = useState('');
  const [codeforcesUrl, setCodeforcesUrl] = useState('');
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
      setGithubUrl(data.githubUrl || '');
      setLinkedinUrl(data.linkedinUrl || '');
      setLeetcodeUrl(data.leetcodeUrl || '');
      setCodechefUrl(data.codechefUrl || '');
      setHackerrankUrl(data.hackerrankUrl || '');
      setCodeforcesUrl(data.codeforcesUrl || '');
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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updated = await profileApi.updateProfile({
        bio,
        specialQualities,
        githubUrl: githubUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        leetcodeUrl: leetcodeUrl.trim() || undefined,
        codechefUrl: codechefUrl.trim() || undefined,
        hackerrankUrl: hackerrankUrl.trim() || undefined,
        codeforcesUrl: codeforcesUrl.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
      });
      setProfile(updated);
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
