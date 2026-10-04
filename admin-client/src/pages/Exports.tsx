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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-edge">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Data Exports & Reporting Hub
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Generate and download standard Microsoft Excel (.xlsx) workbooks for accreditation, departmental audits, and event logistics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-sunken border border-edge rounded-lg text-xs font-medium text-ink-secondary">
            <Calendar className="w-3.5 h-3.5 text-ink-muted" />
            <span>Target Event:</span>
            <span className="font-bold text-ink">{selectedEventId}</span>
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="p-4 rounded-xl bg-status-bg-pending border border-edge flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-status-pending shrink-0 mt-0.5" />
        <div className="text-xs text-ink leading-relaxed">
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
              className="bg-surface border border-edge rounded-xl p-6 shadow-sm hover:border-edge-strong transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        dataset.color === 'blue'
                          ? 'bg-status-bg-approved text-status-approved'
                          : dataset.color === 'emerald'
                          ? 'bg-status-bg-approved text-status-approved'
                          : dataset.color === 'purple'
                          ? 'bg-status-bg-review text-status-review'
                          : 'bg-status-bg-rejected text-status-rejected'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-ink-muted">
                        {dataset.category}
                      </span>
                      <h3 className="text-base font-bold text-ink leading-snug">
                        {dataset.title}
                      </h3>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-surface-sunken text-ink-secondary rounded">
                    <FileSpreadsheet className="w-3 h-3 text-status-approved" />
                    .XLSX
                  </span>
                </div>

                <p className="text-xs text-ink-secondary mb-4 leading-relaxed">
                  {dataset.description}
                </p>

                {/* Schema preview tags */}
                <div className="mb-6">
                  <span className="text-xs font-medium text-ink-muted block mb-1.5">
                    Schema attributes included:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {dataset.fields.map((field) => (
                      <span
                        key={field}
                        className="text-xs font-medium px-2 py-0.5 bg-surface-sunken text-ink-secondary rounded border border-edge/60"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-edge flex items-center justify-between">
                <span className="text-xs text-ink-muted flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-approved" />
                  Ready to stream
                </span>
                <button
                  onClick={() => handleDownload(dataset.id, dataset.getUrl(), dataset.filename)}
                  disabled={isDownloadingThis}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-surface-inverse text-ink-inverse text-xs font-bold rounded-lg hover:opacity-90 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Download className={`w-3.5 h-3.5 ${isDownloadingThis ? 'animate-bounce' : ''}`} />
                  {isDownloadingThis ? 'Generating workbook…' : 'Download'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* File Delivery Architecture Details */}
      <div className="bg-surface-sunken border border-edge rounded-xl p-5 text-xs text-ink-secondary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-ink-muted" />
          <span>
            Workbooks are streamed directly from the PostgreSQL engine via ExcelJS with header auto-styling and column widths.
          </span>
        </div>
        <span className="font-mono text-xs text-ink-muted">Content-Type: application/vnd.openxmlformats</span>
      </div>
    </div>
  );
};
