import React, { useState } from 'react';
import { Download, Users, CheckCircle, Percent, TrendingUp, Award, Loader2 } from 'lucide-react';
import { AdminLearningReport } from '../types';
import { learningAdminApi } from '../api';
import { EnrollmentsTable } from './EnrollmentsTable';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryGrid';

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
    <div className="space-y-8 animate-fade-in-up">
      {/* 1. ASYMMETRICAL OVERVIEW HERO */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-ink">{report.courseTitle}</h2>
              <p className="text-xs sm:text-sm text-ink-muted mt-0.5">Course Completion & Engagement Analytics</p>
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={downloading}
              className="btn btn-secondary text-xs min-h-[38px] px-3.5 inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" /> : <Download className="w-3.5 h-3.5 text-brand" />}
              <span>Export CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
            <div className="surface border border-edge rounded-xl p-4 shadow-xs card-hover">
              <div className="flex items-center gap-2 text-ink-muted text-xs font-medium">
                <Users className="w-4 h-4 text-brand" /> Total Enrolled
              </div>
              <p className="text-2xl font-bold text-ink mt-2 tabular-nums">{report.totalEnrolled}</p>
            </div>
            <div className="surface border border-edge rounded-xl p-4 shadow-xs card-hover">
              <div className="flex items-center gap-2 text-ink-muted text-xs font-medium">
                <CheckCircle className="w-4 h-4 text-status-approved" /> Completed
              </div>
              <p className="text-2xl font-bold text-ink mt-2 tabular-nums">{report.completedCount}</p>
            </div>
            <div className="surface border border-edge rounded-xl p-4 shadow-xs card-hover">
              <div className="flex items-center gap-2 text-ink-muted text-xs font-medium">
                <Percent className="w-4 h-4 text-brand" /> Completion Rate
              </div>
              <p className="text-2xl font-bold text-ink mt-2 tabular-nums">{Math.round(report.completionRate)}%</p>
            </div>
            <div className="surface border border-edge rounded-xl p-4 shadow-xs card-hover">
              <div className="flex items-center gap-2 text-ink-muted text-xs font-medium">
                <TrendingUp className="w-4 h-4 text-status-pending" /> Avg Progress
              </div>
              <p className="text-2xl font-bold text-ink mt-2 tabular-nums">{Math.round(report.averageProgress)}%</p>
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <Award size={13} />
                  Quiz Metrics
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  Quiz Stats
                </span>
              </div>
              <h3 className="text-base font-bold text-ink">Quiz Performance Index</h3>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Aggregated evaluation across all student quiz submissions for this module.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10 text-center">
                  <span className="text-ink-muted block text-[10px] uppercase font-semibold">Attempts</span>
                  <span className="font-bold text-ink text-base tabular-nums">{report.quizStats.totalAttempts}</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10 text-center">
                  <span className="text-ink-muted block text-[10px] uppercase font-semibold">Avg Score</span>
                  <span className="font-bold text-brand text-base tabular-nums">{Math.round(report.quizStats.averageScore)}%</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10 text-center">
                  <span className="text-ink-muted block text-[10px] uppercase font-semibold">Pass Rate</span>
                  <span className="font-bold text-status-approved text-base tabular-nums">{Math.round(report.quizStats.passRate)}%</span>
                </div>
              </div>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. STUDENT ENROLLMENTS DETAILED BREAKDOWN */}
      <div className="space-y-3">
        <h3 className="text-base font-heading font-bold text-ink">Student Progress Breakdown</h3>
        <EnrollmentsTable enrollments={report.studentProgress} />
      </div>
    </div>
  );
};

export default ReportsView;
