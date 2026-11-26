import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api';
import { StudentProfile } from '../types';
import { portfolioApi } from '@/features/portfolio/api';
import { resumeApi } from '@/features/resume/api';
import { Project, Certificate, Achievement, StudentIntroVideo, StudentPortfolioResponse } from '@/shared/types';
import { useToast } from '@/shared/ui/Toast';

export const profileKeys = {
  all: ['profile'] as const,
  overview: () => [...profileKeys.all, 'overview'] as const,
};

interface ProfileOverviewData {
  profile: StudentProfile;
  video: StudentIntroVideo | null;
  resume: any | null;
  projects: Project[];
  achievements: Achievement[];
  certificates: Certificate[];
  changeRequests: any[];
  portfolio: StudentPortfolioResponse | null;
}

async function fetchProfileOverview(): Promise<ProfileOverviewData> {
  const [pData, rResult, prResult, achResult, certResult, meResult, portResult] =
    await Promise.all([
      profileApi.getProfile(),
      resumeApi.getResume().catch(() => null),
      portfolioApi.getProjects().catch(() => []),
      portfolioApi.getAchievements().catch(() => []),
      portfolioApi.getCertificates().catch(() => []),
      profileApi.getMe().catch(() => null),
      portfolioApi.getStudentPortfolio().catch(() => null),
    ]);

  const resume = Array.isArray(rResult) ? (rResult.length > 0 ? rResult[0] : null) : rResult;
  const video = (meResult as any)?.student?.video ?? null;

  return {
    profile: pData,
    video,
    resume,
    projects: Array.isArray(prResult) ? prResult : [],
    achievements: Array.isArray(achResult) ? achResult : [],
    certificates: Array.isArray(certResult) ? certResult : [],
    changeRequests: Array.isArray((pData as any)?.changeRequests) ? (pData as any).changeRequests : [],
    portfolio: portResult,
  };
}

export function useProfile() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isPending, isError, refetch } = useQuery<ProfileOverviewData>({
    queryKey: profileKeys.overview(),
    queryFn: fetchProfileOverview,
    staleTime: 2 * 60_000,
  });

  // Change request modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [fieldName, setFieldName] = useState('name');
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  const fetchProfileData = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleSubmitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedValue.trim() || !reason.trim()) return;
    setSubmittingReq(true);
    setReqError(null);

    try {
      await profileApi.submitChangeRequest({
        fieldName,
        requestedValue: requestedValue.trim(),
        reason: reason.trim(),
      });
      setReqSuccess(true);
      showToast('Change request submitted for faculty review.');
      setTimeout(() => {
        setModalOpen(false);
        setRequestedValue('');
        setReason('');
        setReqSuccess(false);
        void queryClient.invalidateQueries({ queryKey: profileKeys.overview() });
      }, 1500);
    } catch (err: any) {
      setReqError(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmittingReq(false);
    }
  };

  return {
    profile: data?.profile ?? null,
    video: data?.video ?? null,
    resume: data?.resume ?? null,
    projects: data?.projects ?? [],
    achievements: data?.achievements ?? [],
    certificates: data?.certificates ?? [],
    changeRequests: data?.changeRequests ?? [],
    portfolio: data?.portfolio ?? null,
    loading: isPending && !data,
    error: isError && !data ? 'Could not load profile. Please refresh.' : null,
    modalOpen,
    setModalOpen,
    fieldName,
    setFieldName,
    requestedValue,
    setRequestedValue,
    reason,
    setReason,
    submittingReq,
    reqSuccess,
    reqError,
    fetchProfileData,
    handleSubmitChangeRequest,
  };
}
