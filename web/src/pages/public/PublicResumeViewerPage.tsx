import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Loader2, ArrowLeft, FileText } from 'lucide-react';
import { Navbar } from '../../components/Navbar';

export const PublicResumeViewerPage = () => {
  const { rollNo } = useParams();
  const [resumeData, setResumeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mocking fetching public resume by rollNo, since api doesn't have it explicitly
    // Assuming getPublicStudent could return it, or there is another endpoint.
    // For now we simulate an empty state.
    setTimeout(() => {
      setResumeData(null);
      setLoading(false);
    }, 1000);
  }, [rollNo]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Navbar session={null} onLogout={()=>{}} onNavigate={()=>{}} />
      <div className="bg-[#0B192C] py-4 px-6 flex items-center justify-between">
        <Link to={`/students/${rollNo}`} className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium transition-colors"><ArrowLeft className="w-4 h-4"/> Back to Profile</Link>
        <div className="text-white font-bold flex items-center gap-2"><FileText className="w-4 h-4"/> Resume</div>
      </div>
      <main className="flex-1 w-full bg-slate-800">
        {loading ? (
          <div className="flex-1 flex items-center justify-center h-full min-h-[500px]">
            <Loader2 className="w-8 h-8 animate-spin text-white"/>
          </div>
        ) : resumeData?.fileUrl ? (
          <iframe src={resumeData.fileUrl} className="w-full h-[calc(100vh-140px)] border-none" title="Resume PDF" />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[500px] text-slate-400">
            <FileText className="w-16 h-16 mb-4 opacity-50" />
            <p>No resume uploaded for this student.</p>
          </div>
        )}
      </main>
    </div>
  );
};
