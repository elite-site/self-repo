import { useState, useEffect, useCallback } from 'react';
import { profileApi } from '../api';
import { StudentProfile } from '../types';
import { portfolioApi } from '@/features/portfolio/api';
import { resumeApi } from '@/features/resume/api';
import { Project, Certificate, Achievement, StudentIntroVideo, StudentPortfolioResponse } from '@/shared/types';
import { useToast } from '@/shared/ui/Toast';

export function useProfile() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [video, setVideo] = useState<StudentIntroVideo | null>(null);
  const [resume, setResume] = useState<any | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<StudentPortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Change request modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [fieldName, setFieldName] = useState('name');
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [pResult, rResult, prResult, achResult, certResult, meResult, portResult] = await Promise.allSettled([
      profileApi.getProfile(),
      resumeApi.getResume(),
      portfolioApi.getProjects(),
      portfolioApi.getAchievements(),
      portfolioApi.getCertificates(),
      profileApi.getMe(),
      portfolioApi.getStudentPortfolio(),
    ]);

    if (pResult.status === 'fulfilled') {
      const pData = pResult.value;
      setProfile(pData);
      if ((pData as any).changeRequests) setChangeRequests((pData as any).changeRequests);
    } else {
      setError('Could not load profile. Please refresh.');
    }

    if (rResult.status === 'fulfilled') {
      const rData = rResult.value;
      setResume(Array.isArray(rData) ? (rData.length > 0 ? rData[0] : null) : rData);
    }

    if (prResult.status === 'fulfilled') {
      setProjects(Array.isArray(prResult.value) ? prResult.value : []);
    }

    if (achResult.status === 'fulfilled') {
      setAchievements(Array.isArray(achResult.value) ? achResult.value : []);
    }

    if (certResult.status === 'fulfilled') {
      setCertificates(Array.isArray(certResult.value) ? certResult.value : []);
    }

    if (meResult.status === 'fulfilled') {
      const meData = meResult.value as any;
      if (meData?.student?.video) {
        setVideo(meData.student.video);
      }
    }

    if (portResult.status === 'fulfilled') {
      setPortfolio(portResult.value);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

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
        fetchProfileData();
      }, 1500);
    } catch (err: any) {
      setReqError(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmittingReq(false);
    }
  };

  return {
    profile,
    video,
    resume,
    projects,
    achievements,
    certificates,
    changeRequests,
    portfolio,
    loading,
    error,
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
