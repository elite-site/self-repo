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
  Award,
  Briefcase,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  Video as VideoIcon,
  Sparkles
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { BrandedLoading } from '../../components/BrandedLoading';
import { getPhotoStyle } from '../../utils/photoStyle';
import { LeetCodeIcon, CodeChefIcon } from '../../components/icons/PlatformIcons';

interface PublicProfileProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

export const PublicStudentProfilePage: React.FC<PublicProfileProps> = ({ session, onLogout }) => {
  const { rollNo } = useParams<{ rollNo: string }>();
  const [student, setStudent] = useState<any | null>(null);
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
      .then((data) => setStudent(data))
      .catch(() => setStudent(null))
      .finally(() => setLoading(false));
  }, [rollNo]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-surface-canvas flex flex-col justify-between">
        <Navbar session={session} onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center py-32">
          <BrandedLoading fullScreen={false} message="Loading Student Profile..." />
        </div>
        <Footer />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-[100dvh] bg-surface-canvas flex flex-col justify-between">
        <Navbar session={session} onLogout={onLogout} />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-lg bg-brand-soft text-brand-soft-text flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="text-headline-md font-bold text-ink mb-2 font-heading">
            Student Not Found
          </h1>
          <p className="text-body-sm text-ink-secondary mb-6 max-w-md">
            The profile you are looking for does not exist in our department roster.
          </p>
          <Link
            to="/"
            className="btn btn-primary"
          >
            Back to Home
          </Link>
        </div>
        <Footer />
      </div>
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

  const hasNoData =
    !profile.biography &&
    !profile.bio &&
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

  return (
    <div className="min-h-[100dvh] bg-surface-canvas flex flex-col text-ink">
      <Navbar session={session} onLogout={onLogout} />

      {/* TOP HEADER */}
      <div className="bg-surface border-b border-edge py-6">
        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          <Link
            to="/students"
            className="inline-flex items-center gap-2 text-ink-secondary hover:text-brand text-label-sm font-semibold uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-brand" aria-hidden="true" />
            <span>Back to Student Directory</span>
          </Link>
        </div>
      </div>

      {/* MAIN PROFILE CARD */}
      <main className="flex-1 max-w-6xl mx-auto px-6 sm:px-10 py-8 w-full pb-20 space-y-8">
        <div className="surface p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            {/* Avatar */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg bg-brand-soft text-brand-soft-text flex items-center justify-center font-bold text-3xl shadow-xs overflow-hidden shrink-0 border border-edge">
              {(profile.viewUrl || profile.photoUrl) && !imageError ? (
                <img
                  src={resolveMediaUrl(profile.viewUrl || profile.photoUrl)}
                  alt={student.name}
                  style={getPhotoStyle(profile)}
                  onError={() => setImageError(true)}
                />
              ) : (
                initials || 'IT'
              )}
            </div>

            {/* Student Info */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-headline-md font-extrabold text-ink font-heading tracking-tight">
                  {student.name}
                </h1>
                <span className="text-label-sm font-semibold text-ink-secondary bg-surface-sunken px-2.5 py-1 rounded-md border border-edge">
                  {student.rollNo}
                </span>
              </div>

              <div className="text-label-sm sm:text-body-sm font-semibold text-ink-secondary flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-brand font-bold">
                  Year {student.year || 1} · Section {student.section || 'A'}
                </span>
                <span>·</span>
                <span>Department of Information Technology</span>
                <span>·</span>
                <span className="text-ink-muted">SASI</span>
              </div>

              {/* Professional Links */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
                {profile.githubUrl && (
                  <a
                    href={profile.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-surface-sunken hover:bg-brand-soft border border-edge text-ink transition-colors"
                    title="GitHub Profile"
                    aria-label="GitHub Profile"
                  >
                    <Github className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-brand-soft hover:bg-brand-soft/80 border border-brand-soft text-brand-soft-text transition-colors"
                    title="LinkedIn Profile"
                    aria-label="LinkedIn Profile"
                  >
                    <Linkedin className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
                {profile.leetcodeUrl && (
                  <a
                    href={profile.leetcodeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-surface-sunken hover:bg-amber-500/10 border border-edge hover:border-amber-500/30 text-amber-500 transition-colors"
                    title="LeetCode Profile"
                    aria-label="LeetCode Profile"
                  >
                    <LeetCodeIcon className="w-4 h-4" />
                  </a>
                )}
                {profile.codechefUrl && (
                  <a
                    href={profile.codechefUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-surface-sunken hover:bg-amber-700/10 border border-edge hover:border-amber-700/30 text-amber-700 transition-colors"
                    title="CodeChef Profile"
                    aria-label="CodeChef Profile"
                  >
                    <CodeChefIcon className="w-4 h-4" />
                  </a>
                )}
                {profile.portfolioUrl && (
                  <a
                    href={profile.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-status-bg-approved hover:bg-status-bg-approved/80 border border-status-bg-approved text-status-approved transition-colors"
                    title="Personal Portfolio Website"
                    aria-label="Personal Portfolio Website"
                  >
                    <Globe className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>

            {/* Resume Button */}
            {hasResume && (
              <div className="shrink-0 pt-2 sm:pt-0">
                <Link
                  to={`/students/${student.rollNo}/resume`}
                  className="btn btn-primary"
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  <span>View Resume</span>
                </Link>
              </div>
            )}
          </div>

          {/* Published introduction video */}
          {introVideo?.streamUrl && (
            <div className="pt-6 border-t border-edge">
              <h3 className="text-label-sm font-bold uppercase tracking-wider text-ink-secondary mb-3 flex items-center gap-2 font-heading">
                <VideoIcon className="w-3.5 h-3.5 text-brand" aria-hidden="true" />
                <span>Introduction Video</span>
              </h3>
              <div className="bg-surface-inverse rounded-lg overflow-hidden aspect-video max-w-3xl">
                <video
                  src={resolveMediaUrl(introVideo.streamUrl)}
                  poster={introVideo.thumbnailUrl ? resolveMediaUrl(introVideo.thumbnailUrl) : undefined}
                  controls
                  preload="none"
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Biography */}
          {(profile.biography || profile.bio) && (
            <div className="pt-6 border-t border-edge">
              <h3 className="text-label-sm font-bold uppercase tracking-wider text-ink-secondary mb-2 font-heading">
                Biography
              </h3>
              <p className="text-body-sm text-ink-secondary leading-relaxed max-w-4xl">
                {profile.biography || profile.bio}
              </p>
            </div>
          )}

          {/* EMPTY PROFILE STATE */}
          {hasNoData && (
            <div className="pt-8 border-t border-edge flex flex-col items-center justify-center text-center py-8 sm:py-12 px-4">
              <div className="w-14 h-14 rounded-lg bg-brand-soft text-brand-soft-text flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-brand" aria-hidden="true" />
              </div>
              <h3 className="text-body-md sm:text-headline-sm font-bold text-ink font-heading mb-1">
                This student hasn't updated their profile yet.
              </h3>
              <p className="text-label-sm sm:text-body-sm text-ink-secondary max-w-md leading-relaxed">
                This official student profile is linked to the department roster. When {student.name?.split(' ')[0] || 'the student'} updates their bio, technical skills, projects, or achievements, they will appear here.
              </p>
            </div>
          )}
        </div>

        {/* DETAILS GRID */}
        {!hasNoData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT: SKILLS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="surface p-6 space-y-4">
              <h3 className="text-body-sm font-bold text-ink font-heading flex items-center gap-2 uppercase tracking-wide">
                <span>Technical Skills</span>
              </h3>
              {skillsList.length === 0 ? (
                <p className="text-label-sm text-ink-muted italic">No skills listed yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((sk: any, idx: number) => {
                    const name = sk.skill?.name || sk.name || sk;
                    return (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-brand-soft border border-brand-soft text-brand-soft-text rounded-md text-label-sm font-semibold"
                      >
                        {name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CERTIFICATES */}
            {certificates.length > 0 && (
              <div className="surface p-6 space-y-4">
                <h3 className="text-body-sm font-bold text-ink font-heading flex items-center gap-2 uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-brand" aria-hidden="true" />
                  <span>Verified Certificates</span>
                </h3>
                <div className="space-y-3">
                  {certificates.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-3 bg-surface-sunken rounded-lg border border-edge flex items-center justify-between text-label-sm gap-3"
                    >
                      {c.thumbnailUrl && (
                        <div className="w-14 h-10 rounded-md bg-surface-inset overflow-hidden shrink-0 border border-edge">
                          <img
                            src={resolveMediaUrl(c.thumbnailUrl)}
                            alt={c.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="font-bold text-ink truncate">{c.title}</div>
                        <div className="text-[11px] text-ink-muted truncate">{c.issuer}</div>
                      </div>
                      {(c.viewUrl || c.fileUrl) && (
                        <a
                          href={resolveMediaUrl(c.viewUrl || c.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline shrink-0 ml-2"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: PROJECTS & ACHIEVEMENTS */}
          <div className="lg:col-span-2 space-y-8">
            {/* PROJECTS */}
            <div className="surface p-6 sm:p-8 space-y-5">
              <h3 className="text-body-md font-bold text-ink font-heading flex items-center gap-2 uppercase tracking-wide">
                <Briefcase className="w-4 h-4 text-brand" aria-hidden="true" />
                <span>Featured Projects ({projects.length})</span>
              </h3>

              {projects.length === 0 ? (
                <p className="text-label-sm text-ink-muted italic py-4">No projects showcased yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-5 rounded-lg border border-edge bg-surface-sunken flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2 min-w-0">
                        <h4 className="font-bold text-body-sm text-ink font-heading truncate">{p.title}</h4>
                        <p className="text-label-sm text-ink-secondary line-clamp-3 leading-relaxed">
                          {p.description}
                        </p>
                        {p.techStack && p.techStack.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {p.techStack.map((t: string) => (
                              <span
                                key={t}
                                className="text-[10px] bg-surface border border-edge px-2 py-0.5 rounded text-ink-secondary"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {p.githubUrl && (
                        <div className="pt-2 border-t border-edge">
                          <a
                            href={p.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-label-sm font-semibold text-brand hover:underline"
                          >
                            <Github className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>View Source</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ACHIEVEMENTS */}
            {achievements.length > 0 && (
              <div className="surface p-6 sm:p-8 space-y-5">
                <h3 className="text-body-md font-bold text-ink font-heading flex items-center gap-2 uppercase tracking-wide">
                  <Award className="w-4 h-4 text-status-pending" aria-hidden="true" />
                  <span>Endorsed Achievements</span>
                </h3>

                <div className="space-y-3">
                  {achievements.map((a: any) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-lg border border-edge bg-surface-sunken flex items-start justify-between gap-4"
                    >
                      {a.thumbnailUrl && (
                        <div className="w-16 h-12 rounded-md bg-surface-inset overflow-hidden shrink-0 border border-edge mt-0.5">
                          <img
                            src={resolveMediaUrl(a.thumbnailUrl)}
                            alt={a.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="space-y-1 text-label-sm min-w-0 flex-1">
                        <div className="font-bold text-ink text-body-sm font-heading">{a.title}</div>
                        <p className="text-ink-secondary">{a.description}</p>
                        <div className="text-[11px] text-ink-muted pt-1">
                          {a.organization} · {a.date ? new Date(a.date).toLocaleDateString() : 'To be announced'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(a.viewUrl || a.proofUrl) && (
                          <a
                            href={resolveMediaUrl(a.viewUrl || a.proofUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
                          >
                            <span>Proof</span>
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </a>
                        )}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-bg-approved text-status-approved border border-status-bg-approved text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          Verified
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PublicStudentProfilePage;
