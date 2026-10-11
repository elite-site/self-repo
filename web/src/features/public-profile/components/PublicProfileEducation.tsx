import React from 'react';
import { GraduationCap, Trophy, Award } from 'lucide-react';
import { PublicAchievement, PublicCertificate, PublicStudent } from '../types';

interface PublicProfileEducationProps {
  student: PublicStudent;
  achievements: PublicAchievement[];
  certificates: PublicCertificate[];
  department: string;
}

export const PublicProfileEducation: React.FC<PublicProfileEducationProps> = ({
  student,
  achievements,
  certificates,
  department,
}) => {
  return (
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
                Bachelor of Technology in {student.branch || department}
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
            <p className="text-sm font-bold text-white mt-1">{student.branch || department}</p>
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
  );
};
