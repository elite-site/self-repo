import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentsApi } from '../api/index';

export const getAdminStudentDetailKey = (studentId: string) =>
  ['admin', 'student', studentId] as const;

export const useStudentDetail = (studentId: string) => {
  const [toast, setToast] = useState<string | null>(null);

  // Modal states
  const [requestModal, setRequestModal] = useState<{
    open: boolean;
    type: string;
    itemId: string;
    title: string;
  } | null>(null);
  const [requestNote, setRequestNote] = useState('');

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    type: string;
    itemId: string;
    title: string;
  } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'media'>('overview');

  const query = useQuery<any | null>({
    queryKey: getAdminStudentDetailKey(studentId),
    queryFn: () => studentsApi.getStudent(studentId),
    enabled: Boolean(studentId),
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 6000);
  }, []);

  const loadStudent = useCallback(async () => {
    if (!studentId) return;
    await query.refetch();
  }, [studentId, query]);

  const student = query.data ?? null;
  const loading = Boolean(studentId) && query.isPending;
  const error = query.isError
    ? ((query.error as any)?.response?.data?.message || 'Could not load student profile.')
    : null;

  // Handle request change submit
  const handleRequestChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModal || !student) return;
    if (!requestNote.trim()) {
      showToast('Add a note explaining what to change.');
      return;
    }
    setActionLoading(true);
    try {
      await studentsApi.requestItemChange(
        student.id,
        requestModal.type,
        requestModal.itemId,
        requestNote.trim()
      );
      showToast('Change request sent.');
      setRequestModal(null);
      setRequestNote('');
      await loadStudent();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to request changes.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete submit
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModal || !student) return;
    setActionLoading(true);
    try {
      await studentsApi.deleteStudentItem(
        student.id,
        deleteModal.type,
        deleteModal.itemId,
        deleteReason.trim() || undefined
      );
      showToast('Item deleted.');
      setDeleteModal(null);
      setDeleteReason('');
      await loadStudent();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete item.');
    } finally {
      setActionLoading(false);
    }
  };

  const introVideo = student?.introVideos?.[0] || null;
  const resume = student?.resumes?.[0] || null;
  const achievements = student?.achievements || [];
  const certificates = student?.certificates || [];
  const projects = student?.projects || [];

  const pendingChanges: { type: string; title: string; note?: string }[] = [];
  if (introVideo?.status === 'CHANGES_REQUESTED') {
    pendingChanges.push({
      type: 'Introduction Video',
      title: 'Introduction Video',
      note: introVideo.reviewNote || introVideo.changeRequestNote || undefined,
    });
  }
  if (resume?.status === 'CHANGES_REQUESTED') {
    pendingChanges.push({
      type: 'Resume',
      title: resume.filename || 'Professional Resume',
      note: resume.reviewNote || undefined,
    });
  }
  achievements.forEach((a: any) => {
    if (a.status === 'CHANGES_REQUESTED') pendingChanges.push({ type: 'Achievement', title: a.title, note: a.reviewNote });
  });
  certificates.forEach((c: any) => {
    if (c.status === 'CHANGES_REQUESTED') pendingChanges.push({ type: 'Certificate', title: c.title, note: c.reviewNote });
  });
  projects.forEach((p: any) => {
    if (p.status === 'CHANGES_REQUESTED') pendingChanges.push({ type: 'Project', title: p.title, note: p.reviewNote });
  });

  const openRequestModal = (type: string, itemId: string, title: string) => {
    setRequestModal({ open: true, type, itemId, title });
    setRequestNote('');
  };

  const openDeleteModal = (type: string, itemId: string, title: string) => {
    setDeleteModal({ open: true, type, itemId, title });
    setDeleteReason('');
  };

  return {
    student,
    introVideo,
    resume,
    achievements,
    certificates,
    projects,
    pendingChanges,
    loading,
    error,
    toast,
    setToast,
    showToast,
    requestModal,
    setRequestModal,
    requestNote,
    setRequestNote,
    deleteModal,
    setDeleteModal,
    deleteReason,
    setDeleteReason,
    openRequestModal,
    openDeleteModal,
    actionLoading,
    activeTab,
    setActiveTab,
    loadStudent,
    handleRequestChangeSubmit,
    handleDeleteSubmit,
  };
};
