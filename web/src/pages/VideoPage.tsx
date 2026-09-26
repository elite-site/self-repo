import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { api, resolveMediaUrl, UploadProgressInfo } from '../services/api';
import { StudentIntroVideo, StudentSubmission } from '../types';
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
  Download,
  Zap,
  X,
  Gauge,
  Info,
  Globe,
  EyeOff,
  Play,
  Pause,
  Trash2
} from 'lucide-react';

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
  const [submission, setSubmission] = useState<StudentSubmission | null>(null);
  const [video, setVideo] = useState<StudentIntroVideo | null>(null);
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
  const [isPlaying, setIsPlaying] = useState(false);
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

  const loadSubmission = useCallback(async (isInitial = true) => {
    if (isInitial && !submission) setLoading(true);
    setError(null);
    try {
      const data = await api.getMe();
      setVideo(data?.student?.video ?? null);
      if (data?.student?.submission) {
        setSubmission(data.student.submission);
      } else {
        setSubmission(null);
      }
    } catch {
      if (isInitial) setError('Could not load introduction video status.');
    } finally {
      setLoading(false);
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

  const handlePlayPause = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      withBlobFallback(() => el.play());
    } else {
      el.pause();
    }
  };

  const handleReplay = () => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    withBlobFallback(() => el.play());
  };

  const handleSeek = (deltaSec: number) => {
    const el = videoRef.current;
    if (!el) return;
    const dur = Number.isFinite(el.duration) ? el.duration : 0;
    const target = dur
      ? Math.max(0, Math.min(dur, el.currentTime + deltaSec))
      : el.currentTime + deltaSec;
    el.currentTime = target;
  };

  // A new take invalidates any previous fallback attempt.
  useEffect(() => {
    setPreviewError(false);
    setIsPlaying(false);
  }, [video?.id]);

  /** Publish / unpublish the approved video on the public showcase. */
  const handleTogglePublish = async (next: boolean) => {
    setPublishing(true);
    setPublishNotice(null);
    try {
      const res = await api.setVideoPublic(next);
      setVideo((prev) => (prev ? { ...prev, isPublic: res.isPublic, publishedAt: res.isPublic ? new Date().toISOString() : null } : prev));
      setPublishNotice(res.message || (next ? 'Your video is now public.' : 'Your video is no longer public.'));
    } catch (err: any) {
      setPublishNotice(err?.response?.data?.message || 'Could not update public visibility.');
    } finally {
      setPublishing(false);
    }
  };

  /** Withdraw the submitted take. The server deletes the file and both rows. */
  const handleDelete = async () => {
    if (!window.confirm('Delete your submitted introduction video? This cannot be undone.')) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await api.deleteVideo();
      setLocalPreview(null);
      setVideo(null);
      setSubmission(null);
      setUploadSuccess(false);
      setError(null);
      setDeleteNotice(res.message || 'Your introduction video has been deleted.');
      await loadSubmission(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not delete your video. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadSubmission(true);
  }, [loadSubmission]);

  // Fast in-browser inspection of video file without any heavy dependencies
  const inspectVideoFile = (file: File): Promise<VideoMeta> => {
    return new Promise((resolve) => {
      const sizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(1));
      const isLarge = sizeMb > 15;

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      // A new take overrides the old video, so it goes back to moderation and
      // is no longer public until it is approved again.
      setVideo((prev) =>
        prev
          ? {
              ...prev,
              status: 'PENDING',
              isPublic: false,
              publishedAt: null,
              changeRequestedAt: null,
              changeRequestNote: null,
            }
          : prev,
      );
      // Show the freshly uploaded take immediately; the stored copy is
      // streamed from the server on the next page load or login.
      setLocalPreview(localUrl);
      // Silently sync server state in the background
      loadSubmission(false);
    } catch (err: any) {
      URL.revokeObjectURL(localUrl); // clean up unused preview URL on error
      if (err.name === 'AbortError' || err.message?.includes('cancelled')) {
        setError('Upload cancelled.');
      } else {
        setError(err.message || 'Failed to upload video. Please try again.');
      }
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
      // Reset file input so the same file can be re-selected after an error
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#DC2626]" />
      </div>
    );
  }

  const formatSubmittedAt = (iso: string | null | undefined): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
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
            {getStatusBadge(video?.status || submission.status)}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadSubmission(true)} className="font-bold underline cursor-pointer">
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

      {deleteNotice && (
        <div className="p-4 bg-neutral-100 border border-[#E2E8F0] rounded-2xl text-neutral-700 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{deleteNotice}</span>
        </div>
      )}

      {/* ADMIN REQUESTED A NEW TAKE */}
      {video?.changeRequestedAt && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl text-orange-900 text-xs space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-orange-600" />
            <span className="font-bold">A new introduction video has been requested</span>
          </div>
          <p className="text-orange-800/90 leading-relaxed">
            {video.changeRequestNote ||
              'Faculty asked you to record a new version of your introduction video. Uploading it will replace your current video and the old file will be removed.'}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B5121B] text-white font-bold disabled:opacity-50"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload New Video</span>
          </button>
        </div>
      )}

      {/* PUBLIC VISIBILITY */}
      {submission?.videoUploaded && (
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl text-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              {video?.isPublic ? (
                <Globe className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <EyeOff className="w-4 h-4 shrink-0 text-neutral-400 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="font-bold text-[#0B192C]">
                  Show this video on my public profile
                </p>
                <p className="text-neutral-500 mt-0.5 leading-relaxed">
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
              className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                video?.isPublic
                  ? 'bg-neutral-100 hover:bg-neutral-200 text-[#0B192C]'
                  : 'bg-[#DC2626] hover:bg-[#B5121B] text-white'
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
            <p className="text-[11px] text-neutral-500 flex items-center gap-1.5">
              <Info className="w-3 h-3 shrink-0" />
              {publishNotice}
            </p>
          )}
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
                {playbackUrl && (
                  <a
                    href={playbackUrl}
                    download={video?.filename || 'self-introduction.mp4'}
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
                {submission?.videoUploaded && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting || uploading}
                    title="Delete your submitted video"
                    className="text-xs font-bold text-neutral-500 hover:text-red-600 flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
              <div className="border-2 border-dashed border-red-200 bg-red-50/40 rounded-2xl p-8 sm:p-12 text-center space-y-4">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-red-100 border-t-[#DC2626] animate-spin" />
                  <span className="absolute text-xs font-black text-[#0B192C]">{uploadProgress}%</span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#0B192C]">
                    {uploadStats?.phase === 'confirming'
                      ? 'Finalizing submission with Google Drive...'
                      : 'Streaming video to Google Drive...'}
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Zero server buffering • Direct parallel pipeline to cloud storage
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="w-80 max-w-full mx-auto space-y-2">
                  <div className="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden p-0.5">
                    <div
                      className="bg-gradient-to-r from-red-600 to-red-500 h-full rounded-full transition-all duration-200 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>

                  {/* Live Metrics Row */}
                  {uploadStats && (
                    <div className="flex items-center justify-between text-[11px] text-neutral-600 px-0.5">
                      <span>{uploadStats.loadedMb} / {uploadStats.totalMb} MB</span>
                      <div className="flex items-center gap-2.5">
                        {uploadStats.speedFormatted && (
                          <span className="font-semibold text-neutral-700">⚡ {uploadStats.speedFormatted}</span>
                        )}
                        {uploadStats.etaFormatted && (
                          <span className="text-neutral-500">⏱️ {uploadStats.etaFormatted}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Meta Badges */}
                {videoMeta && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-neutral-200 font-medium text-neutral-700">
                      File: {videoMeta.sizeMb} MB
                    </span>
                    {videoMeta.durationFormatted && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-neutral-200 font-medium text-neutral-700">
                        Duration: {videoMeta.durationFormatted}
                      </span>
                    )}
                    {videoMeta.resolutionFormatted && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-neutral-200 font-medium text-neutral-700">
                        Resolution: {videoMeta.resolutionFormatted}
                      </span>
                    )}
                  </div>
                )}

                {/* Duration notice if outside 60-90s */}
                {videoMeta?.durationNotice && (
                  <div className="max-w-md mx-auto p-2 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 text-left flex items-start gap-1.5">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>{videoMeta.durationNotice}</span>
                  </div>
                )}

                {/* Wi-Fi Optimization Notice if file is large */}
                {videoMeta?.isLarge && (
                  <div className="max-w-md mx-auto p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 text-left flex items-start gap-2">
                    <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
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
                    className="text-xs font-semibold text-neutral-500 hover:text-red-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel Upload
                  </button>
                </div>
              </div>
            ) : playbackUrl ? (
              <div className="bg-black rounded-2xl overflow-hidden aspect-video border border-neutral-800 shadow-inner">
                <video
                  ref={videoRef}
                  key={playbackUrl}
                  src={playbackUrl}
                  controls
                  playsInline
                  preload="metadata"
                  // Sends the httpOnly session cookie when the API lives on a
                  // different origin than the portal (local dev).
                  crossOrigin="use-credentials"
                  onError={handlePlaybackError}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full h-full object-contain"
                >
                  Your browser cannot play this video. Use the Download button to
                  open it in a video player.
                </video>
                {/* Quick controls: Play/Pause, Replay, ±10s seek, Download. */}
                <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-neutral-900 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className="px-3 py-1.5 rounded-xl bg-[#0B192C] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button
                    type="button"
                    onClick={handleReplay}
                    className="px-3 py-1.5 rounded-xl bg-[#0B192C] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    aria-label="Replay video from start"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Replay
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSeek(-10)}
                    className="px-3 py-1.5 rounded-xl bg-[#0B192C] hover:bg-neutral-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    aria-label="Seek back 10 seconds"
                  >
                    -10s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSeek(10)}
                    className="px-3 py-1.5 rounded-xl bg-[#0B192C] hover:bg-neutral-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    aria-label="Seek forward 10 seconds"
                  >
                    +10s
                  </button>
                </div>
                {previewError && (
                  <p className="px-4 py-2 text-[11px] text-amber-800 bg-amber-50 border-t border-amber-200">
                    Could not load your recording from the server. Refresh the
                    page to try again, or use Download.
                  </p>
                )}
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
                  Recommended: MP4 or WebM, 720p/1080p, 60–90 seconds, under 25MB. Introduce your name, branch, interests, and career ambitions.
                </p>
                <button
                  type="button"
                  className="px-6 py-2.5 bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  Select Video File
                </button>
              </div>
            )}

            {/* WHAT IS CURRENTLY STORED — lets the student identify the exact
                take they submitted, on any device and after any number of
                logins, instead of relying on a session-scoped preview. */}
            {video && (
              <div className="rounded-xl border border-[#E2E8F0] bg-neutral-50/60 px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <FileVideo className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                    <span className="font-semibold text-[#0B192C] truncate max-w-[16rem]">
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
                <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Speed Tip:</strong> Record in <strong>720p (HD) at 30fps</strong> for the fastest upload. A 90s video will be only ~8–12 MB and upload in under 20 seconds!</span>
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
