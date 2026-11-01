import React, { useState } from 'react';
import { Calendar, ShieldAlert, Layers, Users, Video, ClipboardList, Lock, DownloadCloud, ShieldCheck } from 'lucide-react';
import { ACTIVE_EVENT_ID } from '@/shared/layout';
import { registrationsApi } from '../api';
import { ExportCard, DatasetItem } from '../components/ExportCard';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryGrid';

export const ExportsPage: React.FC = () => {
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

  const exportDatasets: DatasetItem[] = [
    {
      id: 'roster',
      title: 'Student Master Roster',
      category: 'Academic Directory',
      icon: Users,
      color: 'blue',
      description:
        'Complete directory of all registered students with roll numbers, contact details, year, section, and their current video submission status.',
      fields: ['Roll Number', 'Full Name', 'Email', 'Year & Section', 'Branch', 'Submission Status', 'Rating', 'Review Notes'],
      getUrl: () => registrationsApi.getStudentsExportUrl(selectedEventId),
      filename: `student-roster-${selectedEventId}.xlsx`,
    },
    {
      id: 'submissions',
      title: 'Video Submissions & Faculty Reviews',
      category: 'Evaluation Data',
      icon: Video,
      color: 'emerald',
      description:
        'Detailed breakdown of all uploaded introduction videos, qualitative review feedback, pros/cons keywords, faculty rating, and Google Drive identifiers.',
      fields: ['Submission ID', 'Student Roll No', 'Video Drive File ID', 'Rating (GOOD/AVG/POOR)', 'Faculty Comments', 'Submitted At', 'Reviewed At'],
      getUrl: () => registrationsApi.getSubmissionsExportUrl(selectedEventId),
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
      getUrl: () => registrationsApi.getRegistrationsExportUrl({ eventId: selectedEventId }),
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
      getUrl: () => registrationsApi.getActivityLogsExportUrl(),
      filename: `activity-audit-logs-${Date.now()}.xlsx`,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* 1. ASYMMETRICAL TOP SECTION */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-edge">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
                <DownloadCloud size={13} className="shrink-0" />
                <span>Accreditation & Data Warehousing</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-sans">
                Data Exports & Reporting Hub
              </h1>
              <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                Generate and download standard Microsoft Excel (.xlsx) workbooks for accreditation, departmental audits, and event logistics.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-sunken border border-edge rounded-lg text-xs font-medium text-ink-secondary">
                <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                <span>Target Event:</span>
                <span className="font-bold text-ink font-mono">{selectedEventId}</span>
              </div>
            </div>
          </div>

          {/* Confidentiality Notice */}
          <div className="p-4 rounded-xl bg-status-pending/10 border border-status-pending/20 flex items-start gap-3 mt-1">
            <ShieldAlert className="w-5 h-5 text-status-pending shrink-0 mt-0.5" />
            <div className="text-xs text-ink leading-relaxed">
              <strong className="font-semibold text-status-pending">Confidentiality Notice:</strong> Exported files contain Student Personally Identifiable Information (PII) including email addresses, phone contacts, and evaluation remarks. Ensure downloaded workbooks are stored in accordance with institutional data privacy policies and deleted after official tabulation.
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <ShieldCheck size={13} />
                  Streaming Engine
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  ExcelJS Fast
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Zero-Memory Buffer Pipeline</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Workbooks are streamed directly from the PostgreSQL engine via ExcelJS with header auto-styling, font roles, and proportional column widths.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Format</span>
                  <span className="font-bold text-ink text-sm">.xlsx (OpenXML)</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Datasets</span>
                  <span className="font-bold text-brand text-sm">{exportDatasets.length} Available</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted font-mono text-[11px]">
              <Layers size={13} className="text-brand shrink-0" />
              <span className="truncate">Content-Type: application/vnd.openxmlformats</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. MASONRY GRID OF DATASET CARDS */}
      <MasonryGrid cols={2}>
        {exportDatasets.map((dataset) => (
          <MasonryItem key={dataset.id}>
            <div className="card-hover">
              <ExportCard
                dataset={dataset}
                isDownloading={downloading === dataset.id}
                onDownload={handleDownload}
              />
            </div>
          </MasonryItem>
        ))}
      </MasonryGrid>
    </div>
  );
};

export default ExportsPage;
