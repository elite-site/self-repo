import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { api, resolveMediaUrl } from '../../services/api';
import { StudentSession } from '../../types';
import { useToast } from '../../components/Toast';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { selectVariantsByName } from '../../lib/motion';
import { getPhotoStyle } from '../../utils/photoStyle';
import { safeUrl } from '../../utils/safeUrl';
import { LeetCodeIcon, CodeChefIcon } from '../../components/icons/PlatformIcons';
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  ArrowLeft,
  Github,
  Linkedin,
  Globe,
  FileText,
  ShieldCheck,
  ExternalLink,
  Video as VideoIcon,
  Trophy,
  FolderGit2,
  Award,
  Share2,
  Printer,
  Mail,
  MapPin,
  GraduationCap,
  Sparkles,
  Menu,
  X,
  ChevronUp,
  Code2,
  CheckCircle2,
} from 'lucide-react';

interface PublicProfileProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

interface PublicProfileSkill {
  skill?: { name?: string | null } | null;
  name?: string | null;
}

interface PublicProfileFields {
  biography?: string | null;
  bio?: string | null;
  skills?: Array<PublicProfileSkill | string> | null;
  photoUrl?: string | null;
  viewUrl?: string | null;
  photoOffsetX?: number | null;
  photoOffsetY?: number | null;
  photoZoom?: number | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  leetcodeUrl?: string | null;
  codechefUrl?: string | null;
  portfolioUrl?: string | null;
  specialQualities?: string | null;
}

interface PublicProject {
  id: string;
  title: string;
  description?: string | null;
  techStack?: string[] | null;
  githubUrl?: string | null;
  videoUrl?: string | null;
}

interface PublicAchievement {
  id: string;
  title: string;
  description?: string | null;
  organization?: string | null;
  date?: string | null;
}

interface PublicCertificate {
  id: string;
  title: string;
  issuer?: string | null;
  issueDate?: string | null;
  viewUrl?: string | null;
  fileUrl?: string | null;
}

interface PublicResume {
  id: string;
  filename?: string | null;
  sizeMb?: number | null;
  viewUrl?: string | null;
  fileUrl?: string | null;
}

interface PublicIntroVideo {
  streamUrl?: string | null;
  thumbnailUrl?: string | null;
  driveFileId?: string | null;
  previewUrl?: string | null;
}

interface PublicStudent {
  name?: string | null;
  rollNo?: string | null;
  year?: number | null;
  section?: string | null;
  status?: string | null;
  branch?: string | null;
  email?: string | null;
  profile?: PublicProfileFields | null;
  projects?: PublicProject[] | null;
  achievements?: PublicAchievement[] | null;
  certificates?: PublicCertificate[] | null;
  resumes?: PublicResume[] | null;
  introVideo?: PublicIntroVideo | null;
}

const DEPARTMENT = 'Information Technology';

function taglineOf(bio: string): string {
  const firstLine = bio.split('\n')[0] ?? '';
  const sentence = firstLine.match(/^.*?[.!?](\s|$)/)?.[0]?.trim();
  const candidate = sentence || firstLine.trim();
  return candidate.length > 180 ? `${candidate.slice(0, 177).trimEnd()}…` : candidate;
}

export const PublicStudentProfilePage: React.FC<PublicProfileProps> = () => {
  const { rollNo } = useParams<{ rollNo: string }>();
  const { toast } = useToast();
  const shouldReduce = useReducedMotion();
  const reveal = selectVariantsByName(shouldReduce, 'scrollReveal');

  const [student, setStudent] = useState<PublicStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [rollNo]);

  useEffect(() => {
    if (!rollNo) return;
    setLoading(true);
    api
      .getPublicStudent(rollNo)
      .then((data) => setStudent(data as PublicStudent))
      .catch(() => setStudent(null))
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

  // Track active section and scroll top visibility
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

  // Close mobile menu on Escape
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

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
    { id: 'education', label: 'Education' },
    { id: 'contact', label: 'Contact' },
  ];

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#070B16] text-slate-100 flex flex-col">
        <header className="sticky top-0 z-50 h-16 border-b border-slate-800/80 bg-[#070B16]/80 backdrop-blur-md px-6 flex items-center justify-between">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <div className="hidden md:flex gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </header>

        <main className="mx-auto max-w-[1200px] w-full px-6 py-12 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-12 w-64 max-w-full rounded-lg" />
              <Skeleton className="h-5 w-48" />
              <SkeletonText lines={3} />
            </div>
            <div className="lg:col-span-4 flex justify-center">
              <Skeleton className="size-44 rounded-full" />
            </div>
            <div className="lg:col-span-3">
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-[100dvh] bg-[#070B16] text-slate-100 flex flex-col justify-center items-center px-4">
        <h1 className="sr-only">Profile not found</h1>
        <div className="max-w-md w-full text-center space-y-6">
          <EmptyState
            icon={ShieldCheck}
            title="Profile not found"
            description="That roll number is not on the department roster, or the profile is no longer public."
            action={
              <Link
                to="/students"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-sm font-semibold text-white shadow-md hover:from-rose-600 hover:to-pink-600 transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Back to Directory</span>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const name = student.name || 'Student';
  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0] || 'Student';
  const restOfName = nameParts.slice(1).join(' ');

  const initials = nameParts
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'IT';

  const profile = student.profile || {};
  const skillsList = profile.skills || [];
  const projects = student.projects || [];
  const achievements = student.achievements || [];
  const certificates = student.certificates || [];
  const resume = (student.resumes || [])[0] || null;
  const hasResume = Boolean(resume);
  const introVideo = student.introVideo || null;
  const bio = profile.biography || profile.bio || '';
  const photo = profile.viewUrl || profile.photoUrl;

  const rawResumeHref = resume?.viewUrl || resume?.fileUrl ? `${resolveMediaUrl(resume?.viewUrl || resume?.fileUrl || '')}${
    (resume?.viewUrl || resume?.fileUrl || '').includes('?') ? '&' : '?'
  }download=1` : null;
  const resumeDownloadHref = safeUrl(rawResumeHref) || null;

  const currentYearNum = student.year || 1;

  return (
    <div className="min-h-[100dvh] bg-[#070B16] text-slate-100 font-sans selection:bg-rose-500 selection:text-white antialiased overflow-x-clip scroll-smooth print:bg-white print:text-black">
      {/* Print stylesheet to ensure all dark-styled elements print dark text on white */}
      <style>{`
        @media print {
          *, *::before, *::after {
            color: #0f172a !important;
            background-color: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
            border-color: #cbd5e1 !important;
          }
        }
      `}</style>
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(225,29,72,0.14),rgba(255,255,255,0))] print:hidden" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_80%_100%,rgba(59,130,246,0.08),rgba(0,0,0,0))] print:hidden" />

      {/* ── 1. STICKY NAVBAR ────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#070B16]/80 border-b border-slate-800/80 transition-all duration-200 print:hidden">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Directory Link + Personal Logo Mark */}
          <div className="flex items-center gap-3">
            <Link
              to="/students"
              className="group inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors py-2 px-2.5 rounded-lg hover:bg-slate-800/60"
              title="Return to Student Directory"
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">Directory</span>
            </Link>

            <div className="h-4 w-px bg-slate-800 hidden sm:block" />

            <a href="#home" className="flex items-center gap-2.5 min-h-[44px]">
              <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-tr from-rose-500 to-pink-500 font-heading text-xs font-black text-white shadow-sm">
                {initials}
              </span>
              <span className="font-heading text-sm font-bold text-white tracking-tight hidden md:inline">
                {name}
              </span>
            </a>
          </div>

          {/* Center: Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 rounded-full border border-slate-800/80 bg-slate-900/60 p-1 backdrop-blur-md">
            {navLinks.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeSection === item.id
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[44px] items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-800/80 bg-slate-900/60 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Save PDF / Print"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Save PDF</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex min-h-[44px] items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-800/80 bg-slate-900/60 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Share portfolio"
            >
              <Share2 size={15} />
              <span className="hidden sm:inline">Share</span>
            </button>

            {hasResume && resumeDownloadHref && (
              <a
                href={resumeDownloadHref}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:from-rose-600 hover:to-pink-600 transition-all"
              >
                <FileText size={14} />
                <span>Resume</span>
              </a>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div id="mobile-nav-menu" className="lg:hidden border-b border-slate-800 bg-[#070B16]/95 backdrop-blur-xl px-4 py-4 space-y-1">
            {navLinks.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`block min-h-[44px] flex items-center px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeSection === item.id
                    ? 'bg-rose-500/15 text-rose-300'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {item.label}
              </a>
            ))}
            {hasResume && resumeDownloadHref && (
              <div className="pt-2 border-t border-slate-800/80">
                <a
                  href={resumeDownloadHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-xs font-semibold text-white"
                >
                  <FileText size={15} />
                  <span>Download Resume PDF</span>
                </a>
              </div>
            )}
          </div>
        )}
      </nav>

      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 space-y-14 sm:space-y-20 pb-20 print:p-0 print:space-y-8">
        {/* ── 2. HERO SECTION ───────────────────────────────────────────── */}
        <section id="home" className="scroll-mt-24 pt-6 sm:pt-12 lg:pt-14 print:pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Content */}
            <div className="lg:col-span-5 text-center lg:text-left order-2 lg:order-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300">
                <span>Hello, I'm 👋</span>
              </span>

              <h1 className="mt-3 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                {firstName}{' '}
                <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-300 bg-clip-text text-transparent">
                  {restOfName}
                </span>
              </h1>

              <p className="mt-2 text-base sm:text-lg font-medium text-rose-400">
                {student.branch || DEPARTMENT} Student
              </p>

              {bio ? (
                <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-prose mx-auto lg:mx-0">
                  {taglineOf(bio)}
                </p>
              ) : null}

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <a
                  href="#contact"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-rose-950/40 hover:from-rose-600 hover:to-pink-600 transition-all duration-200"
                >
                  <Mail size={15} />
                  <span>Contact Me</span>
                </a>

                {hasResume && resumeDownloadHref && (
                  <a
                    href={resumeDownloadHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <FileText size={15} />
                    <span>Download Resume</span>
                  </a>
                )}
              </div>

              {/* Social Links Row */}
              <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                {safeUrl(profile.githubUrl) && (
                  <a
                    href={safeUrl(profile.githubUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
                    title="GitHub"
                  >
                    <Github size={16} />
                  </a>
                )}
                {safeUrl(profile.linkedinUrl) && (
                  <a
                    href={safeUrl(profile.linkedinUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
                    title="LinkedIn"
                  >
                    <Linkedin size={16} />
                  </a>
                )}
                {safeUrl(profile.leetcodeUrl) && (
                  <a
                    href={safeUrl(profile.leetcodeUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-amber-400 transition-colors"
                    title="LeetCode"
                  >
                    <LeetCodeIcon className="size-4 text-amber-500" />
                  </a>
                )}
                {safeUrl(profile.codechefUrl) && (
                  <a
                    href={safeUrl(profile.codechefUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-amber-600 transition-colors"
                    title="CodeChef"
                  >
                    <CodeChefIcon className="size-4 text-amber-600" />
                  </a>
                )}
                {safeUrl(profile.portfolioUrl) && (
                  <a
                    href={safeUrl(profile.portfolioUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
                    title="Personal Website"
                  >
                    <Globe size={16} />
                  </a>
                )}
                {student.email && safeUrl(`mailto:${student.email}`) && (
                  <a
                    href={safeUrl(`mailto:${student.email}`)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
                    title="Email"
                  >
                    <Mail size={16} />
                  </a>
                )}
              </div>
            </div>

            {/* Center Profile Image */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center order-1 lg:order-2">
              <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-500 shadow-xl shadow-rose-950/30">
                <div className="relative size-36 sm:size-44 lg:size-48 rounded-full overflow-hidden bg-slate-950 border-4 border-[#070B16]">
                  {photo && !imageError ? (
                    <img
                      src={resolveMediaUrl(photo)}
                      alt={`${name}'s profile photo`}
                      style={getPhotoStyle(profile)}
                      onError={() => setImageError(true)}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center bg-slate-900 text-rose-400 font-heading text-3xl font-black">
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 backdrop-blur-sm">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{student.status === 'GRADUATED' ? 'Alumni' : 'Active Student'}</span>
              </div>
            </div>

            {/* Right Information Card */}
            <div className="lg:col-span-3 order-3">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-md shadow-lg space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Student Profile</span>
                  <span className="font-mono text-xs font-semibold text-rose-400">{student.rollNo}</span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Academic Year</span>
                  <p className="text-sm font-bold text-white mt-0.5">Year {student.year || 1} (Section {student.section || 'A'})</p>
                </div>

                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Department</span>
                  <p className="text-sm font-bold text-white mt-0.5">{student.branch || DEPARTMENT}</p>
                </div>

                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Institution</span>
                  <p className="text-xs font-medium text-slate-300 mt-0.5 leading-snug">SASI Institute of Technology & Engineering</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. ABOUT + INTRODUCTION VIDEO ─────────────────────────────── */}
        <section id="about" className="scroll-mt-24 pt-6">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Overview</span>
            <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">About & Introduction</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: About Me & Features */}
            <div className="lg:col-span-6 space-y-6">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm space-y-3">
                <h3 className="font-heading text-base font-bold text-white">About Me</h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line">
                  {bio || <span className="text-slate-500 italic">No biography provided yet.</span>}
                </p>
              </div>

              {/* Special Qualities */}
              {profile.specialQualities ? (
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">Special Qualities</h4>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{profile.specialQualities}</p>
                </div>
              ) : null}
            </div>

            {/* Right: Introduction Video Player */}
            <div className="lg:col-span-6 print:hidden">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <VideoIcon size={18} className="text-rose-400" />
                    <h3 className="font-heading text-base font-bold text-white">Introduction Video</h3>
                  </div>
                  <span className="text-xs text-slate-400">Department Verified Recording</span>
                </div>

                {introVideo?.streamUrl ? (
                  <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 aspect-[4/3] min-h-[240px] sm:aspect-video sm:min-h-0 shadow-md">
                    {introVideo.driveFileId && !introVideo.driveFileId.startsWith('mock_') ? (
                      <iframe
                        src={`https://drive.google.com/file/d/${introVideo.driveFileId}/preview`}
                        allow="autoplay; fullscreen"
                        className="w-full h-full border-0 rounded-xl"
                        title={`${name}'s introduction video`}
                      />
                    ) : (
                      <video
                        src={resolveMediaUrl(introVideo.streamUrl)}
                        poster={introVideo.thumbnailUrl ? resolveMediaUrl(introVideo.thumbnailUrl) : undefined}
                        controls
                        controlsList="nodownload"
                        onContextMenu={(e) => e.preventDefault()}
                        preload="metadata"
                        playsInline
                        aria-label={`${name}'s introduction video`}
                        className="w-full h-full object-contain"
                      >
                        Your browser does not support video playback.
                      </video>
                    )}
                  </div>
                ) : (
                  <div className="py-12 px-4 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/60 space-y-2">
                    <VideoIcon size={28} className="text-slate-600 mx-auto" />
                    <h4 className="text-xs font-semibold text-slate-300">No introduction video published yet</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      A video preview appears here once faculty approve it.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. SKILLS & TECHNOLOGIES ─────────────────────────────────── */}
        <section id="skills" className="scroll-mt-24 pt-6">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Expertise</span>
            <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">Skills & Technologies</h2>
          </div>

          {skillsList.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {skillsList.map((entry, index) => {
                const label =
                  typeof entry === 'string'
                    ? entry
                    : entry.skill?.name || entry.name || '';
                if (!label) return null;
                return (
                  <span
                    key={`${label}-${index}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-200 shadow-sm hover:border-rose-500/50 hover:bg-slate-800/80 hover:-translate-y-0.5 transition-all duration-200 cursor-default"
                  >
                    <Code2 size={14} className="text-rose-400 shrink-0" />
                    <span>{label}</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-xs">
              No technical skills listed yet.
            </div>
          )}
        </section>

        {/* ── 5. PROJECTS ──────────────────────────────────────────────── */}
        <section id="projects" className="scroll-mt-24 pt-6">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Work & Creations</span>
            <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">Featured Projects</h2>
          </div>

          {projects.length > 0 ? (
            <div className="flex flex-wrap gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex-1 min-w-[min(16rem,100%)] max-w-full md:max-w-[calc(50%-12px)] lg:max-w-[calc(33.333%-16px)] rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm hover:border-rose-500/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between shadow-sm print:break-inside-avoid print:border-slate-300"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                        <FolderGit2 size={18} />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-heading text-base font-bold text-white tracking-tight line-clamp-1">
                        {project.title}
                      </h3>
                      {project.description && (
                        <p className="mt-1.5 text-xs text-slate-400 leading-relaxed line-clamp-3">
                          {project.description}
                        </p>
                      )}
                    </div>

                    {project.techStack && project.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {project.techStack.map((tech) => (
                          <span
                            key={tech}
                            className="text-xs font-semibold px-2 py-0.5 rounded-md border border-slate-800 bg-slate-950/80 text-slate-300"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {(safeUrl(project.githubUrl) || safeUrl(project.videoUrl)) && (
                    <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-3">
                      {safeUrl(project.githubUrl) && (
                        <a
                          href={safeUrl(project.githubUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[44px] items-center gap-1.5 py-2 px-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <Github size={13} />
                          <span>Source</span>
                        </a>
                      )}
                      {safeUrl(project.videoUrl) && (
                        <a
                          href={safeUrl(project.videoUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[44px] items-center gap-1.5 py-2 px-1 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                        >
                          <ExternalLink size={13} />
                          <span>Live Demo</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-xs">
              No portfolio projects published yet.
            </div>
          )}
        </section>

        {/* ── 6. EDUCATION & TIMELINE ──────────────────────────────────── */}
        <section id="education" className="scroll-mt-24 pt-6">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Background</span>
            <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">Education & Timeline</h2>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-500/20 to-pink-500/20 text-rose-400 border border-rose-500/30">
                  <GraduationCap size={22} />
                </div>
                <div>
                  <h3 className="font-heading text-base sm:text-lg font-bold text-white">
                    Bachelor of Technology in {student.branch || DEPARTMENT}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sasi Institute of Technology and Engineering, Tadepalligudem
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3.5">
                <span className="text-slate-400 uppercase font-semibold text-xs tracking-wider">Current Year</span>
                <p className="text-sm font-bold text-white mt-1">Year {student.year || 1} (Section {student.section || 'A'})</p>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3.5">
                <span className="text-slate-400 uppercase font-semibold text-xs tracking-wider">Department</span>
                <p className="text-sm font-bold text-white mt-1">{student.branch || DEPARTMENT}</p>
              </div>
            </div>
          </div>

          {/* Achievements & Certificates sub-grid if student has any */}
          {(achievements.length > 0 || certificates.length > 0) && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {achievements.length > 0 && (
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Trophy size={18} className="text-amber-400" />
                    <h3 className="font-heading text-sm font-bold text-white">Honors & Achievements</h3>
                  </div>
                  <div className="space-y-2.5">
                    {achievements.map((ach) => (
                      <div key={ach.id} className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white">{ach.title}</h4>
                          {ach.organization && <p className="text-xs text-slate-400">{ach.organization}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {certificates.length > 0 && (
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-rose-400" />
                    <h3 className="font-heading text-sm font-bold text-white">Certificates</h3>
                  </div>
                  <div className="space-y-2.5">
                    {certificates.map((cert) => (
                      <div key={cert.id} className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white">{cert.title}</h4>
                          {cert.issuer && <p className="text-xs text-slate-400">{cert.issuer}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── 7. CONTACT SECTION ───────────────────────────────────────── */}
        <section id="contact" className="scroll-mt-24 pt-6">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Connect</span>
            <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">Get In Touch</h2>
            <p className="mt-1 text-sm text-slate-400">
              Open to career opportunities, collaborations, and discussions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Email Card */}
            {student.email && safeUrl(`mailto:${student.email}`) ? (
              <a
                href={safeUrl(`mailto:${student.email}`)}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm hover:border-rose-500/40 hover:-translate-y-0.5 transition-all block space-y-2 group"
              >
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 w-fit group-hover:bg-rose-500/20 transition-colors">
                  <Mail size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</span>
                  <p className="text-xs font-semibold text-white truncate mt-0.5">
                    {student.email}
                  </p>
                </div>
              </a>
            ) : (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm space-y-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 w-fit">
                  <Mail size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</span>
                  <p className="text-xs font-semibold text-white truncate mt-0.5">
                    {student.email || 'Contact via portal'}
                  </p>
                </div>
              </div>
            )}

            {/* LinkedIn Card */}
            {safeUrl(profile.linkedinUrl) ? (
              <a
                href={safeUrl(profile.linkedinUrl)}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm hover:border-rose-500/40 hover:-translate-y-0.5 transition-all block space-y-2 group"
              >
                <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 w-fit group-hover:bg-pink-500/20 transition-colors">
                  <Linkedin size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">LinkedIn</span>
                  <p className="text-xs font-semibold text-white truncate mt-0.5">
                    Connect on LinkedIn
                  </p>
                </div>
              </a>
            ) : (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm space-y-2">
                <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 w-fit">
                  <Linkedin size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">LinkedIn</span>
                  <p className="text-xs font-semibold text-white truncate mt-0.5">
                    Profile not linked
                  </p>
                </div>
              </div>
            )}

            {/* GitHub Card */}
            {safeUrl(profile.githubUrl) ? (
              <a
                href={safeUrl(profile.githubUrl)}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm hover:border-rose-500/40 hover:-translate-y-0.5 transition-all block space-y-2 group"
              >
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit group-hover:bg-indigo-500/20 transition-colors">
                  <Github size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">GitHub</span>
                  <p className="text-xs font-semibold text-white truncate mt-0.5">
                    Explore Repositories
                  </p>
                </div>
              </a>
            ) : (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm space-y-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit">
                  <Github size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">GitHub</span>
                  <p className="text-xs font-semibold text-white truncate mt-0.5">
                    Profile not linked
                  </p>
                </div>
              </div>
            )}

            {/* Location Card */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm space-y-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                <MapPin size={18} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Campus Location</span>
                <p className="text-xs font-semibold text-white mt-0.5 leading-snug">
                  SASI Institute, Tadepalligudem
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── 8. COMPACT FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/80 py-8 text-xs text-slate-400 print:hidden">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {name}. All rights reserved.</p>
          <p className="text-slate-500">Built using modern web technologies · ELITE Portal</p>
        </div>
      </footer>

      {/* Floating Scroll to Top button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 min-h-[44px] min-w-[44px] flex items-center justify-center p-3 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-950/50 hover:bg-rose-600 transition-all duration-200 print:hidden"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
          aria-label="Scroll to top"
        >
          <ChevronUp size={18} />
        </button>
      )}
    </div>
  );
};

export default PublicStudentProfilePage;