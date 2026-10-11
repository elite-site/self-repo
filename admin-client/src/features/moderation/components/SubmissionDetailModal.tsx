import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { AlertCircle } from 'lucide-react';
import { IntroVideoState, Submission, SubmissionRating } from '@/types';
import { moderationApi } from '../api';
import { SubmissionDetailHeader } from './subcomponents/SubmissionDetailHeader';
import { SubmissionIdentityCard } from './subcomponents/SubmissionIdentityCard';
import { SubmissionVideoSection } from './subcomponents/SubmissionVideoSection';
import { SubmissionRatingSection } from './subcomponents/SubmissionRatingSection';
import { SubmissionReviewSection } from './subcomponents/SubmissionReviewSection';
import { SubmissionManageActions } from './subcomponents/SubmissionManageActions';

interface SubmissionDetailModalProps {
  submission: Submission | null;
  onClose: () => void;
  onUpdated: (updated: Submission) => void;
  onDeleted?: (deletedId: string) => void;
}

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  submission,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const [rating, setRating] = useState<SubmissionRating | null>(submission?.rating || null);
  const [updating, setUpdating] = useState(false);
  const [hasVideo, setHasVideo] = useState<boolean>(Boolean(submission?.videoDriveId));
  const [introVideo, setIntroVideo] = useState<IntroVideoState | null>(submission?.introVideo ?? null);
  const [requestingVideo, setRequestingVideo] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [videoNotice, setVideoNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState(submission?.reviewText || '');
  const [reviewPros, setReviewPros] = useState<string[]>(submission?.reviewPros || []);
  const [reviewCons, setReviewCons] = useState<string[]>(submission?.reviewCons || []);
  const [sendingReview, setSendingReview] = useState(false);

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    modalRef.current?.querySelector<HTMLElement>('button[aria-label="Close modal"]')?.focus();
  }, []);

  useEffect(() => {
    if (!submission) return;
    let cancelled = false;
    moderationApi
      .getSubmission(submission.id)
      .then((data) => {
        if (!cancelled && data?.introVideo) setIntroVideo(data.introVideo as IntroVideoState);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [submission]);

  if (!submission) return null;

  const handleRequestNewVideo = async (reason: string) => {
    setRequestingVideo(true);
    setVideoNotice(null);
    try {
      const res = await moderationApi.requestNewVideo(submission.id, reason);
      setVideoNotice(res.message || 'The student has been notified.');
      setIntroVideo((prev) =>
        prev
          ? {
              ...prev,
              status: 'CHANGES_REQUESTED',
              changeRequestedAt: new Date().toISOString(),
              changeRequestNote: reason.trim() || null,
            }
          : prev
      );
    } catch {
      setVideoNotice('Failed to request a new video. Try again.');
    } finally {
      setRequestingVideo(false);
    }
  };

  const handleTogglePublic = async () => {
    if (!introVideo) return;
    const next = !introVideo.isPublic;
    setTogglingPublic(true);
    setVideoNotice(null);
    try {
      const res = await moderationApi.setVideoPublic(introVideo.id, next);
      setIntroVideo((prev) => (prev ? { ...prev, isPublic: next } : prev));
      setVideoNotice(res.message || 'Public visibility updated.');
    } catch (err: any) {
      setVideoNotice(err?.response?.data?.message || 'Failed to update public visibility.');
    } finally {
      setTogglingPublic(false);
    }
  };

  const handleRate = async (value: SubmissionRating | null) => {
    setUpdating(true);
    setActionError(null);
    try {
      const res = await moderationApi.updateRating(submission.id, value);
      if (res.success) {
        setRating(res.submission.rating || null);
        onUpdated(res.submission);
      }
    } catch {
      setActionError('Failed to update rating.');
    } finally {
      setUpdating(false);
    }
  };

  const togglePros = (tag: string) => {
    setReviewPros((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const toggleCons = (tag: string) => {
    setReviewCons((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmitReview = async (clear: boolean) => {
    setSendingReview(true);
    setActionError(null);
    try {
      const res = await moderationApi.updateReview(submission.id, {
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
      setActionError(`Failed to send response: ${err.message || 'Unknown error'}`);
    } finally {
      setSendingReview(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-modal bg-scrim flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="surface surface-raised rounded-xl w-full max-w-5xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[calc(100dvh-3rem)] flex flex-col shadow-modal text-left overflow-hidden my-auto animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-body"
      >
        <SubmissionDetailHeader submission={submission} rating={rating} onClose={onClose} />

        <div id="modal-body" className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          {actionError && (
            <div
              className="flex items-center justify-between gap-3 p-3.5 bg-status-bg-rejected border border-edge-strong rounded-xl text-status-rejected text-xs"
              role="alert"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
              <button onClick={() => setActionError(null)} className="font-bold underline cursor-pointer shrink-0">
                Close
              </button>
            </div>
          )}

          <SubmissionIdentityCard submission={submission} hasVideo={hasVideo} />

          <SubmissionVideoSection
            submission={submission}
            introVideo={introVideo}
            hasVideo={hasVideo}
            onTogglePublic={handleTogglePublic}
            togglingPublic={togglingPublic}
            onRequestNewVideo={handleRequestNewVideo}
            requestingVideo={requestingVideo}
            videoNotice={videoNotice}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <SubmissionRatingSection
              rating={rating}
              onRate={handleRate}
              disabled={updating}
              updating={updating}
            />

            <SubmissionReviewSection
              reviewText={reviewText}
              onChangeReviewText={setReviewText}
              reviewPros={reviewPros}
              onTogglePros={togglePros}
              reviewCons={reviewCons}
              onToggleCons={toggleCons}
              onSubmitReview={handleSubmitReview}
              sendingReview={sendingReview}
              disabled={updating}
            />
          </div>

          <SubmissionManageActions
            submission={submission}
            hasVideo={hasVideo}
            disabled={updating}
            onVideoDeleted={(updated) => {
              setHasVideo(false);
              onUpdated(updated);
            }}
            onSubmissionDeleted={(id) => {
              if (onDeleted) onDeleted(id);
              onClose();
            }}
            onError={setActionError}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
