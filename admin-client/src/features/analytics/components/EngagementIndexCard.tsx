import React from 'react';
import { Activity, FolderGit2, Award, CheckCircle, FileText, Calendar, Vote } from 'lucide-react';
import { AnalyticsResponse } from '../types';

interface EngagementIndexCardProps {
  summary: AnalyticsResponse['summary'];
}

export const EngagementIndexCard: React.FC<EngagementIndexCardProps> = ({ summary }) => {
  return (
    <div className="bg-surface border border-edge rounded-xl p-6 shadow-sm">
      <h2 className="text-base font-bold text-ink flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-status-approved" />
        Cross-Module Asset & Engagement Index
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-lg bg-surface-sunken border border-edge text-center">
          <FolderGit2 className="w-5 h-5 mx-auto text-ink-brand mb-2" />
          <div className="text-xl font-bold text-ink">{summary.totalProjects}</div>
          <div className="text-xs text-ink-muted mt-0.5">Projects</div>
        </div>
        <div className="p-4 rounded-lg bg-surface-sunken border border-edge text-center">
          <Award className="w-5 h-5 mx-auto text-status-pending mb-2" />
          <div className="text-xl font-bold text-ink">{summary.totalAchievements}</div>
          <div className="text-xs text-ink-muted mt-0.5">Achievements</div>
        </div>
        <div className="p-4 rounded-lg bg-surface-sunken border border-edge text-center">
          <CheckCircle className="w-5 h-5 mx-auto text-status-approved mb-2" />
          <div className="text-xl font-bold text-ink">{summary.totalCertificates}</div>
          <div className="text-xs text-ink-muted mt-0.5">Certificates</div>
        </div>
        <div className="p-4 rounded-lg bg-surface-sunken border border-edge text-center">
          <FileText className="w-5 h-5 mx-auto text-status-approved mb-2" />
          <div className="text-xl font-bold text-ink">{summary.totalResumes}</div>
          <div className="text-xs text-ink-muted mt-0.5">Resumes</div>
        </div>
        <div className="p-4 rounded-lg bg-surface-sunken border border-edge text-center">
          <Calendar className="w-5 h-5 mx-auto text-status-review mb-2" />
          <div className="text-xl font-bold text-ink">{summary.totalEvents}</div>
          <div className="text-xs text-ink-muted mt-0.5">Events Hosted</div>
        </div>
        <div className="p-4 rounded-lg bg-surface-sunken border border-edge text-center">
          <Vote className="w-5 h-5 mx-auto text-status-rejected mb-2" />
          <div className="text-xl font-bold text-ink">{summary.totalVotes}</div>
          <div className="text-xs text-ink-muted mt-0.5">Votes Polled</div>
        </div>
      </div>
    </div>
  );
};
