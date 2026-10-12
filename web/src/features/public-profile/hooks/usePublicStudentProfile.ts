import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicProfileApi } from '../api';
import { PublicStudent } from '../types';
import { useToast } from '@/shared/ui/Toast';
import { safeUrl } from '@/shared/utils/safeUrl';
import { resolveMediaUrl } from '@/shared/api';

const PLACEHOLDER_REGEX = /fill personal data of yours/i;
const DEPARTMENT = 'Information Technology';

export function usePublicStudentProfile() {
  const { rollNo } = useParams<{ rollNo: string }>();
  const { toast } = useToast();

  const [student, setStudent] = useState<PublicStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [rollNo]);

  const retry = () => {
    if (!rollNo) return;
    setLoading(true);
    setError(null);

    publicProfileApi
      .getPublicStudent(rollNo)
      .then((data) => {
        setStudent(data);
        setError(null);
        try {
          sessionStorage.setItem(`student_profile_${rollNo}`, JSON.stringify(data));
        } catch {
          // ignore
        }
      })
      .catch((err) => {
        const status = err?.status ?? err?.response?.status;
        if (status === 404) {
          setStudent(null);
          setError(null);
        } else {
          setStudent(null);
          setError(err?.message || 'Could not load student profile. Please retry.');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!rollNo) return;
    const cacheKey = `student_profile_${rollNo}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setStudent(parsed);
        setLoading(false);
      } catch {
        // invalid cache entry, proceed to fetch
      }
    } else {
      setLoading(true);
    }
    setError(null);

    publicProfileApi
      .getPublicStudent(rollNo)
      .then((data) => {
        setStudent(data);
        setError(null);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {
          // sessionStorage quota exceeded, safely ignore
        }
      })
      .catch((err) => {
        const status = err?.status ?? err?.response?.status;
        if (status === 404) {
          if (!cached) setStudent(null);
          setError(null);
        } else {
          if (!cached) {
            setStudent(null);
            setError(err?.message || 'Could not load student profile. Please retry.');
          }
        }
      })
      .finally(() => setLoading(false));
  }, [rollNo]);

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

  const profileSkills = (student?.profile?.skills || []).map((s: any) => typeof s === 'string' ? s : s.skill?.name || s.name).filter(Boolean);
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
    profileSkills,
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
