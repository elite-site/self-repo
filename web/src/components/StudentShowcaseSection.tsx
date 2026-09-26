import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowRight, ExternalLink, GraduationCap, Sparkles } from 'lucide-react';
import { api, resolveMediaUrl } from '../services/api';

interface StudentItem {
  id: string;
  rollNo: string;
  name: string;
  year: number;
  section: string;
  profile?: {
    photoUrl?: string | null;
    biography?: string | null;
    skills?: Array<{ skill: { name: string } }>;
  } | null;
}

export const StudentShowcaseSection: React.FC = () => {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    api
      .getPublicStudents({ limit: 4 })
      .then((data) => {
        if (mounted) {
          setStudents(Array.isArray(data) ? data.slice(0, 4) : []);
        }
      })
      .catch((err) => {
        console.error('Failed to load public students:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="student-showcase" aria-labelledby="showcase-title" className="py-16 sm:py-20 bg-[#FAFAFA] text-left">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
              <Users className="w-3.5 h-3.5" />
              <span>STUDENT SHOWCASE</span>
            </div>
            <h2 id="showcase-title" className="text-3xl sm:text-4xl font-extrabold text-elite-black font-display tracking-tight">
              Discover IT Students
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Discover IT students, their skills, projects, achievements, and professional profiles.
            </p>
          </div>

          <div>
            <Link
              to="/students"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
            >
              <span>Explore Students</span>
              <ArrowRight className="w-3.5 h-3.5 text-elite-red" />
            </Link>
          </div>
        </div>

        {/* Content Display */}
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="w-8 h-8 border-2 border-elite-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : students.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {students.map((student) => {
              const initials = student.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join('');

              return (
                <div
                  key={student.id}
                  className="bg-white border border-neutral-200/90 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md hover:border-neutral-300 transition-all group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-sm group-hover:bg-elite-red transition-colors">
                        {student.profile?.photoUrl ? (
                          <img
                            src={resolveMediaUrl(student.profile.photoUrl)}
                            alt={student.name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          initials || <GraduationCap className="w-5 h-5" />
                        )}
                      </div>
                      <span className="text-[11px] font-mono font-semibold bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full border border-neutral-200/60">
                        {student.year ? `Year ${student.year}` : 'IT'} · Sec {student.section || 'A'}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-elite-black font-display tracking-tight group-hover:text-elite-red transition-colors line-clamp-1">
                        {student.name}
                      </h3>
                      <div className="text-xs font-mono text-neutral-500 mt-0.5">
                        {student.rollNo}
                      </div>
                    </div>

                    {student.profile?.skills && student.profile.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {student.profile.skills.slice(0, 3).map((item, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700"
                          >
                            {item.skill.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-5 mt-4 border-t border-neutral-100">
                    <Link
                      to={`/students/${student.rollNo}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-elite-red group-hover:underline"
                    >
                      <span>View Profile</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state when no public student profiles are in database yet */
          <div className="bg-white border border-neutral-200/90 rounded-2xl p-10 sm:p-14 text-center max-w-2xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-elite-black font-display">
                No public student profiles yet.
              </h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
                As students update their portfolios and enable public visibility, their verified profiles will appear here in the showcase.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/students"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                <span>Browse Student Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
