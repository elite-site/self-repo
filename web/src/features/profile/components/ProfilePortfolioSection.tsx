import React from 'react';
import { Link } from 'react-router-dom';
import { FolderGit2, Award, FileText, Video, ChevronRight } from 'lucide-react';
import { Project, Certificate, Achievement, StudentIntroVideo } from '@/shared/types';

interface ProfilePortfolioSectionProps {
  projects: Project[];
  certificates: Certificate[];
  achievements: Achievement[];
  video: StudentIntroVideo | null;
  resume: any | null;
}

export const ProfilePortfolioSection: React.FC<ProfilePortfolioSectionProps> = ({
  projects,
  certificates,
  achievements,
  video,
  resume,
}) => {
  return (
    <div className="surface p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-edge pb-4">
        <h2 className="font-heading text-body-md font-bold text-ink">Portfolio & Verification Summary</h2>
        <Link to="/portfolio" className="text-label-sm font-semibold text-ink-brand hover:underline inline-flex items-center gap-1">
          <span>Manage Portfolio</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link to="/portfolio/projects" className="surface-sunken p-4 rounded-xl border border-edge hover:border-brand transition-colors text-left group">
          <FolderGit2 className="w-6 h-6 text-brand mb-2 group-hover:scale-110 transition-transform" />
          <div className="font-heading text-xl font-bold text-ink">{projects.length}</div>
          <div className="text-label-xs text-ink-muted">Projects</div>
        </Link>

        <Link to="/portfolio/certificates" className="surface-sunken p-4 rounded-xl border border-edge hover:border-brand transition-colors text-left group">
          <Award className="w-6 h-6 text-status-review mb-2 group-hover:scale-110 transition-transform" />
          <div className="font-heading text-xl font-bold text-ink">{certificates.length}</div>
          <div className="text-label-xs text-ink-muted">Certificates</div>
        </Link>

        <Link to="/portfolio/achievements" className="surface-sunken p-4 rounded-xl border border-edge hover:border-brand transition-colors text-left group">
          <Award className="w-6 h-6 text-status-approved mb-2 group-hover:scale-110 transition-transform" />
          <div className="font-heading text-xl font-bold text-ink">{achievements.length}</div>
          <div className="text-label-xs text-ink-muted">Achievements</div>
        </Link>

        <Link to="/intro-video" className="surface-sunken p-4 rounded-xl border border-edge hover:border-brand transition-colors text-left group">
          <Video className="w-6 h-6 text-status-changes mb-2 group-hover:scale-110 transition-transform" />
          <div className="font-heading text-body-sm font-bold text-ink truncate">
            {video?.status || 'Not uploaded'}
          </div>
          <div className="text-label-xs text-ink-muted">Intro Video</div>
        </Link>
      </div>
    </div>
  );
};
