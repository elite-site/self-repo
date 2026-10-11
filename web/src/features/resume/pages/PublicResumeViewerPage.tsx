import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, FileText, ExternalLink, Download } from 'lucide-react';
import { ErrorState } from '@/shared/ui/ErrorState';
import { directoryApi } from '@/features/directory/api';
import { StudentSession } from '@/shared/types';
import { safeUrl } from '@/shared/utils/safeUrl';
import { resolveMediaUrl } from '@/shared/api';
import { Navbar } from '@/shared/layout/Navbar';
import { Footer } from '@/shared/layout/Footer';

interface PublicResumeViewerProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

export const PublicResumeViewerPage: React.FC<PublicResumeViewerProps> = ({ session, onLogout }) => {
  const { rollNo } = useParams<{ rollNo: string }>();
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResume = useCallback(() => {
    if (!rollNo) return;
    setLoading(true);
    setError(null);

    directoryApi
      .getPublicStudent(rollNo)
      .then((student) => {
        if (student) {
          setStudentName(student.name || rollNo);
          if (student.resumes && student.resumes.length > 0) {
            const res = student.resumes[0];
            const drivePreview = (res as any).previewUrl ||
              ((res as any).driveFileId && !(res as any).driveFileId.startsWith('mock_')
                ? `https://drive.google.com/file/d/${(res as any).driveFileId}/preview`
                : null);
            const raw = drivePreview || res.viewUrl || (res.id ? `/api/public/media/resume/${res.id}` : res.fileUrl);
            setResumeUrl(raw ? (raw.startsWith('http') ? raw : resolveMediaUrl(raw)) : null);
          } else {
            setResumeUrl(null);
          }
        } else {
          setResumeUrl(null);
        }
      })
      .catch((err) => {
        const status = err?.status ?? err?.response?.status;
        if (status === 404) {
          setResumeUrl(null);
          setError(null);
        } else {
          setResumeUrl(null);
          setError(err?.message || 'We could not reach the server to load this resume.');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [rollNo]);

  useEffect(() => {
    loadResume();
  }, [loadResume]);

  useEffect(() => {
    if (loading) {
      document.title = 'Loading resume… — ELITE Portal';
    } else if (studentName) {
      document.title = `${studentName}'s Resume — ELITE Portal`;
    } else {
      document.title = 'Resume — ELITE Portal';
    }
  }, [loading, studentName]);

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <div className="min-h-[100dvh] bg-surface-canvas flex flex-col">
      <Navbar session={session} onLogout={onLogout} />

      <h1 className="sr-only">{studentName ? `${studentName}'s Resume` : 'Student Resume'}</h1>

      <div className="bg-surface-inverse text-ink-inverse py-4 px-4 sm:px-10 flex flex-wrap items-center justify-between gap-3 border-b border-edge-inverse">
        <Link
          to={`/students/${rollNo}`}
          className="inline-flex items-center gap-2 text-ink-inverse/70 hover:text-on-primary text-label-sm font-semibold uppercase tracking-wider transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 text-ink-inverse/70" aria-hidden="true" />
          <span>Back to Profile</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          {resumeUrl && safeUrl(resumeUrl) && (
            <>
              <a
                href={safeUrl(resumeUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-raised hover:bg-surface-sunken text-ink hover:text-ink-brand rounded-lg text-label-sm font-bold transition-colors min-h-[44px]"
              >
                <ExternalLink className="w-3.5 h-3.5 text-ink-inverse/70" aria-hidden="true" />
                <span>Open in Tab</span>
              </a>
              <a
                href={safeUrl(`${resumeUrl}${resumeUrl.includes('?') ? '&' : '?'}download=1`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-raised hover:bg-surface-sunken text-ink hover:text-ink-brand rounded-lg text-label-sm font-bold transition-colors min-h-[44px]"
              >
                <Download className="w-3.5 h-3.5 text-ink-inverse/70" aria-hidden="true" />
                <span>Download PDF</span>
              </a>
            </>
          )}
          <div className="text-label-sm font-mono font-bold text-ink-inverse/70 flex items-center gap-2 min-w-0">
            <span className="truncate">{studentName || rollNo}</span>
            <span className="hidden sm:inline opacity-40">|</span>
            <span className="hidden sm:inline uppercase text-label-xs">{rollNo}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center bg-surface-sunken p-2 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-ink-muted">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
            <p className="text-body-sm font-medium">Retrieving verified resume…</p>
          </div>
        ) : resumeUrl && safeUrl(resumeUrl) ? (
          <div className="w-full h-full max-w-5xl bg-surface shadow-2xl rounded-xl overflow-hidden border border-edge flex flex-col flex-1 min-h-[75vh]">
            {isIOS ? (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 m-auto">
                <FileText className="w-16 h-16 text-brand" />
                <p className="text-body-md text-ink-secondary">iOS Safari preview is available via direct download.</p>
                <a href={safeUrl(resumeUrl)} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  Open PDF Viewer
                </a>
              </div>
            ) : (
              <iframe
                src={`${safeUrl(resumeUrl)}#toolbar=0`}
                className="w-full flex-1 border-0 min-h-[75vh]"
                title={`${studentName}'s Resume`}
              />
            )}
          </div>
        ) : error ? (
          <div className="text-center py-12 px-6 max-w-md">
            <ErrorState
              title="Unable to load resume"
              message={error}
              onRetry={loadResume}
            />
          </div>
        ) : (
          <div className="text-center py-20 px-6 max-w-md surface border border-edge rounded-xl shadow-xs">
            <FileText className="w-12 h-12 text-ink-muted mx-auto mb-3" />
            <h2 className="text-body-md font-bold text-ink">Resume Not Available</h2>
            <p className="text-body-sm text-ink-muted mt-1 mb-6">
              This student has not uploaded a public resume or it is currently undergoing review.
            </p>
            <Link to={`/students/${rollNo}`} className="btn btn-secondary">
              Return to Profile
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default PublicResumeViewerPage;
