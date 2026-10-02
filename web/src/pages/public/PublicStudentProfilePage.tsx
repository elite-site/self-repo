import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, resolveMediaUrl } from '../../services/api';
import { StudentSession } from '../../types';
import {
  ArrowLeft,
  Github,
  Linkedin,
  Globe,
  FileText,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  Video as VideoIcon,
  Trophy,
  FolderGit2,
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { getPhotoStyle } from '../../utils/photoStyle';
import { LeetCodeIcon, CodeChefIcon } from '../../components/icons/PlatformIcons';
import { EmptyState } from '../../components/ui/EmptyState';

interface PublicProfileProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'video', label: 'Video' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

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
 * A student's public profile, built as a portfolio page rather than a dump of
 * every record at once: one header, five sections, and each section empty-stated
 * on its own so a half-filled profile still reads as intentional.
 */
export const PublicStudentProfilePage: React.FC<PublicProfileProps> = ({ session, onLogout }) => {
  const { rollNo } = useParams<{ rollNo: string }>();
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [section, setSection] = useState<SectionId>('about');

  useEffect(() => {
    setImageError(false);
    setSection('about');
  }, [rollNo]);

  useEffect(() => {
    if (!rollNo) return;
    setLoading(true);
    api
      .getPublicStudent(rollNo)
      .then((data) => setStudent(data))
      .catch(() => setStudent(null))
      .finally(() => setLoading(false));
  }, [rollNo]);

  const shell = (content: React.ReactNode) => (
    <div className="flex min-h-[100dvh] flex-col bg-surface-canvas text-ink">
      <Navbar session={session} onLogout={onLogout} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 sm:px-10">{content}</main>
      <Footer />
    </div>
  );

  if (loading) {
    return shell(
      <div className="space-y-6" aria-busy="true">
        <span className="sr-only" role="status">
          Loading student profile
        </span>
        <div className="skeleton h-4 w-40" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="skeleton h-24 w-24 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-7 w-56" />
            <div className="skeleton h-4 w-72" />
            <div className="skeleton h-10 w-64" />
          </div>
        </div>
        <div className="skeleton h-10 w-full" />
        <div className="space-y-3">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>,
    );
  }

  if (!student) {
    return shell(
      <EmptyState
        icon={ShieldCheck}
        title="Student not found"
        description="That roll number is not on the department roster, or the profile is no longer public."
        action={
          <Link to="/students" className="btn btn-primary">
            Back to the directory
          </Link>
        }
      />,
    );
  }

  const profile = student.profile || {};
  const skillsList = profile.skills || [];
  const projects = student.projects || [];
  const achievements = student.achievements || [];
  const certificates = student.certificates || [];
  const resumes = student.resumes || [];
  const hasResume = resumes.length > 0;
  const introVideo = student.introVideo || null;
  const bio = profile.biography || profile.bio || '';

  const hasNoData =
    !bio &&
    skillsList.length === 0 &&
    projects.length === 0 &&
    achievements.length === 0 &&
    certificates.length === 0 &&
    !introVideo;

  const initials = (student.name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('');

  const photo = profile.viewUrl || profile.photoUrl;

  const handleTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % SECTIONS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + SECTIONS.length) % SECTIONS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = SECTIONS.length - 1;
    else return;

    event.preventDefault();
    setSection(SECTIONS[next].id);
    document.getElementById(`profile-tab-${SECTIONS[next].id}`)?.focus();
  };

  return shell(
    <>
      <Link
        to="/students"
        className="inline-flex items-center gap-1.5 text-label-lg font-semibold text-ink-secondary transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
        <span>Back to students</span>
      </Link>

      {/* HEADER: flat on the canvas, the way a portfolio page opens. */}
      <header className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
        <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-edge bg-brand-soft font-heading text-headline-lg font-bold text-brand-soft-text">
          {photo && !imageError ? (
            <img
              src={resolveMediaUrl(photo)}
              alt=""
              style={getPhotoStyle(profile)}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            initials || 'IT'
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-headline-lg-mobile text-ink sm:text-headline-lg">
              {student.name}
            </h1>
            {student.status === 'GRADUATED' && <span className="badge badge-draft">Alumni</span>}
          </div>

          <p className="mt-1 text-body-md text-ink-secondary">
            {student.rollNo} · Year {student.year || 1} · Section {student.section || 'A'} ·
            Information Technology
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
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

            {hasResume && (
              <Link to={`/students/${student.rollNo}/resume`} className="btn btn-primary ml-1">
                <FileText size={15} strokeWidth={1.75} aria-hidden="true" />
                <span>Resume</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {hasNoData ? (
        <div className="mt-8">
          <EmptyState
            icon={ShieldCheck}
            title="This profile is still being written"
            description={`${student.name?.split(' ')[0] || 'This student'} is on the department roster. The bio, skills, projects and achievements appear here once they publish them.`}
          />
        </div>
      ) : (
        <>
          {/* SECTION NAVIGATION */}
          <div
            role="tablist"
            aria-label="Profile sections"
            className="mt-8 flex gap-6 overflow-x-auto border-b border-edge"
          >
            {SECTIONS.map((item, index) => (
              <button
                key={item.id}
                id={`profile-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={section === item.id}
                aria-controls={`profile-panel-${item.id}`}
                tabIndex={section === item.id ? 0 : -1}
                onClick={() => setSection(item.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={`-mb-px shrink-0 cursor-pointer whitespace-nowrap border-b-2 pb-3 pt-1 text-label-lg transition-colors duration-fast ${
                  section === item.id
                    ? 'border-brand font-semibold text-ink'
                    : 'border-transparent text-ink-secondary hover:border-edge-strong hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`profile-panel-${section}`}
            aria-labelledby={`profile-tab-${section}`}
            className="pt-6"
          >
            {section === 'about' && (
              <div className="space-y-8">
                {bio ? (
                  <p className="max-w-prose text-body-lg text-ink-secondary">{bio}</p>
                ) : (
                  <p className="text-body-md text-ink-muted">No biography yet.</p>
                )}

                <div>
                  <h2 className="font-heading text-headline-sm text-ink">Skills</h2>
                  {skillsList.length === 0 ? (
                    <p className="mt-2 text-body-sm text-ink-muted">No skills listed yet.</p>
                  ) : (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {skillsList.map((sk: any, idx: number) => {
                        const name = sk.skill?.name || sk.name || sk;
                        return (
                          <li
                            key={idx}
                            className="rounded-lg border border-edge bg-surface-inset px-3 py-1 text-label-lg text-ink-secondary"
                          >
                            {name}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {section === 'projects' && (
              <>
                {projects.length === 0 ? (
                  <EmptyState
                    bare
                    icon={FolderGit2}
                    title="No projects yet"
                    description="Projects this student publishes appear here as portfolio entries."
                  />
                ) : (
                  <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {projects.map((p: any) => (
                      <li key={p.id} className="surface flex flex-col p-5">
                        <h2 className="font-heading text-headline-sm text-ink">{p.title}</h2>
                        {p.description && (
                          <p className="mt-2 line-clamp-4 flex-1 text-body-sm text-ink-secondary">
                            {p.description}
                          </p>
                        )}
                        {p.techStack?.length > 0 && (
                          <ul className="mt-3 flex flex-wrap gap-1.5">
                            {p.techStack.map((tech: string) => (
                              <li
                                key={tech}
                                className="rounded border border-edge bg-surface-inset px-2 py-0.5 text-label-md text-ink-secondary"
                              >
                                {tech}
                              </li>
                            ))}
                          </ul>
                        )}
                        {(p.githubUrl || p.videoUrl) && (
                          <div className="mt-4 flex flex-wrap gap-4 border-t border-edge pt-3">
                            {p.githubUrl && (
                              <a
                                href={p.githubUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-label-lg font-semibold text-ink-brand hover:text-brand-hover"
                              >
                                <Github size={14} strokeWidth={2} aria-hidden="true" />
                                <span>Source</span>
                              </a>
                            )}
                            {p.videoUrl && (
                              <a
                                href={p.videoUrl}
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
              </>
            )}

            {section === 'achievements' && (
              <>
                {achievements.length === 0 ? (
                  <EmptyState
                    bare
                    icon={Trophy}
                    title="No achievements yet"
                    description="Faculty-endorsed achievements appear here."
                  />
                ) : (
                  <ul className="divide-y divide-edge">
                    {achievements.map((a: any) => (
                      <li key={a.id} className="py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-heading text-label-lg font-semibold text-ink">{a.title}</h2>
                          <span className="badge badge-approved">
                            <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden="true" />
                            Verified
                          </span>
                        </div>
                        {a.description && (
                          <p className="mt-1 text-body-sm text-ink-secondary">{a.description}</p>
                        )}
                        <p className="mt-1 text-label-md text-ink-muted">
                          {[a.organization, a.date ? new Date(a.date).toLocaleDateString() : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {section === 'certificates' && (
              <>
                {certificates.length === 0 ? (
                  <EmptyState
                    bare
                    icon={ShieldCheck}
                    title="No certificates yet"
                    description="Certificates this student has made public appear here."
                  />
                ) : (
                  <ul className="divide-y divide-edge">
                    {certificates.map((c: any) => (
                      <li key={c.id} className="flex items-center justify-between gap-4 py-4">
                        <div className="min-w-0">
                          <h2 className="truncate font-heading text-label-lg font-semibold text-ink">
                            {c.title}
                          </h2>
                          <p className="mt-0.5 truncate text-body-sm text-ink-muted">
                            {[c.issuer, c.issueDate ? new Date(c.issueDate).toLocaleDateString() : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                        {(c.viewUrl || c.fileUrl) && (
                          <a
                            href={resolveMediaUrl(c.viewUrl || c.fileUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 text-label-lg font-semibold text-ink-brand hover:text-brand-hover"
                          >
                            <span>View</span>
                            <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {section === 'video' && (
              <>
                {introVideo?.streamUrl ? (
                  <div className="max-w-3xl">
                    <video
                      src={resolveMediaUrl(introVideo.streamUrl)}
                      poster={introVideo.thumbnailUrl ? resolveMediaUrl(introVideo.thumbnailUrl) : undefined}
                      controls
                      preload="none"
                      playsInline
                      className="aspect-video w-full rounded-lg border border-edge bg-surface-inverse object-contain"
                    >
                      Your browser does not support video playback.
                    </video>
                  </div>
                ) : (
                  <EmptyState
                    bare
                    icon={VideoIcon}
                    title="No introduction video yet"
                    description="A recording appears here once the department approves it and the student publishes it."
                  />
                )}
              </>
            )}
          </div>
        </>
      )}
    </>,
  );
};

export default PublicStudentProfilePage;
