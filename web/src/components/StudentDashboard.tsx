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
  RotateCcw,
  FileCheck,
  ShieldCheck,
  Sparkles,
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

type ResponseTab = 'response' | 'resubmit';

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ initialStudent, onLogout }) => {
  const [student, setStudent] = useState<StudentProfile>(initialStudent);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState<ResponseTab>('response');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const hasSubmission = Boolean(student.submission?.videoUploaded);

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
      if (hasSubmission) {
        setVideoLoading(true);
        setVideoError(false);
        try {
          const url = await api.getVideoBlobUrl();
          if (!cancelled) {
            objectUrl = url;
            setVideoUrl((prev) => {
              if (prev && prev !== url) URL.revokeObjectURL(prev);
              return url;
            });
          } else {
            URL.revokeObjectURL(url);
          }
        } catch {
          if (!cancelled) {
            setVideoUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return null;
            });
            setVideoError(true);
          }
        } finally {
          if (!cancelled) setVideoLoading(false);
        }
      } else {
        setVideoUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setVideoError(false);
      }
    };
    loadVideo();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasSubmission, student.submission?.id, reloadKey]);

  const retryLoadVideo = () => {
    setVideoError(false);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setVideoLoading(true);
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const clearPreview = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileError(null);
    clearPreview();
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Please choose an MP4, MOV, or WEBM video file.');
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setFileError(`This video is too large. Maximum allowed size is ${MAX_VIDEO_MB} MB.`);
      return;
    }
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreviewUrl(url);
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
      
      const localUrl = previewUrlRef.current;
      if (localUrl) {
        setVideoUrl(localUrl);
        setVideoError(false);
      }
      setActiveTab('response');
      clearPreview();

      refreshStudent().then((updated) => {
        if (updated?.submission?.videoUploaded && !localUrl) {
          api.getVideoBlobUrl()
            .then((url) => {
              setVideoUrl((prev) => {
                if (prev && prev !== url) URL.revokeObjectURL(prev);
                return url;
              });
              setVideoError(false);
            })
            .catch(() => null);
        }
      });
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

  const renderVideoStage = () => {
    if (videoLoading) {
      return (
        <div className="flex flex-col items-center gap-2 py-12 text-xs text-neutral-400">
          <RefreshCw className="w-5 h-5 animate-spin text-elite-red" />
          Loading your video...
        </div>
      );
    }
    if (previewUrl) {
      return (
        <video src={previewUrl} controls playsInline className="w-full max-h-96" />
      );
    }
    if (videoUrl) {
      return (
        <video src={videoUrl} controls playsInline className="w-full max-h-96" />
      );
    }
    if (hasSubmission) {
      return (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <VideoOff className="w-6 h-6 text-neutral-300" />
          <p className="text-xs text-neutral-400">
            Your uploaded video is unavailable right now.
          </p>
          <button
            onClick={retryLoadVideo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-neutral-200 text-elite-red text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer hover:bg-red-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <VideoOff className="w-6 h-6 text-neutral-300" />
        <p className="text-xs text-neutral-400">
          No video yet. Pick a clip below to preview it here.
        </p>
      </div>
    );
  };

  const renderResponseTab = () => {
    if (reviewed) {
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 sm:p-6 space-y-4 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-emerald-900 font-display tracking-tight">
                Your Coordinators Have Responded
              </h3>
              <p className="text-[11px] text-emerald-700 font-semibold">
                Reviewed on {formatDateTime(student.submission!.reviewedAt)}
              </p>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl p-4 text-xs text-neutral-700 leading-relaxed">
            {student.submission!.reviewText
              ? student.submission!.reviewText
              : 'Thank you for submitting your introduction video!'}
          </div>

          {student.submission!.reviewPros.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                What you did well
              </div>
              <div className="flex flex-wrap gap-1.5">
                {student.submission!.reviewPros.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold">
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
              <div className="flex flex-wrap gap-1.5">
                {student.submission!.reviewCons.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-elite-darkred text-white text-[11px] font-semibold">
                    # {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6 flex items-start gap-3 text-left">
        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-extrabold text-amber-900 font-display tracking-tight">
            Review In Progress
          </h3>
          <p className="text-xs font-medium leading-relaxed text-amber-800 mt-1">
            Your video was uploaded on {formatDateTime(student.submission?.submittedAt ?? null)}.
            Your coordinators are reviewing it — once they respond, it will appear right here.
          </p>
        </div>
      </div>
    );
  };

  const renderResubmitTab = () => (
    <div className="space-y-4 text-left">
      <div className="border-2 border-dashed border-neutral-300 rounded-2xl p-6 text-center space-y-3 bg-neutral-50/50">
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
          {selectedFile ? 'Choose a Different Video' : 'Choose Introduction Video'}
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
        <span>{uploading ? 'Uploading...' : 'Submit Introduction Video'}</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-8 text-left">
      {/* 1. PROFILE BANNER */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-[0_1px_2px_rgb(17_17_17/0.05)] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-elite-red border border-red-100 flex items-center justify-center text-2xl font-extrabold font-display shrink-0">
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
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-50 hover:bg-red-50 hover:text-elite-red border border-neutral-200 text-neutral-600 text-xs font-bold transition-colors active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-elite-red cursor-pointer shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>

      {/* 2. STATUS STRIP */}
      {hasSubmission && (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 sm:p-5 text-left ${
            reviewed
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {reviewed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider font-display">
              {reviewed ? 'Reviewed by Coordinators' : 'Submission Under Review'}
            </h2>
            <p className="text-xs font-medium leading-relaxed mt-0.5">
              {reviewed
                ? `Your introduction was reviewed on ${formatDateTime(student.submission?.reviewedAt ?? null)}. Open the Admin Response tab below to read it.`
                : `Received on ${formatDateTime(student.submission?.submittedAt ?? null)}. Your review is in progress — check the Admin Response tab below.`}
            </p>
          </div>
        </div>
      )}

      {successMessage && hasSubmission && (
        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-start gap-3 text-left">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider font-display">Upload Complete</h2>
            <p className="text-xs font-medium leading-relaxed mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* 3. WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: VIDEO PREVIEW + WORKFLOW */}
        <div className="lg:col-span-7 space-y-4">
          {/* Video preview stage */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-[0_1px_2px_rgb(17_17_17/0.05)] p-6 sm:p-8 space-y-4 text-left">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-elite-red flex items-center justify-center font-bold">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-elite-black font-display tracking-tight">
                    Your Introduction Video
                  </h2>
                  <p className="text-[11px] text-neutral-500 font-semibold">
                    {hasSubmission
                      ? `Uploaded ${formatDateTime(student.submission?.submittedAt ?? null)}`
                      : selectedFile
                        ? 'Ready to submit'
                        : 'Not uploaded yet'}
                  </p>
                </div>
              </div>
              {previewUrl && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-elite-red text-[11px] font-bold uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-elite-red animate-pulse" />
                  Preview
                </span>
              )}
            </div>

            <div className="bg-neutral-900 rounded-xl overflow-hidden shadow-md">
              {renderVideoStage()}
            </div>
          </div>

          {/* Tab bar (only once a video has been submitted) */}
          {hasSubmission && (
            <div className="flex p-1 bg-neutral-100 border border-neutral-200 rounded-xl gap-1 shadow-[0_1px_2px_rgb(17_17_17/0.04)]">
              <button
                onClick={() => setActiveTab('response')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-elite-red ${
                  activeTab === 'response'
                    ? 'bg-white text-elite-red shadow-[0_1px_2px_rgb(17_17_17/0.06)]'
                    : 'text-neutral-600 hover:text-elite-red'
                }`}
                aria-pressed={activeTab === 'response'}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Admin Response</span>
              </button>
              <button
                onClick={() => setActiveTab('resubmit')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-elite-red ${
                  activeTab === 'resubmit'
                    ? 'bg-white text-elite-red shadow-[0_1px_2px_rgb(17_17_17/0.06)]'
                    : 'text-neutral-600 hover:text-elite-red'
                }`}
                aria-pressed={activeTab === 'resubmit'}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Resubmit Video</span>
              </button>
            </div>
          )}

          {/* Active panel */}
          {hasSubmission ? (
            activeTab === 'response' ? (
              renderResponseTab()
            ) : (
              <div className="bg-white border border-neutral-200 rounded-2xl shadow-[0_1px_2px_rgb(17_17_17/0.05)] p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-elite-red flex items-center justify-center font-bold">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-elite-black font-display tracking-tight">
                      Replace Your Video
                    </h2>
                    <p className="text-[11px] text-neutral-500 font-semibold">
                      Uploading a new video replaces the previous one and restarts the review.
                    </p>
                  </div>
                </div>
                {renderResubmitTab()}
              </div>
            )
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-[0_1px_2px_rgb(17_17_17/0.05)] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-elite-red flex items-center justify-center font-bold">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-elite-black font-display tracking-tight">
                    Upload Your Video
                  </h2>
                  <p className="text-[11px] text-neutral-500 font-semibold">
                    MP4, MOV, or WEBM up to {MAX_VIDEO_MB} MB
                  </p>
                </div>
              </div>
              {renderResubmitTab()}
            </div>
          )}
        </div>

        {/* RIGHT: GUIDELINES ASIDE */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-[0_1px_2px_rgb(17_17_17/0.05)] p-6 sm:p-8 space-y-4">
            <h3 className="text-base font-extrabold font-display tracking-tight text-elite-black uppercase border-b border-neutral-100 pb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-elite-red" />
              Video Guidelines
            </h3>

            <div className="divide-y divide-neutral-100 text-xs">
              <div className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-elite-red">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-elite-red mb-0.5">
                    Clip Duration
                  </div>
                  <p className="text-neutral-600 leading-relaxed">
                    Between <span className="text-elite-black font-semibold">1 and 3 minutes</span>. A solo
                    introduction with clear speech is preferred.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-elite-red">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-elite-red mb-0.5">
                    Format & Quality
                  </div>
                  <p className="text-neutral-600 leading-relaxed">
                    MP4, MOV, or WEBM up to <span className="text-elite-black font-semibold">25 MB</span>.
                    Ensure clear audio and good lighting.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-elite-red">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-elite-red mb-0.5">
                    One Video Per Student
                  </div>
                  <p className="text-neutral-600 leading-relaxed">
                    Only one introduction video per roll number. You can resubmit to replace it.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-elite-red">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-elite-red mb-0.5">
                    Be Yourself
                  </div>
                  <p className="text-neutral-600 leading-relaxed">
                    Introduce yourself naturally — share your interests and personality. No scripts
                    or AI-generated introductions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs font-semibold text-neutral-500 leading-relaxed text-left">
            Keep it natural, unrehearsed, and between 1–3 minutes. Once submitted, your coordinators
            will review the clip and send you feedback in the Admin Response tab.
          </p>
        </div>
      </div>
    </div>
  );
};