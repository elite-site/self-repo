import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, resolveMediaUrl } from '../../services/api';
import { StudentSession } from '../../types';
import {
  Loader2,
  ArrowLeft,
  Github,
  Linkedin,
  Globe,
  FileText,
  Award,
  Briefcase,
  ShieldCheck,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Video as VideoIcon
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';

interface PublicProfileProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

export const PublicStudentProfilePage: React.FC<PublicProfileProps> = ({ session, onLogout }) => {
  const { rollNo } = useParams<{ rollNo: string }>();
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
        <Navbar session={session} onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-elite-red" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
        <Navbar session={session} onLogout={onLogout} />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-elite-red flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B192C] mb-2 font-display">
            Student Not Found
          </h1>
          <p className="text-slate-500 mb-6 max-w-md text-xs sm:text-sm">
            The profile you are looking for either does not exist or has not enabled public directory visibility.
          </p>
          <Link
            to="/"
            className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
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
  // Only an approved + published video is returned by the public API.
  const introVideo = student.introVideo || null;

  const initials = (student.name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-left">
      <Navbar session={session} onLogout={onLogout} />

      {/* TOP HEADER */}
      <div className="bg-[#0B192C] pt-12 pb-28 text-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-elite-red" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      {/* MAIN PROFILE CARD */}
      <main className="flex-1 max-w-6xl mx-auto px-6 sm:px-10 -mt-20 w-full pb-20 space-y-8">
        <div className="bg-white rounded-3xl shadow-sm border border-[#E2E8F0] p-6 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            {/* Avatar */}
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-[#0B192C] text-white flex items-center justify-center font-bold text-3xl shadow-md overflow-hidden shrink-0 border-4 border-white">
              {profile.photoUrl ? (
                <img
                  src={resolveMediaUrl(profile.photoUrl)}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials || 'IT'
              )}
            </div>

            {/* Student Info */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B192C] font-display tracking-tight">
                  {student.name}
                </h1>
                <span className="text-xs font-mono font-bold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md">
                  {student.rollNo}
                </span>
              </div>

              <div className="text-xs sm:text-sm font-semibold text-neutral-600 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-elite-red font-bold">
                  Year {student.year || 1} · Section {student.section || 'A'}
                </span>
                <span>•</span>
                <span>Department of Information Technology</span>
                <span>•</span>
                <span className="text-neutral-500">SASI</span>
              </div>

              {/* Professional Links */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
                {profile.githubUrl && (
                  <a
                    href={profile.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors"
                    title="GitHub Profile"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                )}
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                    title="LinkedIn Profile"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {profile.portfolioUrl && (
                  <a
                    href={profile.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors"
                    title="Personal Portfolio Website"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Resume Button */}
            {hasResume && (
              <div className="shrink-0 pt-2 sm:pt-0">
                <Link
                  to={`/students/${student.rollNo}/resume`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-elite-red text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Resume</span>
                </Link>
              </div>
            )}
          </div>

          {/* Published introduction video */}
          {introVideo?.streamUrl && (
            <div className="pt-6 border-t border-neutral-100">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <VideoIcon className="w-3.5 h-3.5" />
                Introduction Video
              </h3>
              <div className="bg-black rounded-2xl overflow-hidden aspect-video max-w-3xl">
                <video
                  src={resolveMediaUrl(introVideo.streamUrl)}
                  controls
                  preload="metadata"
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Biography */}
          {(profile.biography || profile.bio) && (
            <div className="pt-6 border-t border-neutral-100">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-2">
                Biography
              </h3>
              <p className="text-sm text-neutral-700 leading-relaxed max-w-4xl">
                {profile.biography || profile.bio}
              </p>
            </div>
          )}
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT: SKILLS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#0B192C] flex items-center gap-2 uppercase tracking-wide">
                <span>Technical Skills</span>
              </h3>
              {skillsList.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No skills listed yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((sk: any, idx: number) => {
                    const name = sk.skill?.name || sk.name || sk;
                    return (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-neutral-100 border border-neutral-200 text-neutral-800 rounded-lg text-xs font-mono font-medium"
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
              <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#0B192C] flex items-center gap-2 uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-elite-red" />
                  <span>Verified Certificates</span>
                </h3>
                <div className="space-y-3">
                  {certificates.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 space-y-1 text-xs"
                    >
                      <div className="font-bold text-neutral-800">{c.title}</div>
                      <div className="text-[11px] text-neutral-500">{c.issuer}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: PROJECTS & ACHIEVEMENTS */}
          <div className="lg:col-span-2 space-y-8">
            {/* PROJECTS */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-xs space-y-5">
              <h3 className="text-base font-bold text-[#0B192C] flex items-center gap-2 uppercase tracking-wide">
                <Briefcase className="w-4 h-4 text-elite-red" />
                <span>Featured Projects ({projects.length})</span>
              </h3>

              {projects.length === 0 ? (
                <p className="text-xs text-neutral-400 italic py-4">No projects showcased yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-5 rounded-xl border border-[#E2E8F0] bg-neutral-50/50 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <h4 className="font-bold text-sm text-[#0B192C]">{p.title}</h4>
                        <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed">
                          {p.description}
                        </p>
                        {p.techStack && p.techStack.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {p.techStack.map((t: string) => (
                              <span
                                key={t}
                                className="text-[10px] font-mono bg-white border border-neutral-200 px-2 py-0.5 rounded text-neutral-600"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {p.githubUrl && (
                        <div className="pt-2 border-t border-neutral-200/60">
                          <a
                            href={p.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-elite-red hover:underline"
                          >
                            <Github className="w-3.5 h-3.5" />
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
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-xs space-y-5">
                <h3 className="text-base font-bold text-[#0B192C] flex items-center gap-2 uppercase tracking-wide">
                  <Award className="w-4 h-4 text-elite-red" />
                  <span>Endorsed Achievements</span>
                </h3>

                <div className="space-y-3">
                  {achievements.map((a: any) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-[#0B192C] text-sm">{a.title}</div>
                        <p className="text-neutral-600">{a.description}</p>
                        <div className="text-[11px] text-neutral-400 font-mono pt-1">
                          {a.organization} · {a.date ? new Date(a.date).toLocaleDateString() : ''}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
