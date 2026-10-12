import React, { useState } from 'react';
import { Download, Users, CheckCircle, Percent, TrendingUp, Award, Loader2 } from 'lucide-react';
import { AdminLearningReport } from '../types';
import { learningAdminApi } from '../api';
import { EnrollmentsTable } from './EnrollmentsTable';

export interface ReportsViewProps {
  report: AdminLearningReport;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ report }) => {
  const [downloading, setDownloading] = useState(false);

  const handleExportCsv = async () => {
    try {
      setDownloading(true);
      const blob = await learningAdminApi.exportReportCsv(report.courseId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `course-${report.courseId}-report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export CSV report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-heading font-bold text-ink">{report.courseTitle}</h2>
          <p className="text-xs text-ink-muted">Course Completion & Engagement Analytics</p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={downloading}
          className="btn btn-secondary text-xs inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="surface border border-edge rounded-xl p-4">
          <div className="flex items-center gap-2 text-ink-muted text-xs font-medium">
            <Users className="w-4 h-4 text-brand" /> Total Enrolled
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{report.totalEnrolled}</p>
        </div>
        <div className="surface border border-edge rounded-xl p-4">
          <div className="flex items-center gap-2 text-ink-muted text-xs font-medium">
            <CheckCircle className="w-4 h-4 text-status-approved" /> Completed
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{report.completedCount}</p>
        </div>
        <div className="surface border border-edge rounded-xl p-4">
          <div className="flex items-center gap-2 text-ink-muted text-xs font-medium">
            <Percent className="w-4 h-4 text-brand" /> Completion Rate
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{Math.round(report.completionRate)}%</p>
        </div>
        <div className="surface border border-edge rounded-xl p-4">
          <div className="flex items-center gap-2 text-ink-muted text-xs font-medium">
            <TrendingUp className="w-4 h-4 text-status-pending" /> Avg Progress
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{Math.round(report.averageProgress)}%</p>
        </div>
      </div>

      {report.quizStats && (
        <div className="surface border border-edge rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
            <Award className="w-4 h-4 text-brand" /> Quiz Performance
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-inset p-3 rounded-lg border border-edge">
              <span className="text-xs text-ink-muted">Total Attempts</span>
              <p className="text-lg font-bold text-ink mt-1">{report.quizStats.totalAttempts}</p>
            </div>
            <div className="bg-surface-inset p-3 rounded-lg border border-edge">
              <span className="text-xs text-ink-muted">Average Score</span>
              <p className="text-lg font-bold text-ink mt-1">{Math.round(report.quizStats.averageScore)}%</p>
            </div>
            <div className="bg-surface-inset p-3 rounded-lg border border-edge">
              <span className="text-xs text-ink-muted">Pass Rate</span>
              <p className="text-lg font-bold text-ink mt-1">{Math.round(report.quizStats.passRate)}%</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-ink">Student Progress Breakdown</h3>
        <EnrollmentsTable enrollments={report.studentProgress} />
      </div>
    </div>
  );
};
