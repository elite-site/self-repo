import { useState, useEffect, useRef, useCallback } from 'react';
import { resumeApi } from '../api';
import { ResumeData } from '../types';
import { useToast } from '@/shared/ui/Toast';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

export function useResume() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResume = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await resumeApi.getResume();
      if (Array.isArray(data)) {
        setResumeData(data.length > 0 ? data[0] : null);
      } else {
        setResumeData(data);
      }
    } catch {
      setError("Couldn't load your resume status.");
      showToast("Couldn't load your resume status.", 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadResume();
  }, [loadResume]);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete your resume?',
      description: 'Your uploaded resume will be removed from your profile. This cannot be undone.',
      confirmLabel: 'Delete resume',
      tone: 'danger',
    });
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await resumeApi.deleteResume();
      setResumeData(null);
      setUploadSuccess(false);
      await loadResume();
      showToast('Resume deleted.');
    } catch (err: any) {
      const notice = err?.response?.data?.message || 'Could not delete your resume. Please try again.';
      setError(notice);
      showToast(notice, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Choose a PDF file.');
      showToast('Choose a PDF file.', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Resume file size must be under 10 MB.');
      showToast('Resume file size must be under 10 MB.', 'error');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      await resumeApi.uploadResume(formData);
      setUploadSuccess(true);
      showToast('Resume uploaded successfully!');
      await loadResume();
    } catch (err: any) {
      const notice = err?.response?.data?.message || 'Upload failed. Please try again.';
      setError(notice);
      showToast(notice, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return {
    resumeData,
    loading,
    uploading,
    deleting,
    error,
    uploadSuccess,
    fileInputRef,
    loadResume,
    handleDelete,
    handleFileSelect,
  };
}
