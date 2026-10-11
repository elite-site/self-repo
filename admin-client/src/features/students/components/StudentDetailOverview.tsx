import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface StudentDetailOverviewProps {
  pendingChanges: { type: string; title: string; note?: string }[];
  projectsCount: number;
  achievementsCount: number;
  certificatesCount: number;
  introVideo: any;
  resume: any;
}

export const StudentDetailOverview: React.FC<StudentDetailOverviewProps> = ({
  pendingChanges,
  projectsCount,
  achievementsCount,
  certificatesCount,
  introVideo,
  resume,
}) => {
  return (
    <div className="space-y-6">
      {/* Pending Revisions Banner */}
      {pendingChanges.length > 0 && (
        <div className="p-4 bg-status-bg-changes/80 border border-edge rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-status-changes shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-ink">
              {pendingChanges.length} Revision Request{pendingChanges.length > 1 ? 's' : ''} Pending on Student
            </p>
            <div className="space-y-1 pt-1">
              {pendingChanges.map((item, i) => (
                <div key={i} className="text-ink">
                  • <strong>{item.type} ({item.title}):</strong> {item.note || 'Awaiting revised submission'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* At a glance */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Projects', value: String(projectsCount) },
          { label: 'Achievements', value: String(achievementsCount) },
          { label: 'Certificates', value: String(certificatesCount) },
          { label: 'Intro Video', value: introVideo ? introVideo.status.replace(/_/g, ' ') : 'Not uploaded' },
          { label: 'Resume', value: resume ? resume.status.replace(/_/g, ' ') : 'Not uploaded' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-edge rounded-lg p-4">
            <p className="text-xs font-bold text-ink-muted">{stat.label}</p>
            <p className="text-sm font-semibold text-ink mt-1 capitalize">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
