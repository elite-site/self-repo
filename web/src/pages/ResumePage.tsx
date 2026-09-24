import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { UploadCloud, CheckCircle, Clock, FileText, AlertCircle } from 'lucide-react';

export const ResumePage = () => {
  const [resumeData, setResumeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getResume().then(data => setResumeData(data)).catch(() => setResumeData(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-elite-red border-t-transparent rounded-full animate-spin mx-auto"></div></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#0B192C]">My Resume</h1>
      
      {!resumeData ? (
        <div className="border border-[#E2E8F0] rounded-lg p-6 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-slate-400" />
            <div>
              <h3 className="font-bold text-slate-700">No Resume Uploaded</h3>
              <p className="text-sm text-slate-500">Please upload your latest resume (PDF only).</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            <div>
              <h3 className="font-bold text-emerald-800">Resume Approved</h3>
              <p className="text-sm text-emerald-600">Your resume is live on your public profile.</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-white text-sm font-medium rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-100">Replace</button>
        </div>
      )}

      {resumeData?.fileUrl ? (
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden h-[600px]">
          <iframe src={resumeData.fileUrl} className="w-full h-full border-none" title="Resume PDF" />
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-300 bg-white rounded-xl p-10 flex flex-col items-center text-center justify-center min-h-[300px]">
          <FileText className="w-12 h-12 text-elite-red mb-4" />
          <h3 className="font-semibold text-lg text-[#0B192C]">Upload Resume</h3>
          <p className="text-sm text-slate-500 max-w-md mt-2 mb-6">PDF files only. Maximum file size is 10MB.</p>
          <button className="px-6 py-2.5 bg-[#0B192C] hover:bg-black text-white font-medium rounded-lg shadow-sm transition-colors">Select PDF</button>
        </div>
      )}
    </div>
  );
};
