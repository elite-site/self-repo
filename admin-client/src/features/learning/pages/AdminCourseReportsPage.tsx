import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { useAdminReportsQuery } from '../hooks/useAdminReports';
import { ReportsView } from '../components/ReportsView';

export const AdminCourseReportsPage: React.FC = () => {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading, error } = useAdminReportsQuery(courseId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-edge pb-4">
        <button type="button" onClick={() => navigate('/admin/learning')} className="btn btn-ghost p-1.5" aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-heading font-bold text-ink flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-brand" /> Course Analytics & Reports
          </h1>
          <p className="text-xs text-ink-muted">View completion rates, quiz scores, and export progress report</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-ink-muted">Loading analytics report...</div>
      ) : error || !report ? (
        <div className="p-8 surface rounded-xl border border-edge text-center text-status-rejected text-xs">
          Failed to load course report.
        </div>
      ) : (
        <ReportsView report={report} />
      )}
    </div>
  );
};
