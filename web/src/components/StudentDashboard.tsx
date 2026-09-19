import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  UploadCloud,
  Film,
  RefreshCw,
  CheckCircle2,
  MessageSquare,
  Clock,
  UserRound,
  LogOut,
  Mic,
  VideoOff,
} from 'lucide-react';
import { StudentProfile } from '../types';
import { api } from '../services/api';

interface StudentDashboardProps {
  initialStudent: StudentProfile;
  onLogout: () => void;
}

const MAX_VIDEO_MB = 25;
const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${date} • ${time}`;
}

function studentYearLabel(year: number): string {
  return ['', '1st', '2nd', '3rd', '4th'][year] || `${year}th`;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ initialStudent, onLogout }) => {
  const [student, setStudent] = useState<StudentProfile>(initialStudent);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshStudent = useCallback(async () => {
    try {
      const res = await api.getMe();
      setStudent(res.student);
      return res.student;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    refreshStudent();
  }, [refreshStudent]);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const loadVideo = async () => {
      if (!student.submission?.videoUploaded) {
        setVideoUrl(null);
        return;
      }
      setVideoLoading(true);
      try {
        const url = await api.getVideoBlobUrl();
        if (!cancelled) {
          objectUrl = url;
          setVideoUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      } catch {
        if (!cancelled) setVideoUrl(null);
      } finally {
        if (!cancelled) setVideoLoading(false);
      }
    };
    loadVideo();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [student.submission?.videoUploaded, student.submission?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileError(null);
    setSelectedFile(null);
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Please choose an MP4, MOV, or WEBM video file.');
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setFileError(`This video is too large. Maximum allowed size is ${MAX_VIDEO_MB} MB.`);
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setFileError('Please choose a video file first.');
      return;
    }
    setUploading(true);
    setSuccessMessage(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      const res = await api.submitVideo(formData, (e) => {
        if (e.total) {
          setUploadProgress(Math.round((e.loaded * 100) / e.total));
        }
      });
      setSuccessMessage(res.message || 'Your video was uploaded successfully.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      const updated = await refreshStudent();
      if (updated?.submission?.videoUploaded) {
        const url = await api.getVideoBlobUrl();
        setVideoUrl(url);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.field === 'video'
          ? err?.response?.data?.message
          : err?.response?.data?.message || 'Upload failed. Please try again.';
      setFileError(msg);
    } finally {
      setUploading(false);
    }
  };

  const reviewed = Boolean(
    student.submission?.reviewedAt &&
      (student.submission.reviewText ||
        student.submission.reviewPros.length > 0 ||
        student.submission.reviewCons.length > 0)
  );

  const initials = student.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div className="space-y-8 text-left">
      {/* 1. PROFILE BANNER */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-elite-red text-white flex items-center justify-center text-2xl font-extrabold font-display shrink-0">
          {initials || <UserRound className="w-7 h-7" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] sm:text-[11px] font-bold font-mono tracking-widest text-elite-red uppercase">
            Welcome Back
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-elite-black font-display tracking-tight truncate">
            {student.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 mt-1 font-mono">
            <span className="font-semibold text-neutral-700">{student.rollNo}</span>
            <span>•</span>
            <span>{student.branch}-{student.section}</span>
            <span>•</span>
            <span>{studentYearLabel(student.year)} Year</span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-red-50 hover:text-elite-red border border-neutral-200 text-neutral-600 text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>

      {/* 2. STATUS ALERTS */}
      {successMessage && (
        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-start gap-3 text-left">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider font-display">Upload Complete</h4>
            <p className="text-xs font-medium leading-relaxed mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* 3. REVIEW RESPONSE PANEL */}
      {reviewed ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 space-y-4 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-emerald-900 font-display tracking-tight">
                Your Coordinators Have Responded
              </h2>
              <p className="text-[11px] text-emerald-700 font-semibold">
                Reviewed on {formatDateTime(student.submission!.reviewedAt)}
              </p>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-2xl p-5 text-sm text-neutral-700 leading-relaxed">
            {student.submission!.reviewText
              ? student.submission!.reviewText
              : 'Thank you for submitting your introduction video!'}
          </div>

          {student.submission!.reviewPros.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                What you did well
              </div>
              <div className="flex flex-wrap gap-2">
                {student.submission!.reviewPros.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold">
                    # {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {student.submission!.reviewCons.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-elite-red">
                Things to improve
              </div>
              <div className="flex flex-wrap gap-2">
                {student.submission!.reviewCons.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-elite-darkred text-white text-[11px] font-semibold">
                    # {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : student.submission?.videoUploaded ? (
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-3 text-left">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider font-display">Under Review</h4>
            <p className="text-xs font-medium leading-relaxed mt-0.5">
              Your video was uploaded on {formatDateTime(student.submission.submittedAt)}. Your coordinators will review it and send you feedback here.
            </p>
          </div>
        </div>
      ) : null}

      {/* 4. WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: PREVIEW + UPLOAD */}
        <div className="lg:col-span-7 space-y-6">
          {/* Video Preview */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-elite-red flex items-center justify-center font-bold">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-elite-black font-display tracking-tight">
                  Your Introduction Video
                </h2>
                <p className="text-[11px] text-neutral-500 font-semibold">
                  {student.submission?.videoUploaded
                    ? `Uploaded ${formatDateTime(student.submission.submittedAt)}`
                    : 'Not uploaded yet'}
                </p>
              </div>
            </div>

            {videoLoading ? (
              <div className="bg-neutral-100 border border-dashed border-neutral-300 rounded-xl p-12 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-elite-red" />
                Loading your video...
              </div>
            ) : videoUrl ? (
              <div className="bg-neutral-900 rounded-xl overflow-hidden shadow-md">
                <video src={videoUrl} controls playsInline className="w-full max-h-96" />
              </div>
            ) : (
              <div className="bg-neutral-100 border border-dashed border-neutral-300 rounded-xl p-12 text-center space-y-2">
                <VideoOff className="w-6 h-6 text-neutral-400 mx-auto" />
                <p className="text-xs text-neutral-500">
                  No video yet. Use the upload box below to submit your self-introduction.
                </p>
              </div>
            )}
          </div>

          {/* Upload / Resubmit Card */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-elite-red flex items-center justify-center font-bold">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-elite-black font-display tracking-tight">
                  {student.submission?.videoUploaded ? 'Resubmit Video' : 'Upload Video'}
                </h2>
                <p className="text-[11px] text-neutral-500 font-semibold">
                  {student.submission?.videoUploaded
                    ? 'Uploading a new video replaces the previous one and clears the old review.'
                    : `MP4, MOV, or WEBM up to ${MAX_VIDEO_MB} MB`}
                </p>
              </div>
            </div>

            <div className="border-2 border-dashed border-neutral-300 rounded-2xl p-6 text-center space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                onChange={handleFileChange}
                className="hidden"
                id="video-upload"
              />
              <label
                htmlFor="video-upload"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-elite-red hover:bg-elite-darkred text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-red-600/20 transition-colors cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                Choose Introduction Video
              </label>
              <p className="text-[11px] text-neutral-500">
                {selectedFile
                  ? `Selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`
                  : 'Maximum 25 MB • MP4 / MOV / WEBM'}
              </p>
            </div>

            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-neutral-500 font-semibold">
                  <span>Uploading your video...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-elite-red rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {fileError && (
              <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-elite-darkred text-[11px] font-medium">
                {fileError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={uploading || !selectedFile}
              className="w-full py-3 px-4 rounded-xl bg-elite-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{student.submission?.videoUploaded ? 'Resubmit Video' : 'Submit Introduction Video'}</span>
            </button>
          </div>
        </div>

        {/* RIGHT: ABOUT ASIDE */}
        <div className="lg:col-span-5 space-y-6">
          <p className="text-xs font-semibold text-neutral-500 leading-relaxed text-left">
            Submitting a video replaces your previous upload and starts a fresh review. Keep it natural, unrehearsed, and between 1–3 minutes — no scripts, no AI-generated introductions.
          </p>
          <div className="bg-neutral-900 text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-lg border border-neutral-800">
            <h3 className="text-base font-extrabold font-display tracking-tight text-white uppercase border-b border-neutral-800 pb-3">
              Review Keywords
            </h3>
            <div className="space-y-3 text-xs text-neutral-300">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5">Pros</div>
                <div className="flex flex-wrap gap-1.5">
                  {['expressive posture', 'commanding voice', 'focused mindset', 'perfect lighting & background'].map((t) => (
                    <span key={t} className="px-2 py-1 rounded-full bg-emerald-900/40 border border-emerald-800 text-emerald-300 text-[10px] font-semibold">
                      # {t}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1.5">Cons</div>
                <div className="flex flex-wrap gap-1.5">
                  {['unclear thoughts', 'broken voice', 'bad lighting'].map((t) => (
                    <span key={t} className="px-2 py-1 rounded-full bg-red-900/40 border border-red-800 text-red-300 text-[10px] font-semibold">
                      # {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};