import React, { useState } from 'react';
import { adminApi } from '../services/api';
import { ACTIVE_EVENT_ID } from '../components/Sidebar';
import {
  Download,
  FileSpreadsheet,
  Users,
  Video,
  ClipboardList,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Lock,
  Layers,
} from 'lucide-react';

export const Exports: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const selectedEventId = ACTIVE_EVENT_ID;

  const handleDownload = (type: string, url: string, filename: string) => {
    setDownloading(type);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setTimeout(() => setDownloading(null), 1200);
    }
  };

  const exportDatasets = [
    {
      id: 'roster',
      title: 'Student Master Roster',
      category: 'Academic Directory',
      icon: Users,
      color: 'blue',
      description:
        'Complete directory of all registered students with roll numbers, contact details, year, section, and their current video submission status.',
      fields: ['Roll Number', 'Full Name', 'Email', 'Year & Section', 'Branch', 'Submission Status', 'Rating', 'Review Notes'],
      getUrl: () => adminApi.getStudentsExportUrl(selectedEventId),
      filename: `student-roster-${selectedEventId}.xlsx`,
    },
    {
      id: 'submissions',
      title: 'Video Submissions & Faculty Reviews',
      category: 'Evaluation Data',
      icon: Video,
      color: 'emerald',
      description:
        'Detailed breakdown of all uploaded self-introduction videos, qualitative review feedback, pros/cons keywords, faculty rating, and Google Drive identifiers.',
      fields: ['Submission ID', 'Student Roll No', 'Video Drive File ID', 'Rating (GOOD/AVG/POOR)', 'Faculty Comments', 'Submitted At', 'Reviewed At'],
      getUrl: () => adminApi.getSubmissionsExportUrl(selectedEventId),
      filename: `video-submissions-${selectedEventId}.xlsx`,
    },
    {
      id: 'registrations',
      title: 'Event Registrations & Team Rosters',
      category: 'Co-Curricular Events',
      icon: ClipboardList,
      color: 'purple',
      description:
        'Every individual and team registration across campus events, including team leaders, co-members, status flags, and custom questionnaire responses.',
      fields: ['Registration ID', 'Event Name', 'Participant Roll No', 'Team Name & Leader', 'Members List', 'Approval Status', 'Form Answers'],
      getUrl: () => adminApi.getRegistrationsExportUrl({ eventId: selectedEventId }),
      filename: `event-registrations-${selectedEventId}.xlsx`,
    },
    {
      id: 'audit',
      title: 'Security & Activity Audit Logs',
      category: 'Compliance & Governance',
      icon: Lock,
      color: 'rose',
      description:
        'Forensic security audit trail capturing all administrative operations, rating submissions, team removals, status overrides, and system timestamps.',
      fields: ['Timestamp (UTC)', 'Admin Username', 'Category', 'Action Taken', 'Affected Student', 'Outcome Status', 'IP / Details'],
      getUrl: () => adminApi.getActivityLogsExportUrl(),
      filename: `activity-audit-logs-${Date.now()}.xlsx`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Data Exports & Reporting Hub
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Generate and download standard Microsoft Excel (.xlsx) workbooks for accreditation, departmental audits, and event logistics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300">
            <Calendar className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>Target Event:</span>
            <span className="font-bold text-neutral-900 dark:text-white">{selectedEventId}</span>
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <strong className="font-semibold">Confidentiality Notice:</strong> Exported files contain Student Personally Identifiable Information (PII) including email addresses, phone contacts, and evaluation remarks. Ensure downloaded workbooks are stored in accordance with institutional data privacy policies and deleted after official tabulation.
        </div>
      </div>

      {/* Dataset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportDatasets.map((dataset) => {
          const Icon = dataset.icon;
          const isDownloadingThis = downloading === dataset.id;

          return (
            <div
              key={dataset.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        dataset.color === 'blue'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                          : dataset.color === 'emerald'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          : dataset.color === 'purple'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                        {dataset.category}
                      </span>
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-snug">
                        {dataset.title}
                      </h3>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    .XLSX
                  </span>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed">
                  {dataset.description}
                </p>

                {/* Schema preview tags */}
                <div className="mb-6">
                  <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 block mb-1.5">
                    Schema attributes included:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {dataset.fields.map((field) => (
                      <span
                        key={field}
                        className="text-[10px] font-medium px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 rounded border border-neutral-200/60 dark:border-neutral-700/60"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Ready to stream
                </span>
                <button
                  onClick={() => handleDownload(dataset.id, dataset.getUrl(), dataset.filename)}
                  disabled={isDownloadingThis}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Download className={`w-3.5 h-3.5 ${isDownloadingThis ? 'animate-bounce' : ''}`} />
                  {isDownloadingThis ? 'Generating Workbook...' : 'Download Excel'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* File Delivery Architecture Details */}
      <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 text-xs text-neutral-600 dark:text-neutral-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-neutral-400" />
          <span>
            Workbooks are streamed directly from the PostgreSQL engine via ExcelJS with header auto-styling and column widths.
          </span>
        </div>
        <span className="font-mono text-[11px] text-neutral-400">Content-Type: application/vnd.openxmlformats</span>
      </div>
    </div>
  );
};
