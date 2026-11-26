import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api';
import { profileKeys } from './useProfile';
import { StudentProfile } from '../types';
import type { SocialLinkKind } from '@/shared/utils/socialLinks';
import { compressImageToWebP } from '@/shared/utils/cropImage';
import { invalidateApiCache } from '@/shared/api';
import { SESSION_QUERY_KEY } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/ui/Toast';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

export function useEditProfile(onPhotoChangeProp?: (newUrl: string | null) => void) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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
  const hydratedFormRef = useRef(false);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const editProfileKey = [...profileKeys.all, 'edit'] as const;

  const { data: profile = null, isPending, isError } = useQuery<StudentProfile>({
    queryKey: editProfileKey,
    queryFn: () => profileApi.getProfile(),
    staleTime: 2 * 60_000,
  });

  useEffect(() => {
    if (!profile || hydratedFormRef.current) return;
    hydratedFormRef.current = true;
    setBio(profile.bio || '');
    setSpecialQualities(profile.specialQualities || '');
    setGithubUrl(profile.githubUrl || '');
    setLinkedinUrl(profile.linkedinUrl || '');
    setLeetcodeUrl(profile.leetcodeUrl || '');
    setCodechefUrl(profile.codechefUrl || '');
    setHackerrankUrl(profile.hackerrankUrl || '');
    setCodeforcesUrl(profile.codeforcesUrl || '');
    setPortfolioUrl(profile.portfolioUrl || '');
  }, [profile]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setActionError(null);
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
      queryClient.setQueryData<StudentProfile>(editProfileKey, updated);
      setSuccess(true);
      showToast('Profile updated successfully!');
      invalidateApiCache();
      void queryClient.invalidateQueries({ queryKey: profileKeys.overview() });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to update profile.');
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
        queryClient.setQueryData<StudentProfile>(editProfileKey, (prev) =>
          prev ? { ...prev, photoUrl: res.photoUrl } : prev,
        );
        if (onPhotoChangeProp) onPhotoChangeProp(res.photoUrl);
        showToast('Photo uploaded successfully!');
        invalidateApiCache();
        void queryClient.invalidateQueries({ queryKey: profileKeys.overview() });
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
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
      queryClient.setQueryData<StudentProfile>(editProfileKey, (prev) =>
        prev ? { ...prev, photoUrl: undefined } : prev,
      );
      if (onPhotoChangeProp) onPhotoChangeProp(null);
      showToast('Photo removed.');
      invalidateApiCache();
      void queryClient.invalidateQueries({ queryKey: profileKeys.overview() });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    } catch (err: any) {
      setPhotoError(err?.response?.data?.message || 'Failed to remove photo.');
    } finally {
      setRemovingPhoto(false);
    }
  };

  return {
    profile,
    loading: isPending && !profile,
    saving,
    uploadingPhoto,
    removingPhoto,
    photoError,
    error: actionError ?? (isError && !profile ? 'Could not load profile. Please refresh.' : null),
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
