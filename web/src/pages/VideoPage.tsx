import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { StudentSubmission } from '../types';
import {
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  Clock,
  Video as VideoIcon,
  RotateCcw,
  XCircle,
  FileVideo,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Download
} from 'lucide-react';

export const VideoPage: React.FC = () => {
  const [submission, setSubmission] = useState<StudentSubmission | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSubmission = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMe();
      if (data?.student?.submission) {
        setSubmission(data.student.submission);
        if (data.student.submission.videoUploaded) {
          const url = await api.getVideoBlobUrl().catch(() => null);
          if (url) setVideoUrl(url);
        }
      } else {
        setSubmission(null);
      }
    } catch {
      setError('Could not load introduction video status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmission();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file (MP4, WebM, MOV).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('Video file must be under 25MB.');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('video', file);

    try {
      await api.submitVideo(formData, (progressEvent) => {
        if (progressEvent.total) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(pct);
        }
      });
      setUploadSuccess(true);
      await loadSubmission();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#DC2626]" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'SUBMITTED':
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Under Review
          </span>
        );
      case 'CHANGES_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
            <AlertCircle className="w-3.5 h-3.5" /> Re-upload Requested
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0B192C]">Introduction Video</h1>
          <p className="text-xs text-neutral-500">
            Your 60–90 second professional department self-introduction video
          </p>
        </div>
        {submission && (
          <div className="flex items-center gap-2 shrink-0">
            {getStatusBadge(submission.status)}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={loadSubmission} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Video uploaded successfully and submitted for faculty moderation!</span>
        </div>
      )}

      {/* MAIN TWO-COLUMN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: VIDEO PLAYER OR UPLOADER (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0B192C]">Video Playback & Media</h2>
              <input
                type="file"
                ref={fileInputRef}
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                {videoUrl && (
                  <a
                    href={videoUrl}
                    download="self-introduction.mp4"
                    className="text-xs font-bold text-neutral-600 hover:text-[#0B192C] flex items-center gap-1 cursor-pointer bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-xs font-bold text-[#DC2626] hover:text-[#B5121B] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{submission?.videoUploaded ? 'Upload New Take' : 'Upload Video'}</span>
                </button>
              </div>
            </div>

            {uploading ? (
              <div className="border-2 border-dashed border-red-200 bg-red-50/40 rounded-2xl p-12 text-center space-y-3">
                <Loader2 className="w-10 h-10 animate-spin text-[#DC2626] mx-auto" />
                <h3 className="text-sm font-bold text-[#0B192C]">Uploading video... {uploadProgress}%</h3>
                <div className="w-64 max-w-full mx-auto bg-neutral-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#DC2626] h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-[11px] text-neutral-500">Do not close this window while the upload completes.</p>
              </div>
            ) : videoUrl ? (
              <div className="bg-black rounded-2xl overflow-hidden aspect-video border border-neutral-800 shadow-inner">
                <video src={videoUrl} controls className="w-full h-full object-contain" />
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 hover:border-[#DC2626] bg-neutral-50 hover:bg-red-50/20 rounded-2xl p-12 flex flex-col items-center text-center justify-center min-h-[300px] transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                  <FileVideo className="w-8 h-8 text-[#DC2626]" />
                </div>
                <h3 className="font-bold text-base text-[#0B192C]">Upload your self-introduction video</h3>
                <p className="text-xs text-neutral-500 max-w-sm mt-1.5 mb-6">
                  Recommended format: MP4 or WebM, 1080p, well-lit, under 25MB. Introduce your name, branch, interests, and career ambitions.
                </p>
                <button
                  type="button"
                  className="px-6 py-2.5 bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  Select Video File
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: GUIDELINES & REVIEW FEEDBACK (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          {/* REVIEW FEEDBACK (IF REVIEWED) */}
          {submission && (submission.reviewText || submission.adminNotes || submission.reviewPros?.length || submission.reviewCons?.length) ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-[#0B192C]">Faculty Review Feedback</h2>

              {submission.reviewText && (
                <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100 text-xs text-neutral-700 italic">
                  "{submission.reviewText}"
                </div>
              )}

              {submission.adminNotes && (
                <div className="p-3.5 bg-orange-50 rounded-xl border border-orange-200 text-xs text-orange-900">
                  <span className="font-bold block mb-1">Reviewer Note:</span>
                  {submission.adminNotes}
                </div>
              )}

              {submission.reviewPros && submission.reviewPros.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5" /> Strengths
                  </span>
                  <ul className="space-y-1">
                    {submission.reviewPros.map((pro, i) => (
                      <li key={i} className="text-xs text-neutral-600 pl-2 border-l-2 border-emerald-400">
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {submission.reviewCons && submission.reviewCons.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                    <ThumbsDown className="w-3.5 h-3.5" /> Suggestions
                  </span>
                  <ul className="space-y-1">
                    {submission.reviewCons.map((con, i) => (
                      <li key={i} className="text-xs text-neutral-600 pl-2 border-l-2 border-amber-400">
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          {/* RECORDING GUIDELINES */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4 text-xs">
            <h2 className="text-sm font-bold text-[#0B192C]">Recording Guidelines</h2>
            <ul className="space-y-2.5 text-neutral-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Duration:</strong> Between 60 and 90 seconds.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Framing:</strong> Landscape orientation, eye level, shoulders-up framing.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Audio:</strong> Quiet environment with clear voice projection.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Structure:</strong> Full Name & Roll Number → Technical Areas → Major Project → Career Ambitions.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
