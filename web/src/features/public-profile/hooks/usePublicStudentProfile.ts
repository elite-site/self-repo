import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { publicProfileApi } from '../api';
import { PublicStudent } from '../types';
import { useToast } from '@/shared/ui/Toast';
import { safeUrl } from '@/shared/utils/safeUrl';
import { resolveMediaUrl } from '@/shared/api';

const PLACEHOLDER_REGEX = /fill personal data of yours/i;
const DEPARTMENT = 'Information Technology';

export const publicProfileKeys = {
  all: ['public-profile'] as const,
  byRollNo: (rollNo: string) => [...publicProfileKeys.all, rollNo] as const,
};

export function usePublicStudentProfile() {
  const { rollNo } = useParams<{ rollNo: string }>();
  const { toast } = useToast();

  const [imageError, setImageError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [rollNo]);

  const { data: student = null, isPending, isError, error: queryError, refetch } =
    useQuery<PublicStudent | null>({
      queryKey: publicProfileKeys.byRollNo(rollNo ?? ''),
      enabled: Boolean(rollNo),
      queryFn: async () => {
        if (!rollNo) return null;
        try {
          return await publicProfileApi.getPublicStudent(rollNo);
        } catch (err: any) {
          const status = err?.status ?? err?.response?.status;
          if (status === 404) {
            return null;
          }
          throw err;
        }
      },
      staleTime: 2 * 60_000,
    });

  const loading = Boolean(rollNo) && isPending && student === null;
  const error =
    isError && student === null
      ? (queryError as any)?.message || 'Could not load student profile. Please retry.'
      : null;

  const retry = useCallback(() => {
    if (!rollNo) return;
    void refetch();
  }, [rollNo, refetch]);

  useEffect(() => {
    if (loading) {
      document.title = 'Loading profile\u2026 — ELITE Portal';
    } else if (!student) {
      document.title = 'Profile not found — ELITE Portal';
    } else {
      document.title = `${student.name || rollNo} — ELITE Portal`;
    }
  }, [loading, student, rollNo]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);

      const sectionIds = ['home', 'about', 'skills', 'projects', 'education', 'contact'];
      const scrollPosition = window.scrollY + 120;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleShare = async () => {
    if (!navigator.clipboard?.writeText) {
      toast('Copy this page URL from your address bar to share.', { variant: 'info' });
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('Profile link copied to your clipboard.', { variant: 'success' });
    } catch {
      toast('Could not copy the link. Copy it from your address bar.', {
        variant: 'danger',
      });
    }
  };

  const name = student?.name || 'Student';
  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0] || 'Student';
  const restOfName = nameParts.slice(1).join(' ');

  const initials =
    nameParts
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('') || 'IT';

  const profile = student?.profile || {};
  const rawBio = profile.biography || profile.bio || '';
  const bio = PLACEHOLDER_REGEX.test(rawBio) ? '' : rawBio.trim();
  const rawSpecialQualities = profile.specialQualities || '';
  const specialQualities = PLACEHOLDER_REGEX.test(rawSpecialQualities) ? '' : rawSpecialQualities.trim();

  const githubSkills = student?.githubSkills || [];

  const manualProjects = (student?.projects || [])
    .filter((p) => (!p.status || p.status === 'APPROVED') && p.isPublic !== false)
    .map((p) => ({ ...p, source: 'MANUAL' as const }));
  const githubProjects = (student?.githubProjects || []).map((p) => ({ ...p, source: 'GITHUB' as const }));
  const allProjects = [...manualProjects, ...githubProjects];
  const achievements = student?.achievements || [];
  const certificates = student?.certificates || [];
  const resume = (student?.resumes || [])[0] || null;
  const hasResume = Boolean(resume);
  const introVideo = student?.introVideo || null;
  const photo = profile.viewUrl || profile.photoUrl;

  const rawResumeHref =
    resume?.viewUrl || resume?.fileUrl
      ? `${resolveMediaUrl(resume?.viewUrl || resume?.fileUrl || '')}${
          (resume?.viewUrl || resume?.fileUrl || '').includes('?') ? '&' : '?'
        }download=1`
      : null;
  const resumeDownloadHref = safeUrl(rawResumeHref) || null;

  return {
    student,
    loading,
    error,
    retry,
    name,
    firstName,
    restOfName,
    initials,
    profile,
    bio,
    specialQualities,
    githubSkills,
    allProjects,
    achievements,
    certificates,
    resume,
    hasResume,
    introVideo,
    photo,
    resumeDownloadHref,
    imageError,
    setImageError,
    mobileMenuOpen,
    setMobileMenuOpen,
    activeSection,
    showScrollTop,
    department: student?.branch || DEPARTMENT,
    handleShare,
  };
}
