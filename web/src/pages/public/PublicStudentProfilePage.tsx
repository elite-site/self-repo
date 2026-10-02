import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { api, resolveMediaUrl } from '../../services/api';
import { StudentSession } from '../../types';
import { useToast } from '../../components/Toast';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { selectVariantsByName } from '../../lib/motion';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { getPhotoStyle } from '../../utils/photoStyle';
import { LeetCodeIcon, CodeChefIcon } from '../../components/icons/PlatformIcons';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Tag } from '../../components/ui/Tag';
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
} from 'lucide-react';

interface PublicProfileProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

/* ── The shape this page reads ──────────────────────────────────────────────
 * Mirrors what `GET /api/public/students/:rollNo` already returns, and nothing
 * more: the public payload is the only thing on an unauthenticated page, so a
 * field that is not in this shape is a field the page must not ask for.
 */

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
  profile?: PublicProfileFields | null;
  projects?: PublicProject[] | null;
  achievements?: PublicAchievement[] | null;
  certificates?: PublicCertificate[] | null;
  resumes?: PublicResume[] | null;
  introVideo?: PublicIntroVideo | null;
}

/** Department is fixed on this portal; the public payload does not carry a branch. */
const DEPARTMENT = 'Information Technology';

/** A link opened off-site, rendered as a labelled icon button. */
const SocialLink: React.FC<{
  href: string;
  label: string;
  children: React.ReactNode;
  tone?: string;
}> = ({ href, label, children, tone = 'text-ink-secondary' }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    title={label}
    aria-label={label}
    className={`flex h-10 w-10 items-center justify-center rounded-lg border border-edge bg-surface transition-colors duration-fast hover:border-edge-strong hover:bg-surface-sunken ${tone}`}
  >
    {children}
  </a>
);

/**
 * The student's photo, or their initials.
 *
 * Deliberately not the `Avatar` primitive: that component owns its `<img>` and
 * cannot be handed a `style`, and the crop offsets below are a real feature —
 * a student positions their own photo in the editor and expects it to land
 * here exactly as they framed it. The initials fallback keeps the box the same
 * size either way, and the wrapper carries the accessible name so the image
 * itself can stay out of the a11y tree.
 */
const ProfilePhoto: React.FC<{
  name: string;
  photo?: string | null;
  profile: PublicProfileFields;
  imageFailed: boolean;
  onImageError: () => void;
  className?: string;
}> = ({ name, photo, profile, imageFailed, onImageError, className = '' }) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  return (
    <span
      role="img"
      aria-label={`${name}'s profile photo`}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-surface bg-brand font-heading text-headline-lg font-bold text-on-brand ${className}`}
    >
      {photo && !imageFailed ? (
        <img
          src={resolveMediaUrl(photo)}
          alt=""
          style={getPhotoStyle(profile)}
          onError={onImageError}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initials || 'IT'}</span>
      )}
    </span>
  );
};

/**
 * One §6.3 section: a heading, an optional trailing action, and the body.
 * `h2` under the profile's `h1`, which is the hierarchy §6.3's accessibility
 * notes ask for.
 */
const PublicSection: React.FC<{
  id: string;
  title: string;
  variants: Variants;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ id, title, variants, action, children }) => (
  <motion.section
    id={id}
    aria-labelledby={`${id}-heading`}
    variants={variants}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, amount: 0.15 }}
    className="scroll-mt-24"
  >
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <h2
        id={`${id}-heading`}
        className="font-heading text-headline-md tracking-tight text-ink"
      >
        {title}
      </h2>
      {action}
    </div>
    {children}
  </motion.section>
);

/** The first sentence of the biography, used as the hero tagline. */
function taglineOf(bio: string): string {
  const firstLine = bio.split('\n')[0] ?? '';
  const sentence = firstLine.match(/^.*?[.!?](\s|$)/)?.[0]?.trim();
  const candidate = sentence || firstLine.trim();
  return candidate.length > 160 ? `${candidate.slice(0, 157).trimEnd()}…` : candidate;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString();
}

/**
 * A student's public profile: a standalone mini-website rather than a data
 * form (REDESIGN_PLAN §6.3). One hero, then six narrative sections — About, the
 * introduction video, Projects, Achievements, Certificates and the Resume — and
 * each one empty-states on its own so a half-filled profile still reads as
 * deliberate rather than broken.
 */
export const PublicStudentProfilePage: React.FC<PublicProfileProps> = ({ session, onLogout }) => {
  const { rollNo } = useParams<{ rollNo: string }>();
  const { toast } = useToast();
  const shouldReduce = useReducedMotion();
  const reveal = selectVariantsByName(shouldReduce, 'scrollReveal');

  const [student, setStudent] = useState<PublicStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

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

  const shell = (content: React.ReactNode) => (
    <div className="flex min-h-[100dvh] flex-col bg-surface-canvas text-ink print:bg-white print:text-neutral-900">
      <div className="print:hidden">
        <Navbar session={session} onLogout={onLogout} />
      </div>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16 sm:px-10 print:p-0 print:max-w-none">{content}</main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );

  /**
   * §6.3's share button. Clipboard access is only granted in a secure context,
   * so an `http://` visitor gets told what to copy rather than a silent no-op.
   */
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

  if (loading) {
    return shell(
      <div className="space-y-10" aria-busy="true">
        <span className="sr-only" role="status">
          Loading student profile
        </span>

        {/* §6.3's skeleton order: cover, then the header, then three sections. */}
        <Skeleton className="h-50 w-full rounded-b-3xl sm:h-80" />
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="-mt-16 size-32 rounded-full" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-72" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <div className="space-y-6">
          <Card>
            <Skeleton className="h-5 w-32" />
            <SkeletonText className="mt-4" lines={3} />
          </Card>
          <Card>
            <Skeleton className="h-5 w-40" />
            <SkeletonText className="mt-4" lines={2} />
          </Card>
          <Card>
            <Skeleton className="h-5 w-28" />
            <SkeletonText className="mt-4" lines={4} />
          </Card>
        </div>
      </div>,
    );
  }

  if (!student) {
    return shell(
      <div className="py-16">
        <EmptyState
          icon={ShieldCheck}
          title="This profile doesn't exist or hasn't been set up yet"
          description="That roll number is not on the department roster, or the profile is no longer public."
          action={
            <Link to="/students" className="btn btn-primary">
              Back to the directory
            </Link>
          }
        />
      </div>,
    );
  }

  const name = student.name || 'This student';
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

  const hasNoData =
    !bio &&
    skillsList.length === 0 &&
    projects.length === 0 &&
    achievements.length === 0 &&
    certificates.length === 0 &&
    !introVideo;

  const resumeHref = hasResume ? `/students/${student.rollNo || rollNo || ''}/resume` : null;
  const resumeFileHref = resume?.viewUrl || resume?.fileUrl || null;

  return (
    <>
      <div className="flex items-center justify-between print:hidden">
        <Link
          to="/students"
          className="inline-flex min-h-11 items-center gap-1.5 text-label-lg font-semibold text-ink-secondary transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
          <span>Back to students</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-1.5 text-label-md font-semibold text-ink transition-colors hover:bg-surface-sunken cursor-pointer"
            title="Print or Save PDF"
          >
            <Printer size={15} strokeWidth={2} aria-hidden="true" />
            <span>Save PDF / Print</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-1.5 text-label-md font-semibold text-ink transition-colors hover:bg-surface-sunken cursor-pointer"
          >
            <Share2 size={15} strokeWidth={2} aria-hidden="true" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* ── 1. COVER ────────────────────────────────────────────────────────
          Compact, modern banner hidden in print mode to keep focus on student. */}
      <div className="relative -mx-6 mt-4 h-28 overflow-hidden rounded-b-2xl sm:-mx-10 sm:h-36 print:hidden">
        <span aria-hidden="true" className="block size-full bg-gradient-to-br from-red-950 via-red-900/80 to-slate-900" />
      </div>

      {/* ── 2. PROFILE HEADER ─────────────────────────────────────────────── */}
      <header className="flex flex-col items-center text-center print:pt-4">
        <ProfilePhoto
          name={name}
          photo={photo}
          profile={profile}
          imageFailed={imageError}
          onImageError={() => setImageError(true)}
          className="-mt-14 size-28 sm:-mt-16 sm:size-32 rounded-full border-4 border-surface shadow-card print:mt-0 print:border-2 print:border-neutral-300"
        />

        <h1 className="mt-3 font-heading text-headline-xl text-ink font-bold tracking-tight">{name}</h1>

        <p className="mt-1 font-mono text-label-md font-semibold tracking-wide text-ink-muted">
          {student.rollNo}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Badge label={DEPARTMENT} variant="brand" dot={false} />
          <Badge label={`Year ${student.year || 1}`} variant="neutral" dot={false} />
          <Badge label={`Section ${student.section || 'A'}`} variant="neutral" dot={false} />
          {student.status === 'GRADUATED' && (
            <span className="badge badge-draft">Alumni</span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {profile.githubUrl && (
            <SocialLink href={profile.githubUrl} label="GitHub profile">
              <Github size={17} strokeWidth={1.75} aria-hidden="true" />
            </SocialLink>
          )}
          {profile.linkedinUrl && (
            <SocialLink href={profile.linkedinUrl} label="LinkedIn profile">
              <Linkedin size={17} strokeWidth={1.75} aria-hidden="true" />
            </SocialLink>
          )}
          {profile.leetcodeUrl && (
            <SocialLink href={profile.leetcodeUrl} label="LeetCode profile" tone="text-award-gold">
              <LeetCodeIcon className="h-4 w-4" />
            </SocialLink>
          )}
          {profile.codechefUrl && (
            <SocialLink href={profile.codechefUrl} label="CodeChef profile" tone="text-award-bronze">
              <CodeChefIcon className="h-4 w-4" />
            </SocialLink>
          )}
          {profile.portfolioUrl && (
            <SocialLink href={profile.portfolioUrl} label="Personal website" tone="text-ink-brand">
              <Globe size={17} strokeWidth={1.75} aria-hidden="true" />
            </SocialLink>
          )}

          {resumeHref && (
            <Link to={resumeHref} className="btn btn-primary ml-1">
              <FileText size={15} strokeWidth={1.75} aria-hidden="true" />
              <span>Resume</span>
            </Link>
          )}
        </div>
      </header>

      {hasNoData ? (
        <div className="mt-10">
          <EmptyState
            icon={ShieldCheck}
            title="This profile is still being written"
            description={`${name.split(' ')[0] || 'This student'} is on the department roster. The bio, skills, projects and achievements appear here once they publish them.`}
          />
        </div>
      ) : (
        <div className="mt-14 space-y-14">
          {/* ── 3. ABOUT ─────────────────────────────────────────────────── */}
          {bio && (
            <PublicSection id="about" title="About" variants={reveal}>
              <Card>
                <p className="whitespace-pre-line text-body-md text-ink-secondary leading-relaxed">
                  {bio}
                </p>
              </Card>
            </PublicSection>
          )}

          {skillsList.length > 0 && (
            <PublicSection id="skills" title="Skills" variants={reveal}>
              <Card>
                <ul className="flex flex-wrap gap-2">
                  {skillsList.map((entry, index) => {
                    const label =
                      typeof entry === 'string'
                        ? entry
                        : entry.skill?.name || entry.name || '';
                    if (!label) return null;
                    return (
                      <li key={`${label}-${index}`}>
                        <Tag label={label} />
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </PublicSection>
          )}

          {/* ── 4. FEATURED VIDEO ────────────────────────────────────────── */}
          {introVideo?.streamUrl && (
            <div className="print:hidden">
              <PublicSection id="video" title="Introduction video" variants={reveal}>
                <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-edge bg-surface-inverse aspect-video shadow-card">
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
                      poster={
                        introVideo.thumbnailUrl
                          ? resolveMediaUrl(introVideo.thumbnailUrl)
                          : undefined
                      }
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
              </PublicSection>
            </div>
          )}

          {/* ── 5. PROJECTS ──────────────────────────────────────────────── */}
          <div className={projects.length === 0 ? 'print:hidden' : ''}>
            <PublicSection id="projects" title="Projects" variants={reveal}>
              {projects.length === 0 ? (
                <Card>
                  <EmptyState
                    bare
                    icon={FolderGit2}
                    title="No projects yet"
                    description="Projects this student publishes appear here as portfolio entries."
                  />
                </Card>
              ) : (
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {projects.map((project, index) => (
                    <li
                      key={project.id}
                      className={
                        index === 0
                          ? 'surface flex flex-col p-5 shadow-card md:col-span-2 print:break-inside-avoid print:border print:border-neutral-200'
                          : 'surface flex flex-col p-5 print:break-inside-avoid print:border print:border-neutral-200'
                      }
                    >
                    <h3 className="font-heading text-headline-sm text-ink">{project.title}</h3>
                    {project.description && (
                      <p className="mt-2 line-clamp-4 flex-1 text-body-sm text-ink-secondary">
                        {project.description}
                      </p>
                    )}
                    {project.techStack && project.techStack.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {project.techStack.map((tech) => (
                          <li key={tech}>
                            <Tag label={tech} />
                          </li>
                        ))}
                      </ul>
                    )}
                    {(project.githubUrl || project.videoUrl) && (
                      <div className="mt-4 flex flex-wrap gap-4 border-t border-edge pt-3">
                        {project.githubUrl && (
                          <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-label-lg font-semibold text-ink-brand hover:text-brand-hover"
                          >
                            <Github size={14} strokeWidth={2} aria-hidden="true" />
                            <span>Source</span>
                          </a>
                        )}
                        {project.videoUrl && (
                          <a
                            href={project.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-label-lg font-semibold text-ink-brand hover:text-brand-hover"
                          >
                            <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
                            <span>Live demo</span>
                          </a>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </PublicSection>
          </div>

          {/* ── 6. ACHIEVEMENTS & CERTIFICATES ───────────────────────────── */}
          {/* ── 6. ACHIEVEMENTS & CERTIFICATES ───────────────────────────── */}
          {(achievements.length > 0 || certificates.length > 0) && (
            <div className={`grid gap-14 ${achievements.length > 0 && certificates.length > 0 ? 'lg:grid-cols-2 lg:gap-8' : 'grid-cols-1'}`}>
              {achievements.length > 0 && (
                <PublicSection id="achievements" title="Achievements" variants={reveal}>
                  <ul className="space-y-3">
                    {achievements.map((achievement) => {
                      const href = (achievement as any).previewUrl ||
                        ((achievement as any).driveFileId && !(achievement as any).driveFileId.startsWith('mock_')
                          ? `https://drive.google.com/file/d/${(achievement as any).driveFileId}/preview`
                          : null) ||
                        (achievement as any).proofUrl ||
                        (achievement as any).viewUrl;
                      return (
                        <li key={achievement.id} className="surface flex items-center justify-between gap-4 p-5 print:break-inside-avoid print:border print:border-neutral-200">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-heading text-label-lg font-semibold text-ink">
                                {achievement.title}
                              </h3>
                              <Badge label="Verified" variant="success" />
                            </div>
                            {achievement.description && (
                              <p className="mt-1 text-body-sm text-ink-secondary">
                                {achievement.description}
                              </p>
                            )}
                            <p className="mt-1 text-label-md text-ink-muted">
                              {[achievement.organization, achievement.date ? formatDate(achievement.date) : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                          {href && (
                            <a
                              href={href.startsWith('http') ? href : resolveMediaUrl(href)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex shrink-0 items-center gap-1 text-label-lg font-semibold text-ink-brand hover:text-brand-hover print:hidden"
                            >
                              <span>View Proof</span>
                              <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </PublicSection>
              )}

              {certificates.length > 0 && (
                <PublicSection id="certificates" title="Certificates" variants={reveal}>
                  <ul className="space-y-3">
                    {certificates.map((certificate) => {
                      const href = (certificate as any).previewUrl ||
                        ((certificate as any).driveFileId && !(certificate as any).driveFileId.startsWith('mock_')
                          ? `https://drive.google.com/file/d/${(certificate as any).driveFileId}/preview`
                          : null) ||
                        certificate.viewUrl ||
                        certificate.fileUrl;
                      const meta = [
                        certificate.issuer,
                        certificate.issueDate ? formatDate(certificate.issueDate) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ');
                      return (
                        <li
                          key={certificate.id}
                          className="surface flex items-center justify-between gap-4 p-5 print:break-inside-avoid print:border print:border-neutral-200"
                        >
                          <div className="min-w-0">
                            <h3 className="truncate font-heading text-label-lg font-semibold text-ink">
                              {certificate.title}
                            </h3>
                            {meta && <p className="mt-0.5 truncate text-body-sm text-ink-muted">{meta}</p>}
                          </div>
                          {href && (
                            <a
                              href={href.startsWith('http') ? href : resolveMediaUrl(href)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex shrink-0 items-center gap-1 text-label-lg font-semibold text-ink-brand hover:text-brand-hover print:hidden"
                            >
                              <span>View</span>
                              <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </PublicSection>
              )}
            </div>
          )}

          {/* ── 7. RESUME ────────────────────────────────────────────────── */}
          {hasResume && resume && (
            <div className="print:hidden">
              <PublicSection id="resume" title="Resume" variants={reveal}>
              <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-text">
                  <FileText size={22} strokeWidth={1.75} aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-label-lg font-semibold text-ink">
                    {resume.filename || `${name}'s curriculum vitae`}
                  </p>
                  <p className="mt-0.5 text-body-sm text-ink-muted">
                    PDF
                    {resume.sizeMb ? ` · ${resume.sizeMb} MB` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {resumeFileHref && (
                    <a
                      href={`${resolveMediaUrl(resumeFileHref)}${
                        resolveMediaUrl(resumeFileHref).includes('?') ? '&' : '?'
                      }download=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                    >
                      <span>Download</span>
                    </a>
                  )}
                  {resumeHref && (
                    <Link to={resumeHref} className="btn btn-primary">
                      <span>View resume</span>
                    </Link>
                  )}
                </div>
              </Card>
            </PublicSection>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default PublicStudentProfilePage;