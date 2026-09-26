import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, resolveMediaUrl } from '../../services/api';
import { StudentSession } from '../../types';
import { Loader2, ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
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
            // The public student API returns the raw Prisma row, which includes
            // driveFileId. Build the direct media URL instead of relying on the
            // redirect endpoint — the redirect adds an extra hop and would fall
            // back to a mock URL when the file is missing.
            if (res.driveFileId) {
              setResumeUrl(resolveMediaUrl(`/api/public/media/resume/${res.driveFileId}`));
            } else {
              setResumeUrl(null);
            }
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-left">
      <Navbar session={session} onLogout={onLogout} />

      <div className="bg-[#0B192C] text-white py-4 px-6 sm:px-10 flex items-center justify-between border-b border-slate-800">
        <Link
          to={`/students/${rollNo}`}
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-elite-red" />
          <span>Back to Profile</span>
        </Link>
        <div className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
          <FileText className="w-4 h-4 text-elite-red" />
          <span>{studentName ? `${studentName} — Resume` : 'Curriculum Vitae'}</span>
        </div>
      </div>

      <main className="flex-1 w-full bg-slate-900 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center min-h-[500px]">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : resumeUrl ? (
          <div className="flex-1 w-full h-[calc(100vh-140px)]">
            <iframe
              src={resumeUrl}
              className="w-full h-full border-none"
              title="Student Resume Document"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[500px] text-slate-300 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">No Approved Public Resume</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              This student has not yet published an approved curriculum vitae to their public profile.
            </p>
            <div className="pt-2">
              <Link
                to={`/students/${rollNo}`}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-colors inline-block"
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
