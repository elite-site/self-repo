import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  Film,
  Trash2,
  VideoOff,
  Circle,
  MessageSquare,
  Send,
  Eraser,
  UserRound,
  Mail,
  Phone,
  Folder,
  ShieldCheck,
} from 'lucide-react';
import { Submission, SubmissionRating } from '../types';
import { adminApi } from '../services/api';

const REVIEW_PROS = [
  'expressive posture',
  'commanding voice',
  'focused mindset',
  'perfect lighting & background',
];
const REVIEW_CONS = [
  'unclear thoughts',
  'broken voice',
  'bad lighting',
];

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
  const [reviewText, setReviewText] = useState(submission.reviewText || '');
  const [reviewPros, setReviewPros] = useState<string[]>(submission.reviewPros || []);
  const [reviewCons, setReviewCons] = useState<string[]>(submission.reviewCons || []);
  const [sendingReview, setSendingReview] = useState(false);

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

  const togglePros = (tag: string) => {
    setReviewPros((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleCons = (tag: string) => {
    setReviewCons((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitReview = async (clear: boolean) => {
    setSendingReview(true);
    try {
      const res = await adminApi.updateReview(submission.id, {
        reviewText: clear ? '' : reviewText,
        pros: clear ? [] : reviewPros,
        cons: clear ? [] : reviewCons,
      });
      if (res.success) {
        if (clear) {
          setReviewText('');
          setReviewPros([]);
          setReviewCons([]);
        } else {
          setReviewText(res.submission.reviewText || '');
          setReviewPros(res.submission.reviewPros || []);
          setReviewCons(res.submission.reviewCons || []);
        }
        onUpdated(res.submission);
      }
    } catch (err: any) {
      alert(`Failed to send response: ${err.message || 'Unknown error'}`);
    } finally {
      setSendingReview(false);
    }
  };

  const initials = submission.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return ReactDOM.createPortal(
    <>
      <div
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-5xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-3rem)] flex flex-col shadow-2xl text-left overflow-hidden my-auto">
          {/* 1. STICKY MODAL HEADER */}
          <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-[#fafafa] flex-none shrink-0">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-11 h-11 rounded-xl bg-elite-red text-white flex items-center justify-center text-base font-extrabold font-display shrink-0">
                {initials || <UserRound className="w-5 h-5" />}
              </div>
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
                <div className="text-xs text-neutral-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono">
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
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
            {/* STUDENT IDENTITY CARD */}
            <div className="bg-[#fafafa] border border-neutral-200 rounded-2xl p-4 sm:p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs items-start">
                <div className="min-w-0">
                  <div className="text-neutral-400 uppercase text-[10px] font-semibold tracking-wider">Roll Number</div>
                  <div className="text-neutral-900 font-mono font-bold mt-0.5 truncate">{submission.rollNo}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-neutral-400 uppercase text-[10px] font-semibold tracking-wider">Section & Year</div>
                  <div className="text-neutral-900 font-semibold mt-0.5 truncate">{submission.branch}-{submission.section} • Year {submission.year}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-neutral-400 uppercase text-[10px] font-semibold tracking-wider flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </div>
                  <div className="text-neutral-900 mt-0.5 break-all">{submission.email}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-neutral-400 uppercase text-[10px] font-semibold tracking-wider flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                  </div>
                  <div className="text-neutral-900 font-mono font-semibold mt-0.5">{submission.phoneNo || '—'}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-neutral-400 uppercase text-[10px] font-semibold tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Video Status
                  </div>
                  <div className={`font-bold uppercase mt-0.5 text-[11px] ${hasVideo ? 'text-emerald-600' : 'text-red-500'}`}>
                    {hasVideo ? 'Available' : 'No video'}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono min-w-0">
                <Folder className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="truncate">{submission.driveFolderPath}</span>
              </div>
            </div>

            {/* VIDEO */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-elite-red flex items-center justify-center shrink-0">
                    <Film className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-elite-black font-display tracking-tight">
                      Submitted Self-Introduction
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      Review the student's introduction clip below.
                    </p>
                  </div>
                </div>
                {hasVideo && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Uploaded
                  </span>
                )}
              </div>

              {videoUrl ? (
                <div className="bg-neutral-900 rounded-xl overflow-hidden shadow-md">
                  <video src={videoUrl} controls className="w-full max-h-[420px]" />
                </div>
              ) : (
                <div className="bg-neutral-100 border border-dashed border-neutral-300 rounded-xl p-10 text-center space-y-2">
                  <VideoOff className="w-6 h-6 text-neutral-400 mx-auto" />
                  <p className="text-xs text-neutral-500">
                    No video is linked to this submission. The student can upload a replacement video.
                  </p>
                </div>
              )}
            </div>

            {/* RATING + RESPONSE GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* RATING CONTROL */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Circle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-elite-black font-display tracking-tight uppercase">
                      Introduction Rating
                    </h3>
                    <p className="text-[11px] text-neutral-500">Assess the delivery and clarity.</p>
                  </div>
                </div>

                <div className="pt-1 space-y-2">
                  {ratingOptions.map((opt) => {
                    const isActive = rating === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={updating || deleting || deletingVideo}
                        onClick={() => handleRate(isActive ? null : opt.value)}
                        className={`w-full py-3 px-4 rounded-lg text-left transition-all flex items-start gap-3 border cursor-pointer disabled:opacity-50 ${
                          isActive
                            ? opt.activeClass
                            : 'bg-white border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <Circle className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-white' : 'text-neutral-300'}`} />
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

              {/* SEND RESPONSE */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-elite-red flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-elite-black font-display tracking-tight uppercase">
                      Send Response to Student
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      Text feedback plus hashtag keywords the student sees after submitting.
                    </p>
                  </div>
                </div>

                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  placeholder="Write your review — what the student did well and what to improve..."
                  className="w-full bg-[#fafafa] border border-neutral-200 rounded-lg px-3 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-elite-red focus:bg-white transition-colors resize-y"
                />

                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">
                      Pros — select keywords
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {REVIEW_PROS.map((tag) => {
                        const on = reviewPros.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => togglePros(tag)}
                            className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors cursor-pointer ${
                              on
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-emerald-50/50 text-emerald-700 border-emerald-200 hover:border-emerald-400'
                            }`}
                          >
                            # {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-elite-red mb-1.5">
                      Cons — select keywords
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {REVIEW_CONS.map((tag) => {
                        const on = reviewCons.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleCons(tag)}
                            className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors cursor-pointer ${
                              on
                                ? 'bg-elite-darkred text-white border-elite-darkred'
                                : 'bg-red-50/50 text-elite-red border-red-200 hover:border-red-400'
                            }`}
                          >
                            # {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={sendingReview || deleting || deletingVideo}
                    onClick={() => handleSubmitReview(false)}
                    className="flex-1 py-2.5 px-4 bg-elite-red hover:bg-elite-darkred text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingReview ? 'Sending...' : 'Send Response'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={sendingReview || deleting || deletingVideo}
                    onClick={() => handleSubmitReview(true)}
                    title="Clear the response (marks the submission as not yet reviewed)"
                    className="py-2.5 px-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border border-neutral-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                </div>
              </div>
            </div>

            {/* MANAGE ACTIONS */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
              <div>
                <h3 className="text-sm font-bold text-elite-black font-display tracking-tight uppercase">
                  Manage Video & Record
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Deleting the video lets the student upload a replacement. Removing the record is permanent.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  type="button"
                  disabled={updating || deleting || deletingVideo || !hasVideo}
                  onClick={handleDeleteVideo}
                  className="py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 hover:border-amber-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <VideoOff className="w-4 h-4" />
                  <span>{deletingVideo ? 'Deleting Video...' : 'Delete Video & Allow Re-upload'}</span>
                </button>
                <button
                  type="button"
                  disabled={updating || deleting || deletingVideo}
                  onClick={handleDelete}
                  className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-elite-red border border-red-200 hover:border-red-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4 text-elite-red" />
                  <span>{deleting ? 'Deleting Record...' : 'Delete Record & Files'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};