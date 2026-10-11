import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/shared/ui/Badge';
import { resolveMediaUrl } from '@/shared/api';
import { DirectoryStudent } from '../types';
import { DirectoryPhoto } from './DirectoryPhoto';

interface DirectoryStudentCardProps {
  student: DirectoryStudent;
}

export const DirectoryStudentCard: React.FC<DirectoryStudentCardProps> = ({ student: st }) => {
  const photo = st.profile?.photoUrl || st.photoUrl || null;
  const resolvedPhoto = photo ? resolveMediaUrl(photo) : null;
  const studentSkills = (st.skills || st.profile?.skills || [])
    .map((s: any) => (typeof s === 'string' ? s : (s.skill?.name || s.name)))
    .filter((n): n is string => Boolean(n));
  const isAlumni = st.status === 'GRADUATED';
  const name = st.name || 'Student';

  return (
    <li className="list-none">
      <Link
        to={`/students/${st.rollNo}`}
        className="card card-interactive group flex h-full flex-col p-5"
      >
        <div className="flex items-start gap-4">
          <DirectoryPhoto name={name} src={resolvedPhoto} profile={st.profile} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="truncate font-heading text-body-lg font-bold text-ink group-hover:text-ink-brand">
                {name}
              </h2>
              {isAlumni && (
                <Badge label="Alumni" variant="neutral" dot={false} />
              )}
            </div>

            <p className="mt-0.5 text-label-md font-mono text-ink-muted">
              {st.rollNo}
            </p>

            <p className="mt-1 text-label-md text-ink-secondary">
              {st.year ? `Year ${st.year}` : 'Student'}
              {st.section ? ` · Sec ${st.section}` : ''}
            </p>
          </div>
        </div>

        {studentSkills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-edge pt-3">
            {studentSkills.slice(0, 3).map((skill) => (
              <Badge key={skill} label={skill} variant="neutral" dot={false} />
            ))}
            {studentSkills.length > 3 && (
              <span className="self-center text-label-xs text-ink-muted">
                +{studentSkills.length - 3}
              </span>
            )}
          </div>
        )}
      </Link>
    </li>
  );
};
