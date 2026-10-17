import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { videoApi } from '../api';
import { profileApi } from '@/features/profile/api';
import { resolveMediaUrl, UploadProgressInfo } from '@/shared/api';
import { pauseNotificationPolling, resumeNotificationPolling } from '@/features/notifications/api';
import { StudentIntroVideo, StudentSubmission, UploadStats, VideoMeta } from '../types';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/shared/ui/Toast';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

const DEFAULT_MAX_VIDEO_MB = 25;

export function useVideoUpload() {
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
  const [useProxy, setUseProxy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasSubmissionData = useRef(false);

  const setLocalPreview = (url: string | null) => {
    if (objectUrlRef.current && objectUrlRef.current !== url) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = url;
    setLocalPreviewUrl(url);
  };

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
    if (isInitial && !hasSubmissionData.current) setLoading(true);
    setError(null);
    try {
      const data: any = await profileApi.getMe();
      if (data && data.student) {
        setVideo(data.student.video || null);
        setMaxVideoSizeMb(data.student.maxVideoSizeMb || DEFAULT_MAX_VIDEO_MB);
        setSubmission(data.student.submission || null);
        hasSubmissionData.current = true;
        if (!data.student.video?.hasFile) {
          setLocalPreview(null);
          setPreviewError(false);
        }
      }
    } catch {
      if (isInitial && !hasSubmissionData.current) {
        setError('Could not load your submission details.');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  const storedVideoUrl = useMemo(() => {
    if (!video?.hasFile) return null;
    const base = resolveMediaUrl('/api/student/submission/media/video');
    const stamp = new Date(video.submittedAt || 0).getTime() || 0;
    const token = localStorage.getItem('student_token');
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    const proxyParam = useProxy ? '&proxy=1' : '';
    return `${base}?v=${encodeURIComponent(video.id)}-${stamp}${tokenParam}${proxyParam}`;
  }, [video?.id, video?.submittedAt, video?.hasFile, useProxy]);

  const playbackUrl = localPreviewUrl ?? storedVideoUrl;

  const handlePlaybackError = useCallback(() => {
    if (!storedVideoUrl || localPreviewUrl) return;
    if (!useProxy) {
      setUseProxy(true);
      setPreviewError(false);
    } else {
      setPreviewError(true);
    }
  }, [storedVideoUrl, localPreviewUrl, useProxy]);

  const handleRetryPlayback = useCallback(() => {
    setPreviewError(false);
    setUseProxy(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, []);

  const prevVideoIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevVideoIdRef.current !== undefined && prevVideoIdRef.current !== video?.id) {
      setPreviewError(false);
      setUseProxy(false);
    }
    prevVideoIdRef.current = video?.id;
  }, [video?.id]);

  const handleTogglePublish = async (next: boolean) => {
    setPublishing(true);
    setPublishNotice(null);
    try {
      const res = await videoApi.setVideoPublic(next);
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
      const res = await videoApi.deleteVideo();
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

  const seededFromSession = useRef(false);
  useEffect(() => {
    if (seededFromSession.current) return;
    const cached = session?.student;
    if (!cached) {
      seededFromSession.current = true;
      loadSubmission(true);
      return;
    }
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
  }, [loadSubmission, session]);

  const inspectVideoFile = (file: File): Promise<VideoMeta> => {
    return new Promise((resolve) => {
      const sizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(1));
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
    showToast('Upload cancelled. Your current video is unchanged.', 'info');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Choose an MP4, WebM or MOV video.');
      showToast('Choose an MP4, WebM or MOV video.', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > maxVideoSizeMb * 1024 * 1024) {
      const message = `This video is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The limit is ${maxVideoSizeMb} MB.`;
      setError(message);
      showToast(message, 'error');
      e.target.value = '';
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);
    setUploadStats(null);
    setUploadSuccess(false);

    pauseNotificationPolling();
    const meta = await inspectVideoFile(file);
    setVideoMeta(meta);

    const localUrl = URL.createObjectURL(file);
    abortControllerRef.current = new AbortController();

    try {
      const onProgressStats = (info: UploadProgressInfo) => {
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
      };

      let res: { success: boolean; id: string; driveFileId?: string | null; previewUrl?: string | null; message?: string };
      let directUploadFailed = false;

      let uploadSession: { sessionUrl: string | null; chunkSize: number } | null = null;
      try {
        uploadSession = await videoApi.createVideoUploadSession({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'video/mp4',
        });
      } catch {
        directUploadFailed = true;
      }

      if (uploadSession?.sessionUrl && !directUploadFailed) {
        try {
          const { driveFileId } = await videoApi.uploadDirectToDrive({
            sessionUrl: uploadSession.sessionUrl,
            file,
            chunkSize: uploadSession.chunkSize,
            onProgress: onProgressStats,
            signal: abortControllerRef.current.signal,
          });

          res = await videoApi.completeVideoUpload({ driveFileId });
        } catch (uploadErr: any) {
          if (abortControllerRef.current?.signal.aborted || uploadErr.message?.includes('cancelled')) {
            throw uploadErr;
          }
          res = await videoApi.submitVideoStream(
            file,
            onProgressStats,
            abortControllerRef.current.signal,
          );
        }
      } else {
        res = await videoApi.submitVideoStream(
          file,
          onProgressStats,
          abortControllerRef.current.signal,
        );
      }

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
      showToast(res.message || 'Video uploaded. Faculty will review it next.');
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
      URL.revokeObjectURL(localUrl);
      if (err.name !== 'AbortError' && !err.message?.includes('cancelled')) {
        const notice = err.message || 'Failed to upload video. Please try again.';
        setError(notice);
        showToast(notice, 'error');
      }
    } finally {
      resumeNotificationPolling();
      setUploading(false);
      abortControllerRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return {
    submission,
    video,
    maxVideoSizeMb,
    loading,
    uploading,
    uploadProgress,
    uploadStats,
    videoMeta,
    error,
    uploadSuccess,
    publishing,
    deleting,
    deleteNotice,
    publishNotice,
    previewError,
    useProxy,
    playbackUrl,
    fileInputRef,
    videoRef,
    loadSubmission,
    handlePlaybackError,
    handleRetryPlayback,
    handleTogglePublish,
    handleDelete,
    handleCancelUpload,
    handleFileSelect,
  };
}
