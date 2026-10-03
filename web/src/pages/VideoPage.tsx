import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { api, resolveMediaUrl, UploadProgressInfo } from '../services/api';
import { StudentIntroVideo, StudentSubmission } from '../types';
import { useSession } from '../context/SessionContext';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { ProgressSteps } from '../components/ui/ProgressSteps';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { selectVariantsByName } from '../lib/motion';
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
  Zap,
  X,
  Gauge,
  Info,
  Globe,
  EyeOff,
  Trash2
} from 'lucide-react';
import { SkeletonPage } from '../components/ui/Skeleton';

/**
 * Fallback only, for an older backend that does not report the configured
 * limit. The authoritative value arrives on `GET /student/me`.
 */
const DEFAULT_MAX_VIDEO_MB = 25;

interface UploadStats {
  loadedMb: number;
  totalMb: number;
  speedFormatted: string;
  etaFormatted: string | null;
  phase: 'uploading' | 'confirming';
}

interface VideoMeta {
  durationSec: number | null;
  durationFormatted: string | null;
  resolutionFormatted: string | null;
  sizeMb: number;
  isLarge: boolean;
  durationNotice: string | null;
}

export const VideoPage: React.FC = () => {
  const { session } = useSession();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [submission, setSubmission] = useState<StudentSubmission | null>(null);
  const [video, setVideo] = useState<StudentIntroVideo | null>(null);
  const [maxVideoSizeMb, setMaxVideoSizeMb] = useState<number>(DEFAULT_MAX_VIDEO_MB);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  const shouldReduce = useReducedMotion();
  const staggerContainer = selectVariantsByName(shouldReduce, 'staggerFastContainer');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Track object URLs so we can revoke them on unmount / re-upload (memory leak prevention)
  const objectUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Revoke any previously created blob URLs to free memory
  const setLocalPreview = (url: string | null) => {
    if (objectUrlRef.current && objectUrlRef.current !== url) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = url;
    setLocalPreviewUrl(url);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Mirrors whether any submission data has been loaded. `loadSubmission` is
  // memoized with no dependencies, so reading `submission` inside it would
  // always see the value captured on first render (null), making a "refresh in
  // place" request blank the whole page to the full-screen loader.
  const hasSubmissionData = useRef(false);
  // Monotonic request id. Two loads can overlap — the mount revalidation and a
  // delete's refresh — and without this the slower one wins, so a delete could
  // be undone on screen by a response that started before it.
  const loadSeq = useRef(0);

  const loadSubmission = useCallback(async (isInitial = true) => {
    if (isInitial && !hasSubmissionData.current) setLoading(true);
    setError(null);
    const seq = ++loadSeq.current;
    try {
      const data = await api.getMe();
      // A newer load has started; this response is stale, so drop it rather than
      // resurrecting state it no longer reflects.
      if (seq !== loadSeq.current) return;
      const currentVideo = data?.student?.video ?? null;
      setVideo(currentVideo);
      if (!currentVideo?.hasFile) {
        setLocalPreview(null);
        setPreviewError(false);
      }
      // The server reports the limit it actually enforces; fall back to the
      // documented default only if an older backend omits it.
      setMaxVideoSizeMb(data?.student?.maxVideoSizeMb || DEFAULT_MAX_VIDEO_MB);
      if (data?.student?.submission) {
        setSubmission(data.student.submission);
      } else {
        setSubmission(null);
      }
      hasSubmissionData.current = true;
    } catch {
      if (seq !== loadSeq.current) return;
      if (isInitial) {
        setError('Could not load introduction video status.');
        showToast('Could not load introduction video status.', 'error');
      }
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * The submitted recording is streamed from the server, not held in memory.
   *
   * A blob URL built at upload time only lives as long as the page, so the
   * video would vanish on the next login. Pointing the player at the
   * authenticated media endpoint instead means the student's own take is
   * re-fetched from Drive on every visit and can be seeked. Both the row id and
   * the submission timestamp go into the query string: the row is reused
   * across takes, so only the timestamp changes when a new recording replaces
   * the old one, and the browser then refetches instead of replaying its
   * 10-minute private cache of the previous video.
   */
  const storedVideoUrl = useMemo(() => {
    if (!video?.hasFile) return null;
    // NOTE: the path must keep its `/api` prefix — `resolveMediaUrl` strips the
    // prefix from the configured baseURL and re-appends the path verbatim, so a
    // bare `/student/...` would resolve to a 404 and silently push the player
    // onto the slow whole-file blob fallback.
    const base = resolveMediaUrl('/api/student/submission/media/video');
    const stamp = new Date(video.submittedAt || 0).getTime() || 0;
    // A <video src> cannot carry an Authorization header, so pass the session
    // token explicitly as well as relying on the cookie. Without this the request
    // 401s whenever the browser withholds the cookie (cross-origin API).
    const token = localStorage.getItem('student_token');
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    return `${base}?v=${encodeURIComponent(video.id)}-${stamp}${tokenParam}`;
  }, [video?.id, video?.submittedAt, video?.hasFile]);

  // Right after an upload, show the local file instantly; afterwards fall back
  // to the stored recording so the preview survives reloads and new sessions.
  const playbackUrl = localPreviewUrl ?? storedVideoUrl;

  /**
   * A bare <video src> only carries the session cookie, not the Authorization
   * header the rest of the app relies on. If the cookie is unavailable (or the
   * browser refuses the credentialed subresource) the stream 401s, so retry
   * once through the authenticated client and hold a blob in memory instead.
   */
  const handlePlaybackError = useCallback(() => {
    if (!storedVideoUrl || localPreviewUrl) return;
    setPreviewError(true);
    api
      .getVideoBlobUrl()
      .then((url) => {
        setPreviewError(false);
        setLocalPreview(url);
      })
      .catch(() => setPreviewError(true));
  }, [storedVideoUrl, localPreviewUrl]);

  /**
   * Quick playback controls. `play()` returns a promise that rejects when the
   * browser blocks autoplay or the stream is interrupted; on rejection we fall
   * back to a blob buffer so a stalled stream never leaves the player dead.
   */
  const withBlobFallback = useCallback(
    (action: () => Promise<void>) => {
      action().catch((err) => {
        console.warn('Video playback interrupted:', err);
        if (playbackUrl && !playbackUrl.startsWith('blob:') && !localPreviewUrl) {
          api
            .getVideoBlobUrl()
            .then((url) => {
              if (url) setLocalPreview(url);
            })
            .catch(() => {});
        }
      });
    },
    [playbackUrl, localPreviewUrl],
  );

  // A new take invalidates any previous fallback attempt.
  useEffect(() => {
    setPreviewError(false);
  }, [video?.id]);

  /** Publish / unpublish the approved video on the public showcase. */
  const handleTogglePublish = async (next: boolean) => {
    setPublishing(true);
    setPublishNotice(null);
    try {
      const res = await api.setVideoPublic(next);
      setVideo((prev) => (prev ? { ...prev, isPublic: res.isPublic, publishedAt: res.isPublic ? new Date().toISOString() : null } : prev));
      const notice = res.message || (next ? 'Your video is now public.' : 'Your video is no longer public.');
      setPublishNotice(notice);
      showToast(notice);
    } catch (err: any) {
      const notice = err?.response?.data?.message || 'Could not update public visibility.';
      setPublishNotice(notice);
      showToast(notice, 'error');
    } finally {
      setPublishing(false);
    }
  };

  /** Withdraw the submitted take. The server deletes the file and both rows. */
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete your introduction video?',
      description: 'The video file and its submission record will be removed. This cannot be undone.',
      confirmLabel: 'Delete video',
      tone: 'danger',
    });
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await api.deleteVideo();
      setLocalPreview(null);
      setVideo(null);
      setSubmission(null);
      setUploadSuccess(false);
      setError(null);
      const notice = res.message || 'Your introduction video has been deleted.';
      setDeleteNotice(notice);
      showToast(notice);
      await loadSubmission(true);
    } catch (err: any) {
      const notice = err?.response?.data?.message || 'Could not delete your video. Please try again.';
      setError(notice);
      showToast(notice, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // The session gate has already fetched `/me` for the whole app, and that same
  // payload carries the video, the submission and the size limit this page shows.
  // Paint from it immediately, then revalidate in the background.
  //
  // The revalidation is what makes this correct rather than merely fast: the
  // session snapshot is from page load, so without it a student who uploaded or
  // deleted a video and came back to this page would be shown the old state —
  // an approved video that is now pending, or an empty dropzone for a video that
  // exists. `isInitial: false` keeps it from flashing the loader over content
  // that is already on screen.
  const seededFromSession = useRef(false);
  useEffect(() => {
    if (seededFromSession.current) return;
    const cached = session?.student;
    if (!cached) {
      // No session payload (still verifying, or signed out). Fetch directly,
      // and mark the seed done so the session arriving later does not issue a
      // second page-level `/me` on top of this one.
      seededFromSession.current = true;
      loadSubmission(true);
      return;
    }
    // The direct fetch already ran and has fresher data than this snapshot.
    if (hasSubmissionData.current) {
      seededFromSession.current = true;
      return;
    }
    seededFromSession.current = true;
    setVideo(cached.video ?? null);
    setMaxVideoSizeMb(cached.maxVideoSizeMb || DEFAULT_MAX_VIDEO_MB);
    setSubmission(cached.submission ?? null);
    hasSubmissionData.current = true;
    if (!cached.video?.hasFile) {
      setLocalPreview(null);
      setPreviewError(false);
    }
    setLoading(false);
    loadSubmission(false);
  }, [loadSubmission, session]);

  // Fast in-browser inspection of video file without any heavy dependencies
  const inspectVideoFile = (file: File): Promise<VideoMeta> => {
    return new Promise((resolve) => {
      const sizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(1));
      // "Large" is relative to the configured limit, so the tip still fires at
      // the right point if an administrator raises or lowers the cap.
      const isLarge = sizeMb > maxVideoSizeMb * 0.6;

      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      const tempUrl = URL.createObjectURL(file);
      tempVideo.src = tempUrl;

      const timeout = setTimeout(() => {
        URL.revokeObjectURL(tempUrl);
        resolve({
          durationSec: null,
          durationFormatted: null,
          resolutionFormatted: null,
          sizeMb,
          isLarge,
          durationNotice: null,
        });
      }, 2000);

      tempVideo.onloadedmetadata = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(tempUrl);
        const durationSec = Math.round(tempVideo.duration || 0);
        const mins = Math.floor(durationSec / 60);
        const secs = durationSec % 60;
        const durationFormatted = mins > 0 ? `${mins}m ${secs < 10 ? '0' : ''}${secs}s` : `${secs}s`;

        let resolutionFormatted = null;
        if (tempVideo.videoHeight) {
          resolutionFormatted = `${tempVideo.videoHeight}p`;
        }

        let durationNotice: string | null = null;
        if (durationSec > 0 && durationSec < 55) {
          durationNotice = `Video duration is ${durationFormatted} (recommended is 60–90 seconds).`;
        } else if (durationSec > 95) {
          durationNotice = `Video duration is ${durationFormatted} (longer than recommended 90s).`;
        }

        resolve({
          durationSec,
          durationFormatted,
          resolutionFormatted,
          sizeMb,
          isLarge,
          durationNotice,
        });
      };

      tempVideo.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(tempUrl);
        resolve({
          durationSec: null,
          durationFormatted: null,
          resolutionFormatted: null,
          sizeMb,
          isLarge,
          durationNotice: null,
        });
      };
    });
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploading(false);
    setUploadProgress(0);
    setUploadStats(null);
    setError('Upload cancelled.');
    showToast('Upload cancelled.', 'info');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file (MP4, WebM, MOV).');
      showToast('Please select a valid video file (MP4, WebM, MOV).', 'error');
      // Reset the input so re-picking the same file fires `change` again. The
      // value is only cleared in the upload's `finally`, which a validation
      // rejection never reaches, so without this the student's second attempt
      // silently does nothing.
      e.target.value = '';
      return;
    }

    if (file.size > maxVideoSizeMb * 1024 * 1024) {
      // This is the most common rejection here, and it is the one students
      // least expect: the file picker shows no size, so the inline error below
      // the button is easy to miss while the page is scrolled to the recorder
      // tips. Toast it, and name the actual size so the gap is obvious.
      const message = `Video file must be under ${maxVideoSizeMb}MB (yours is ${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
      setError(`Video file must be under ${maxVideoSizeMb}MB.`);
      showToast(message, 'error');
      e.target.value = '';
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);
    setUploadStats(null);
    setUploadSuccess(false);

    // Inspect file resolution & duration in browser
    const meta = await inspectVideoFile(file);
    setVideoMeta(meta);

    // Create a local preview URL immediately so the student sees their video
    // while it uploads in the background
    const localUrl = URL.createObjectURL(file);
    abortControllerRef.current = new AbortController();

    try {
      // Stream the raw file directly to the backend — no FormData wrapper.
      // The backend pipes it straight to Google Drive with zero RAM buffering.
      const res = await api.submitVideoStream(
        file,
        (info: UploadProgressInfo) => {
          setUploadProgress(info.pct);
          const loadedMb = parseFloat((info.loaded / (1024 * 1024)).toFixed(1));
          const totalMb = parseFloat((info.total / (1024 * 1024)).toFixed(1));
          const speedMb = info.speedBytesPerSec / (1024 * 1024);
          const speedFormatted =
            speedMb >= 0.1
              ? `${speedMb.toFixed(1)} MB/s`
              : `${Math.max(1, Math.round(info.speedBytesPerSec / 1024))} KB/s`;

          const etaFormatted =
            info.estimatedRemainingSec !== null
              ? info.estimatedRemainingSec > 60
                ? `~${Math.ceil(info.estimatedRemainingSec / 60)} min left`
                : `~${info.estimatedRemainingSec}s left`
              : null;

          setUploadStats({
            loadedMb,
            totalMb,
            speedFormatted,
            etaFormatted,
            phase: info.pct >= 100 ? 'confirming' : 'uploading',
          });
        },
        abortControllerRef.current.signal,
      );

      setUploadSuccess(true);
      setSubmission((prev) => ({
        id: res.id || prev?.id || 'submission',
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
        videoUploaded: true,
        reviewText: null,
        reviewPros: [],
        reviewCons: [],
        reviewedAt: null,
      }));
      setUploadSuccess(true);
      showToast(res.message || 'Your introduction video has been submitted for review.');
      const newDriveId = res.driveFileId || (res as any)?.data?.driveFileId;
      setVideo((prev) => ({
        ...(prev || {}),
        id: res.id || prev?.id || 'submission',
        driveFileId: newDriveId || (prev as any)?.driveFileId || null,
        filename: file.name,
        sizeMb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
        mimeType: file.type,
        hasFile: true,
        submittedAt: new Date().toISOString(),
        status: 'PENDING',
        isPublic: false,
        publishedAt: null,
        changeRequestedAt: null,
        changeRequestNote: null,
      } as any));
      if (newDriveId) {
        URL.revokeObjectURL(localUrl);
        setLocalPreview(null);
      } else {
        setLocalPreview(localUrl);
      }
      loadSubmission(false);
    } catch (err: any) {
      URL.revokeObjectURL(localUrl); // clean up unused preview URL on error
      if (err.name === 'AbortError' || err.message?.includes('cancelled')) {
        setError('Upload cancelled.');
      } else {
        const notice = err.message || 'Failed to upload video. Please try again.';
        setError(notice);
        showToast(notice, 'error');
      }
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
      // Reset file input so the same file can be re-selected after an error
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return <SkeletonPage label="Loading video submission" cards={2} rows={2} />;
  }

  const formatSubmittedAt = (iso: string | null | undefined): string => {
    if (!iso) return 'To be announced';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'To be announced';
    return d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="badge badge-approved">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'SUBMITTED':
      case 'PENDING':
        return (
          <span className="badge badge-pending">
            <Clock className="w-3.5 h-3.5" /> Under Review
          </span>
        );
      case 'CHANGES_REQUESTED':
        return (
          <span className="badge badge-changes">
            <AlertCircle className="w-3.5 h-3.5" /> Re-upload Requested
          </span>
        );
      case 'REJECTED':
        return (
          <span className="badge badge-rejected">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="badge badge-draft">
            Draft
          </span>
        );
    }
  };

  /**
   * Where the student's video sits in the moderation flow, derived from the two
   * status fields the API already returns so the stepper can never disagree with
   * the badge next to it.
   */
  const lifecycleSteps = [
    {
      label: 'Uploaded',
      detail: submission?.submittedAt ? formatSubmittedAt(submission.submittedAt) : 'MP4 or WebM',
    },
    { label: 'Under review', detail: 'Faculty moderation' },
    { label: 'Approved', detail: 'Faculty sign-off' },
    { label: 'Published', detail: 'Visible on your profile' },
  ];

  const videoStatus = video?.status || submission?.status || 'DRAFT';
  const lifecycle: { current: number; tone: 'brand' | 'changes' | 'rejected' } = (() => {
    if (video?.changeRequestedAt || videoStatus === 'CHANGES_REQUESTED') {
      return { current: 0, tone: 'changes' };
    }
    if (videoStatus === 'REJECTED') return { current: 0, tone: 'rejected' };
    if (video?.isPublic) return { current: lifecycleSteps.length, tone: 'brand' };
    if (videoStatus === 'APPROVED') return { current: 3, tone: 'brand' };
    if (videoStatus === 'SUBMITTED' || videoStatus === 'PENDING') return { current: 1, tone: 'brand' };
    return { current: 0, tone: 'brand' };
  })();

  return (
    <div className="space-y-6 text-left page-enter">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink font-heading">Introduction Video</h1>
          <p className="text-xs text-ink-secondary">
            Your 60–90 second professional department self-introduction video
          </p>
        </div>
        {submission && (
          <div className="flex items-center gap-2 shrink-0">
            {getStatusBadge(video?.status || submission.status)}
          </div>
        )}
      </div>

      {/* LIFECYCLE. The whole path is always on screen, so "what happens next"
          never has to be read out of a status badge. */}
      <div className="surface p-5 sm:p-6">
        <h2 className="font-heading text-headline-sm text-ink">Video status</h2>
        <p className="mt-0.5 text-body-sm text-ink-secondary">
          {lifecycle.current >= lifecycleSteps.length
            ? 'Your approved introduction video is published.'
            : lifecycle.current === 0 && submission?.videoUploaded
              ? 'Faculty asked for a new take. Uploading replaces the current video.'
              : 'Your video moves through these steps after each upload.'}
        </p>
        <div className="mt-5">
          <ProgressSteps steps={lifecycleSteps} current={lifecycle.current} tone={lifecycle.tone} label="Video status" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-status-bg-rejected border border-status-rejected rounded-lg text-status-rejected text-xs flex items-center justify-between" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadSubmission(true)} className="font-bold underline cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center">
            Retry
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="p-4 bg-status-bg-approved border border-status-approved rounded-lg text-status-approved text-xs flex items-center gap-2" role="status">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Video uploaded successfully and submitted for faculty moderation!</span>
        </div>
      )}

      {deleteNotice && (
        <div className="p-4 bg-surface-canvas border border-edge rounded-lg text-ink-secondary text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-brand" />
          <span>{deleteNotice}</span>
        </div>
      )}

      {/* ADMIN REQUESTED A NEW TAKE */}
      {video?.changeRequestedAt && (
        <div className="p-4 bg-status-bg-changes border border-status-changes rounded-lg text-status-changes text-xs space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-bold">A new introduction video has been requested</span>
          </div>
          <p className="leading-relaxed">
            {video.changeRequestNote ||
              'Faculty asked you to record a new version of your introduction video. Uploading it will replace your current video and the old file will be removed.'}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-primary min-h-[44px]"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload New Video</span>
          </button>
        </div>
      )}

      {/* PUBLIC VISIBILITY */}
      {submission?.videoUploaded && (
        <div className="surface p-4 text-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              {video?.isPublic ? (
                <Globe className="w-4 h-4 shrink-0 text-status-approved mt-0.5" />
              ) : (
                <EyeOff className="w-4 h-4 shrink-0 text-ink-muted mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="font-bold text-ink font-heading">
                  Show this video on my public profile
                </p>
                <p className="text-ink-secondary mt-0.5 leading-relaxed">
                  {video?.status === 'APPROVED'
                    ? video.isPublic
                      ? 'Your approved video is currently visible on your public profile and the showcase.'
                      : 'Make your video visible on your public profile and the student showcase.'
                    : 'Awaiting faculty approval. Only approved videos can be displayed on your public profile.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleTogglePublish(!video?.isPublic)}
              disabled={publishing || video?.status !== 'APPROVED'}
              title={video?.status === 'APPROVED' ? undefined : 'Faculty approval required to publish on public profile'}
              className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] ${
                video?.isPublic
                  ? 'btn btn-secondary'
                  : 'btn btn-primary'
              }`}
            >
              {publishing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : video?.isPublic ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Globe className="w-3.5 h-3.5" />
              )}
              <span>{video?.isPublic ? 'Hide from Profile' : 'Show on Profile'}</span>
            </button>
          </div>

          {publishNotice && (
            <p className="text-xs text-ink-secondary flex items-center gap-1.5">
              <Info className="w-3 h-3 shrink-0 text-brand" />
              <span>{publishNotice}</span>
            </p>
          )}
        </div>
      )}

      {/* MAIN TWO-COLUMN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: VIDEO PLAYER OR UPLOADER (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink font-heading">Video Playback & Media</h2>
              <input
                type="file"
                ref={fileInputRef}
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn btn-primary min-h-[44px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{submission?.videoUploaded ? 'Upload New Take' : 'Upload Video'}</span>
                </button>
                {submission?.videoUploaded && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting || uploading}
                    title="Delete your submitted video"
                    className="btn btn-ghost min-h-[44px]"
                  >
                    {deleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Delete Video</span>
                  </button>
                )}
              </div>
            </div>

            {uploading ? (
              <div className="border border-dashed border-edge-strong/40 bg-brand-soft/20 rounded-lg p-8 sm:p-12 text-center space-y-4">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-brand-soft border-t-brand animate-spin" />
                  <span className="absolute text-xs font-black text-ink">{uploadProgress}%</span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-ink font-heading">
                    {uploadStats?.phase === 'confirming'
                      ? 'Finalizing submission with Google Drive...'
                      : 'Streaming video to Google Drive...'}
                  </h3>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    Zero server buffering • Direct parallel pipeline to cloud storage
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="w-80 max-w-full mx-auto space-y-2">
                  <div className="w-full bg-brand-soft rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-brand h-full rounded-full transition-transform duration-base ease-standard"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>

                  {/* Live Metrics Row */}
                  {uploadStats && (
                    <div className="flex items-center justify-between text-xs text-ink-secondary px-0.5">
                      <span>{uploadStats.loadedMb} / {uploadStats.totalMb} MB</span>
                      <div className="flex items-center gap-2.5">
                        {uploadStats.speedFormatted && (
                          <span className="font-semibold text-ink">{uploadStats.speedFormatted}</span>
                        )}
                        {uploadStats.etaFormatted && (
                          <span className="text-ink-muted">{uploadStats.etaFormatted}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Meta Badges */}
                {videoMeta && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-surface border border-edge font-medium text-ink-secondary">
                      File: {videoMeta.sizeMb} MB
                    </span>
                    {videoMeta.durationFormatted && (
                      <span className="px-2 py-0.5 rounded-md bg-surface border border-edge font-medium text-ink-secondary">
                        Duration: {videoMeta.durationFormatted}
                      </span>
                    )}
                    {videoMeta.resolutionFormatted && (
                      <span className="px-2 py-0.5 rounded-md bg-surface border border-edge font-medium text-ink-secondary">
                        Resolution: {videoMeta.resolutionFormatted}
                      </span>
                    )}
                  </div>
                )}

                {/* Duration notice if outside 60-90s */}
                {videoMeta?.durationNotice && (
                  <div className="max-w-md mx-auto p-2 bg-brand-soft/40 border border-brand/30 rounded-lg text-xs text-brand-soft-text text-left flex items-start gap-1.5">
                    <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                    <span>{videoMeta.durationNotice}</span>
                  </div>
                )}

                {/* Wi-Fi Optimization Notice if file is large */}
                {videoMeta?.isLarge && (
                  <div className="max-w-md mx-auto p-2.5 bg-status-bg-pending border border-status-pending rounded-lg text-xs text-status-pending text-left flex items-start gap-2">
                    <Zap className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>Fast Upload Tip:</strong> This video is {videoMeta.sizeMb} MB. Recording at 720p HD (~8–12 MB) uploads up to 2× faster on campus Wi-Fi!
                    </span>
                  </div>
                )}

                {/* Cancel Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCancelUpload}
                    className="text-xs font-semibold text-ink-muted hover:text-status-rejected transition-colors inline-flex items-center gap-1 cursor-pointer min-h-[44px] min-w-[44px]"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel Upload
                  </button>
                </div>
              </div>
            ) : playbackUrl ? (
              <div className="mx-auto max-w-2xl max-h-[60dvh] bg-surface-inverse rounded-lg overflow-hidden aspect-video border border-edge-strong shadow-inner">
                {playbackUrl ? (
                  <video
                    ref={videoRef}
                    key={playbackUrl}
                    src={playbackUrl}
                    poster={video?.thumbnailUrl ? resolveMediaUrl(video.thumbnailUrl) : undefined}
                    controls
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    playsInline
                    preload="metadata"
                    crossOrigin="use-credentials"
                    onError={handlePlaybackError}
                    className="w-full h-full object-contain"
                  >
                    Your browser cannot play this video.
                  </video>
                ) : (video?.driveFileId || (submission as any)?.videoDriveId) && !(video?.driveFileId || (submission as any)?.videoDriveId)?.startsWith('mock_') ? (
                  <iframe
                    src={`https://drive.google.com/file/d/${video?.driveFileId || (submission as any)?.videoDriveId}/preview`}
                    allow="autoplay; fullscreen"
                    className="w-full h-full border-0 rounded-lg aspect-video"
                    title="Introduction video preview"
                  />
                ) : null}
                {previewError && (
                  <p className="px-4 py-2 text-xs text-ink bg-status-bg-pending border-t border-edge" role="alert">
                    Could not load your recording from the server. Refresh the page to try again.
                  </p>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-edge hover:border-edge-strong bg-surface-canvas hover:bg-brand-soft/10 rounded-lg p-6 sm:p-12 flex flex-col items-center text-center justify-center min-h-[300px] transition-colors cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-lg bg-surface border border-edge flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-card">
                  <FileVideo className="w-8 h-8 text-brand" />
                </div>
                <h3 className="font-bold text-base text-ink font-heading">Upload your self-introduction video</h3>
                <p className="text-xs text-ink-secondary max-w-sm mt-1.5 mb-6">
                  Recommended: MP4 or WebM, 720p/1080p, 60–90 seconds, under {maxVideoSizeMb}MB. Introduce your name, branch, interests, and career ambitions.
                </p>
                <button
                  type="button"
                  className="btn btn-primary min-h-[44px]"
                >
                  Select Video File
                </button>
              </div>
            )}

            {/* WHAT IS CURRENTLY STORED */}
            {video && video.hasFile && (
              <div className="rounded-lg border border-edge bg-surface-canvas px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-secondary">
                  <div className="flex items-center gap-1.5">
                    <FileVideo className="w-3.5 h-3.5 text-brand shrink-0" />
                    <span className="font-semibold text-ink truncate max-w-[16rem]">
                      {video.filename || 'self-introduction.mp4'}
                    </span>
                  </div>
                  {video.sizeMb != null && (
                    <span className="font-medium">{video.sizeMb} MB</span>
                  )}
                  {video.mimeType && <span className="font-medium uppercase">{video.mimeType}</span>}
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">
                      Submitted {formatSubmittedAt(video.submittedAt)}
                    </span>
                  </span>
                  <span className="ml-auto">{getStatusBadge(video.status)}</span>
                </div>
                {/* Replacing is always available, not only when faculty has asked
                    for a new take. A new upload overwrites the previous file and
                    sends the video back through moderation. */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-surface text-ink-secondary hover:border-edge-strong hover:text-brand font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Record a replacement</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: GUIDELINES & REVIEW FEEDBACK (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          {/* REVIEW FEEDBACK (IF REVIEWED) */}
          {submission && (submission.reviewText || submission.adminNotes || submission.reviewPros?.length || submission.reviewCons?.length) ? (
            <div className="surface p-6 space-y-4">
              <h2 className="text-sm font-bold text-ink font-heading">Faculty Review Feedback</h2>

              {submission.reviewText && (
                <div className="p-3.5 bg-surface-canvas rounded-lg border border-edge text-xs text-ink-secondary italic">
                  "{submission.reviewText}"
                </div>
              )}

              {submission.adminNotes && (
                <div className="p-3.5 bg-status-bg-changes rounded-lg border border-edge text-xs text-ink">
                  <span className="font-bold block mb-1">Reviewer Note:</span>
                  {submission.adminNotes}
                </div>
              )}

              {submission.reviewPros && submission.reviewPros.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-ink flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5 text-status-approved" /> Strengths
                  </span>
                  <ul className="space-y-1">
                    {submission.reviewPros.map((pro, i) => (
                      <li key={i} className="text-xs text-ink-secondary pl-2 border-l-2 border-status-approved">
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {submission.reviewCons && submission.reviewCons.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-bold text-ink flex items-center gap-1">
                    <ThumbsDown className="w-3.5 h-3.5 text-status-pending" /> Suggestions
                  </span>
                  <ul className="space-y-1">
                    {submission.reviewCons.map((con, i) => (
                      <li key={i} className="text-xs text-ink-secondary pl-2 border-l-2 border-status-pending">
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          {/* RECORDING GUIDELINES */}
          <div className="surface p-6 space-y-4 text-xs">
            <h2 className="text-sm font-bold text-ink font-heading">Recording Guidelines</h2>
            <ul className="space-y-2.5 text-ink-secondary">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-approved shrink-0 mt-0.5" />
                <span><strong>Duration:</strong> Between 60 and 90 seconds.</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-status-pending shrink-0 mt-0.5" />
                <span><strong>Speed Tip:</strong> Record in <strong>720p (HD) at 30fps</strong> for the fastest upload. A 90s video will be only ~8–12 MB and upload in under 20 seconds!</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-approved shrink-0 mt-0.5" />
                <span><strong>Framing:</strong> Landscape orientation, eye level, shoulders-up framing.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-approved shrink-0 mt-0.5" />
                <span><strong>Audio:</strong> Quiet environment with clear voice projection.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-approved shrink-0 mt-0.5" />
                <span><strong>Structure:</strong> Full Name & Roll Number → Technical Areas → Major Project → Career Ambitions.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPage;
