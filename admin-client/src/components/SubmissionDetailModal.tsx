import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Film, Trash2, VideoOff, Circle } from 'lucide-react';
import { Submission, SubmissionRating } from '../types';
import { adminApi } from '../services/api';

interface SubmissionDetailModalProps {
  submission: Submission | null;
  onClose: () => void;
  onUpdated: (updated: Submission) => void;
  onDeleted?: (deletedId: string) => void;
}

const ratingOptions: Array<{
  value: SubmissionRating;
  label: string;
  description: string;
  activeClass: string;
  dotClass: string;
}> = [
  {
    value: 'GOOD',
    label: 'Good',
    description: 'Confident, clear, excellent introduction',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20',
    dotClass: 'bg-emerald-500',
  },
  {
    value: 'AVERAGE',
    label: 'Average',
    description: 'Acceptable, decent communication',
    activeClass: 'bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-400/20',
    dotClass: 'bg-amber-400',
  },
  {
    value: 'POOR',
    label: 'Poor',
    description: 'Needs improvement, weak delivery',
    activeClass: 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20',
    dotClass: 'bg-red-500',
  },
];

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  submission,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  if (!submission) return null;

  const [rating, setRating] = useState<SubmissionRating | null>(submission.rating || null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [hasVideo, setHasVideo] = useState<boolean>(Boolean(submission.videoDriveId));

  // Lock background body scroll and listen for Escape key
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const videoUrl = hasVideo ? adminApi.getMediaUrl(submission.id, 'video') : null;

  const handleRate = async (value: SubmissionRating | null) => {
    setUpdating(true);
    try {
      const res = await adminApi.updateRating(submission.id, value);
      if (res.success) {
        setRating(res.submission.rating || null);
        onUpdated(res.submission);
      }
    } catch (err) {
      alert('Failed to update rating.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteVideo = async () => {
    const confirmText = `Delete the introduction video for ${submission.name} (${submission.rollNo})?\n\nThe student will be able to upload a replacement video.`;
    if (!window.confirm(confirmText)) return;

    setDeletingVideo(true);
    try {
      const res = await adminApi.deleteVideo(submission.id);
      if (res.success) {
        setHasVideo(false);
        onUpdated(res.submission);
      }
    } catch (err: any) {
      alert(`Failed to delete video: ${err.message || 'Unknown error'}`);
    } finally {
      setDeletingVideo(false);
    }
  };

  const handleDelete = async () => {
    const confirmText = `Are you sure you want to permanently delete submission for ${submission.name} (${submission.rollNo})?\n\nThis will remove the entry from the database AND delete all associated files.`;
    if (!window.confirm(confirmText)) return;

    setDeleting(true);
    try {
      const res = await adminApi.deleteSubmission(submission.id);
      if (res.success) {
        if (onDeleted) {
          onDeleted(submission.id);
        }
        onClose();
      }
    } catch (err: any) {
      alert(`Failed to delete submission: ${err.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const activeRating = ratingOptions.find((r) => r.value === rating);

  return ReactDOM.createPortal(
    <>
      <div
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-4xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-3rem)] flex flex-col shadow-2xl animate-in fade-in duration-150 text-left overflow-hidden my-auto">
          {/* 1. STICKY MODAL HEADER */}
          <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-[#fafafa] flex-none shrink-0">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h2 className="text-lg sm:text-xl font-bold text-elite-black font-display tracking-tight truncate">
                    {submission.name}
                  </h2>
                  {activeRating ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] sm:text-xs font-bold uppercase tracking-wide shrink-0 ${
                      activeRating.value === 'GOOD' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : activeRating.value === 'AVERAGE' ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-red-50 border-red-200 text-elite-red'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${activeRating.dotClass}`} />
                      {activeRating.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 text-[11px] sm:text-xs font-medium uppercase tracking-wide shrink-0">
                      NOT RATED
                    </span>
                  )}
                </div>
                <div className="text-xs text-neutral-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono">
                  <span className="font-semibold">{submission.rollNo}</span>
                  <span>•</span>
                  <span>{submission.branch}-{submission.section} (Year {submission.year})</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. SCROLLABLE MODAL BODY */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* LEFT: STUDENT INFORMATION & RATING CONTROLS (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-[#fafafa] border border-neutral-200 rounded-xl p-4 sm:p-5 space-y-3.5 text-xs">
                  <h3 className="font-bold text-elite-black uppercase tracking-wider text-[11px] pb-2 border-b border-neutral-200">
                    Student Information
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <div className="text-neutral-400 uppercase text-[10px] font-semibold">Full Name</div>
                      <div className="text-neutral-900 font-semibold mt-0.5">{submission.name}</div>
                    </div>

                    <div>
                      <div className="text-neutral-400 uppercase text-[10px] font-semibold">Roll Number</div>
                      <div className="text-neutral-900 font-mono font-semibold mt-0.5">{submission.rollNo}</div>
                    </div>

                    <div>
                      <div className="text-neutral-400 uppercase text-[10px] font-semibold">Email Address</div>
                      <div className="text-neutral-900 mt-0.5 break-all">{submission.email}</div>
                    </div>

                    <div>
                      <div className="text-neutral-400 uppercase text-[10px] font-semibold">Department & Section</div>
                      <div className="text-neutral-900 font-medium mt-0.5">
                        {submission.branch} • Section {submission.section} • Year {submission.year}
                      </div>
                    </div>

                    <div>
                      <div className="text-neutral-400 uppercase text-[10px] font-semibold">Video Status</div>
                      <div className="text-neutral-900 font-bold uppercase mt-0.5 text-[11px]">
                        {hasVideo ? 'Available' : 'No video (student can re-upload)'}
                      </div>
                    </div>

                    <div>
                      <div className="text-neutral-400 uppercase text-[10px] font-semibold">Drive Folder Path</div>
                      <div className="text-neutral-700 font-mono text-[11px] mt-0.5 break-all">
                        {submission.driveFolderPath}
                      </div>
                    </div>
                  </div>
                </div>

                {/* PERFORMANCE RATING CONTROLS */}
                <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 space-y-3 shadow-sm">
                  <h3 className="font-bold text-elite-black uppercase tracking-wider text-[11px]">
                    Performance Rating
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Evaluate the student's introduction performance and mark it with a colour.
                  </p>

                  <div className="pt-1 space-y-2">
                    {ratingOptions.map((opt) => {
                      const isActive = rating === opt.value;
                      const iconClass = isActive ? '' : opt.dotClass;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={updating || deleting || deletingVideo}
                          onClick={() => handleRate(isActive ? null : opt.value)}
                          className={`w-full py-2.5 px-4 rounded-lg text-left transition-all flex items-start gap-3 border cursor-pointer disabled:opacity-50 ${
                            isActive
                              ? opt.activeClass
                              : 'bg-white border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <Circle className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-white' : `text-neutral-300 ${iconClass}`}`} style={isActive ? {} : {}} />
                          <div className="min-w-0">
                            <div className={`font-bold text-xs uppercase tracking-wider ${isActive ? 'text-white' : 'text-elite-black'}`}>
                              {opt.label}
                            </div>
                            <div className={`text-[11px] mt-0.5 ${isActive ? 'text-white/80' : 'text-neutral-500'}`}>
                              {opt.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {updating && (
                      <div className="text-[11px] text-neutral-400 font-mono pt-1">Saving rating...</div>
                    )}
                  </div>
                </div>

                {/* MANAGE ACTIONS */}
                <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 space-y-3 shadow-sm">
                  <h3 className="font-bold text-elite-black uppercase tracking-wider text-[11px]">
                    Manage Video
                  </h3>

                  <button
                    type="button"
                    disabled={updating || deleting || deletingVideo || !hasVideo}
                    onClick={handleDeleteVideo}
                    className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 hover:border-amber-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <VideoOff className="w-4 h-4" />
                    <span>{deletingVideo ? 'Deleting Video...' : 'Delete Video & Allow Re-upload'}</span>
                  </button>

                  {/* DELETE SUBMISSION ACTION */}
                  <div className="pt-1 border-t border-neutral-100">
                    <button
                      type="button"
                      disabled={updating || deleting || deletingVideo}
                      onClick={handleDelete}
                      className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-elite-red border border-red-200 hover:border-red-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4 text-elite-red" />
                      <span>{deleting ? 'Deleting Record...' : 'Delete Record & Files'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT: INTRODUCTION VIDEO (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-elite-black font-display">
                    Submitted Self Introduction
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Review the student's introduction video below.
                  </p>
                </div>

                {/* VIDEO VIEW */}
                {videoUrl ? (
                  <div className="pt-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-elite-red" />
                      <span>Video Submission</span>
                    </div>
                    <div className="bg-neutral-900 rounded-xl overflow-hidden shadow-md">
                      <video src={videoUrl} controls className="w-full max-h-96" />
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-elite-red" />
                      <span>Video Submission</span>
                    </div>
                    <div className="bg-neutral-100 border border-dashed border-neutral-300 rounded-xl p-10 text-center text-xs text-neutral-500">
                      No video is linked to this submission. The student can upload a replacement video using their roll number.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};