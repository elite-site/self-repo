import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StudentSubmission } from '../types';
import { UploadCloud, AlertCircle, CheckCircle, Clock, Video as VideoIcon, RotateCcw, XCircle } from 'lucide-react';

export const VideoPage = () => {
  const [submission, setSubmission] = useState<StudentSubmission | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We assume getMe returns the submission info for now or we can use another endpoint.
    // For now let's just simulate loading since API doesn't have getSubmission explicitly defined in types yet, 
    // but the prompt says getMe returns reviewStatus.
    api.getMe().then(async data => {
      // simulate submission from data
      if (data.reviewStatus && data.reviewStatus !== 'NONE') {
        setSubmission({
          id: '1',
          studentId: data.student.rollNo,
          status: data.reviewStatus,
          submittedAt: new Date().toISOString(),
          videoUploaded: true,
          videoUrl: 'exists',
          adminNotes: null,
          reviewText: null,
          reviewPros: [],
          reviewCons: [],
          reviewedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        const url = await api.getVideoBlobUrl().catch(() => null);
        if (url) setVideoUrl(url);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-elite-red border-t-transparent rounded-full animate-spin mx-auto"></div></div>;

  const StatusCard = () => {
    if (!submission) {
      return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 flex flex-col items-center text-center">
          <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
          <h3 className="font-semibold text-[#0B192C]">No Video Uploaded</h3>
          <p className="text-sm text-slate-500 mb-4">You haven't uploaded your introduction video yet.</p>
        </div>
      );
    }
    
    const colors: Record<string, string> = {
      'DRAFT': 'bg-slate-100 text-slate-700 border-slate-200',
      'PENDING': 'bg-amber-100 text-amber-800 border-amber-200',
      'UNDER_REVIEW': 'bg-violet-100 text-violet-800 border-violet-200',
      'APPROVED': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'REJECTED': 'bg-red-100 text-red-800 border-red-200',
      'CHANGES_REQUESTED': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    
    const icons: Record<string, any> = {
      'DRAFT': Clock, 'PENDING': Clock, 'UNDER_REVIEW': Clock, 'APPROVED': CheckCircle, 'REJECTED': XCircle, 'CHANGES_REQUESTED': AlertCircle
    };
    
    const Icon = icons[submission.status] || Clock;

    return (
      <div className={`border rounded-lg p-6 flex flex-col sm:flex-row gap-4 items-center justify-between ${colors[submission.status] || 'bg-slate-50'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-white/50 p-3 rounded-full"><Icon className="w-6 h-6" /></div>
          <div>
            <h3 className="font-bold">Status: {submission.status.replace('_', ' ')}</h3>
            <p className="text-sm opacity-80">Last updated: {new Date(submission.updatedAt || submission.submittedAt).toLocaleDateString()}</p>
          </div>
        </div>
        {(submission.status === 'APPROVED' || submission.status === 'REJECTED') && (
          <button className="px-4 py-2 bg-white text-sm font-medium rounded shadow-sm border border-black/10 hover:bg-slate-50">Replace Video</button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#0B192C]">Introduction Video</h1>
      <StatusCard />
      
      {submission?.adminNotes && (
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
          <h4 className="font-bold text-orange-800 text-sm mb-1 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Feedback from Reviewer</h4>
          <p className="text-orange-900 text-sm">{submission.adminNotes}</p>
        </div>
      )}

      {videoUrl ? (
        <div className="bg-black rounded-xl overflow-hidden aspect-video border border-[#E2E8F0]">
          <video src={videoUrl} controls className="w-full h-full object-contain" />
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-300 bg-white rounded-xl p-10 flex flex-col items-center text-center justify-center min-h-[300px]">
          <UploadCloud className="w-12 h-12 text-elite-red mb-4" />
          <h3 className="font-semibold text-lg text-[#0B192C]">Upload your video</h3>
          <p className="text-sm text-slate-500 max-w-md mt-2 mb-6">Drag and drop your MP4, MOV, or WEBM file here, or click to browse. Maximum file size is 25MB.</p>
          <button className="px-6 py-2.5 bg-elite-red hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors">Select File</button>
        </div>
      )}
    </div>
  );
};
