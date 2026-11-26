import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { resumeApi } from '../api';
import { ResumeData } from '../types';
import { useToast } from '@/shared/ui/Toast';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

export const resumeKeys = {
  all: ['resume'] as const,
  detail: () => [...resumeKeys.all, 'detail'] as const,
};

export function useResume() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isPending, isError, refetch } = useQuery<ResumeData | null>({
    queryKey: resumeKeys.detail(),
    queryFn: async () => {
      const res = await resumeApi.getResume();
      if (Array.isArray(res)) {
        return res.length > 0 ? res[0] : null;
      }
      return res ?? null;
    },
    staleTime: 2 * 60_000,
  });

  const loadResume = useCallback(async () => {
    setActionError(null);
    await refetch();
  }, [refetch]);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete your resume?',
      description: 'Your uploaded resume will be removed from your profile. This cannot be undone.',
      confirmLabel: 'Delete resume',
      tone: 'danger',
    });
    if (!confirmed) return;
    setDeleting(true);
    setActionError(null);
    try {
      await resumeApi.deleteResume();
      queryClient.setQueryData<ResumeData | null>(resumeKeys.detail(), null);
      setUploadSuccess(false);
      void queryClient.invalidateQueries({ queryKey: resumeKeys.detail() });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      showToast('Resume deleted.');
    } catch (err: any) {
      const notice = err?.response?.data?.message || 'Could not delete your resume. Please try again.';
      setActionError(notice);
      showToast(notice, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setActionError('Choose a PDF file.');
      showToast('Choose a PDF file.', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setActionError('Resume file size must be under 10 MB.');
      showToast('Resume file size must be under 10 MB.', 'error');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setActionError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      await resumeApi.uploadResume(formData);
      setUploadSuccess(true);
      showToast('Resume uploaded successfully!');
      await refetch();
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err: any) {
      const notice = err?.response?.data?.message || 'Upload failed. Please try again.';
      setActionError(notice);
      showToast(notice, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return {
    resumeData: data ?? null,
    loading: isPending && data === undefined,
    uploading,
    deleting,
    error: actionError ?? (isError && data === undefined ? "Couldn't load your resume status." : null),
    uploadSuccess,
    fileInputRef,
    loadResume,
    handleDelete,
    handleFileSelect,
  };
}
