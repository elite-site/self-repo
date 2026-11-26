import { useState, useEffect, useMemo, useCallback, type SetStateAction } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { moderationApi } from '../api/index';
import { githubApi } from '@/features/github/api/index';
import type { GithubShowcasedProject } from '@/features/github/types';
import { UnifiedModerationItem, ModerationType, TabType, StatusFilter } from '../types';

export const ADMIN_MODERATION_ITEMS_KEY = ['admin', 'moderation', 'items'] as const;
export const ADMIN_MODERATION_GITHUB_KEY = ['admin', 'moderation', 'github-projects'] as const;

export const useModeration = () => {
  const queryClient = useQueryClient();

  // Filters
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Selected Item for Unified Review
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, searchQuery]);

  // Independent queries settle in parallel so a GitHub showcase failure degrades
  // to a warning instead of blanking the moderation queue.
  const queueQuery = useQuery<UnifiedModerationItem[]>({
    queryKey: ADMIN_MODERATION_ITEMS_KEY,
    queryFn: async () => (await moderationApi.getModerationItems('all', 'ALL')).items ?? [],
    retry: false,
  });

  const projectsQuery = useQuery<GithubShowcasedProject[]>({
    queryKey: ADMIN_MODERATION_GITHUB_KEY,
    queryFn: async () => (await githubApi.getGithubShowcasedProjects()).items ?? [],
    retry: false,
  });

  useEffect(() => {
    if (projectsQuery.isError && queueQuery.isSuccess) {
      showToast("Couldn't load showcased projects. The moderation queue is still up to date.", 'error');
    }
  }, [projectsQuery.isError, queueQuery.isSuccess, showToast]);

  const items = queueQuery.data ?? [];
  const githubProjects = projectsQuery.data ?? [];
  const loading = queueQuery.isPending;
  const error = queueQuery.isError ? "Couldn't load the queue. Try again." : null;

  const setItems = useCallback(
    (updater: SetStateAction<UnifiedModerationItem[]>) => {
      queryClient.setQueryData<UnifiedModerationItem[]>(ADMIN_MODERATION_ITEMS_KEY, (prev = []) =>
        typeof updater === 'function' ? updater(prev) : updater,
      );
    },
    [queryClient],
  );

  const fetchItems = useCallback(async () => {
    await Promise.all([queueQuery.refetch(), projectsQuery.refetch()]);
  }, [queueQuery, projectsQuery]);

  // Compute counts per tab
  const counts = useMemo(() => {
    const map: Record<TabType, number> = {
      all: items.length,
      videos: 0,
      resumes: 0,
      certificates: 0,
      projects: 0,
      'github-projects': githubProjects.length,
      achievements: 0,
    };
    for (const item of items) {
      if (item.type === 'videos' || item.itemType === 'video') map.videos += 1;
      else if (item.type === 'resumes' || item.itemType === 'resume') map.resumes += 1;
      else if (item.type === 'certificates' || item.itemType === 'certificate') map.certificates += 1;
      else if (item.type === 'projects' || item.itemType === 'project') map.projects += 1;
      else if (item.type === 'achievements' || item.itemType === 'achievement') map.achievements += 1;
    }
    return map;
  }, [items, githubProjects]);

  // Filtered list
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTab === 'videos' && item.type !== 'videos' && item.itemType !== 'video') return false;
      if (activeTab === 'resumes' && item.type !== 'resumes' && item.itemType !== 'resume') return false;
      if (activeTab === 'certificates' && item.type !== 'certificates' && item.itemType !== 'certificate') return false;
      if (activeTab === 'projects' && item.type !== 'projects' && item.itemType !== 'project') return false;
      if (activeTab === 'achievements' && item.type !== 'achievements' && item.itemType !== 'achievement') return false;

      if (statusFilter === 'PENDING_REVIEW') {
        if (item.status !== 'PENDING' && item.status !== 'UNDER_REVIEW') return false;
      } else if (statusFilter === 'APPROVED') {
        if (item.status !== 'APPROVED') return false;
      } else if (statusFilter === 'CHANGES_REQUESTED') {
        if (item.status !== 'CHANGES_REQUESTED') return false;
      } else if (statusFilter === 'REJECTED') {
        if (item.status !== 'REJECTED') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.studentName?.toLowerCase().includes(q);
        const matchesRoll = item.studentRoll?.toLowerCase().includes(q);
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [items, activeTab, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find((i) => i.id === selectedItemId) ?? null;
  }, [items, selectedItemId]);

  const selectedIndex = useMemo(() => {
    if (!selectedItemId) return -1;
    return filteredItems.findIndex((i) => i.id === selectedItemId);
  }, [filteredItems, selectedItemId]);

  const typeKeyFor = useCallback((item: UnifiedModerationItem): ModerationType => {
    if (item.type) return item.type;
    return item.itemType === 'video' ? 'videos' :
      item.itemType === 'resume' ? 'resumes' :
      item.itemType === 'certificate' ? 'certificates' :
      item.itemType === 'project' ? 'projects' : 'achievements';
  }, []);

  const getDriveWatchUrl = useCallback((item: UnifiedModerationItem) => {
    const driveId = item.driveFileId || item.fileDriveId || item.proofDriveId;
    if (driveId && !driveId.startsWith('mock_') && !driveId.startsWith('drive_')) {
      return `https://drive.google.com/file/d/${driveId}/view?usp=sharing`;
    }
    return null;
  }, []);

  return {
    items,
    setItems,
    githubProjects,
    loading,
    error,
    activeTab,
    setActiveTab,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    PAGE_SIZE,
    totalPages,
    paginatedItems,
    filteredItems,
    counts,
    selectedItemId,
    setSelectedItemId,
    selectedItem,
    selectedIndex,
    toast,
    setToast,
    showToast,
    fetchItems,
    typeKeyFor,
    getDriveWatchUrl,
  };
};
