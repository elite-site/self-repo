import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, resolveMediaUrl } from '../../services/api';
import { StudentSession } from '../../types';
import { Loader2, ArrowLeft, FileText, ExternalLink, Download } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';

interface PublicResumeViewerProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

export const PublicResumeViewerPage: React.FC<PublicResumeViewerProps> = ({ session, onLogout }) => {
  const { rollNo } = useParams<{ rollNo: string }>();
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rollNo) return;
    setLoading(true);

    api
      .getPublicStudent(rollNo)
      .then((student) => {
        if (student) {
          setStudentName(student.name || rollNo);
          if (student.resumes && student.resumes.length > 0) {
            const res = student.resumes[0];
            const raw = res.viewUrl || (res.id ? `/api/public/media/resume/${res.id}` : res.fileUrl);
            setResumeUrl(raw ? resolveMediaUrl(raw) : null);
          } else {
            setResumeUrl(null);
          }
        }
      })
      .catch(() => {
        setResumeUrl(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [rollNo]);

  return (
    <div className="min-h-[100dvh] bg-surface-canvas flex flex-col">
      <Navbar session={session} onLogout={onLogout} />

      <div className="bg-surface-inverse text-ink-inverse py-4 px-4 sm:px-10 flex flex-wrap items-center justify-between gap-3 border-b border-edge-inverse">
        <Link
          to={`/students/${rollNo}`}
          className="inline-flex items-center gap-2 text-ink-inverse/70 hover:text-on-primary text-label-sm font-semibold uppercase tracking-wider transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 text-ink-inverse/70" aria-hidden="true" />
          <span>Back to Profile</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          {resumeUrl && (
            <>
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-raised hover:bg-surface-sunken text-ink hover:text-ink-brand rounded-lg text-label-sm font-bold transition-colors min-h-[44px]"
              >
                <ExternalLink className="w-3.5 h-3.5 text-ink-inverse/70" aria-hidden="true" />
                <span>Open in Tab</span>
              </a>
              <a
                href={`${resumeUrl}${resumeUrl.includes('?') ? '&' : '?'}download=1`}
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
            <FileText className="w-4 h-4 text-ink-inverse/70 shrink-0" aria-hidden="true" />
            <span className="truncate">{studentName ? `${studentName}, resume`  : 'Curriculum Vitae'}</span>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full bg-surface-inverse flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center min-h-[500px]">
            <Loader2 className="w-8 h-8 animate-spin text-ink-inverse" aria-hidden="true" />
          </div>
        ) : resumeUrl ? (
          <div
            className="w-full flex-1 flex flex-col"
            style={{ minHeight: 'calc(100dvh - 140px)' }}
          >
            <iframe
              src={resumeUrl}
              className="w-full flex-1 border-0"
              style={{ width: '100%', minHeight: 'calc(100dvh - 140px)', height: '100%' }}
              title="Student Resume Document"
              allow="autoplay"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[500px] text-ink-inverse/60 space-y-3">
            <div className="w-14 h-14 rounded-lg bg-surface-raised flex items-center justify-center text-ink-inverse/40">
              <FileText className="w-7 h-7" aria-hidden="true" />
            </div>
            <h3 className="text-body-md font-bold text-on-primary">No Approved Public Resume</h3>
            <p className="text-label-sm text-ink-inverse/50 max-w-sm">
              This student has not yet published an approved curriculum vitae to their public profile.
            </p>
            <div className="pt-2">
              <Link
                to={`/students/${rollNo}`}
                className="btn btn-secondary"
              >
                Return to Student Profile
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PublicResumeViewerPage;
