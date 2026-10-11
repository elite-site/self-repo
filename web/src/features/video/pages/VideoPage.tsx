import React from 'react';
import {
  UploadCloud,
  Trash2,
  Loader2,
  Globe,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { ProgressSteps } from '@/shared/ui/ProgressSteps';
import { useVideoUpload } from '../hooks/useVideoUpload';
import { VideoPlayerCard, VideoUploadCard, VideoReviewFeedback } from '../components';

const lifecycleSteps = [
  { id: 'upload', label: '1. Upload' },
  { id: 'review', label: '2. Review' },
  { id: 'approved', label: '3. Approved' },
  { id: 'publish', label: '4. Public' },
];

export const VideoPage: React.FC = () => {
  const {
    submission,
    video,
    maxVideoSizeMb,
    loading,
    uploading,
    uploadProgress,
    uploadStats,
    videoMeta,
    error,
    publishing,
    deleting,
    previewError,
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
  } = useVideoUpload();

  if (loading) {
    return <SkeletonPage label="Loading video submission" cards={2} rows={2} />;
  }

  const videoStatus = video?.status?.toUpperCase() || submission?.status?.toUpperCase();
  const lifecycleCurrent = video?.isPublic ? 4 : videoStatus === 'APPROVED' ? 3 : submission?.videoUploaded ? 2 : 1;

  return (
    <div className="space-y-6 text-left page-enter max-w-6xl mx-auto" role="main">
      <div className="surface p-6">
        <h1 className="text-xl sm:text-2xl font-black text-ink font-heading">Self-Introduction Video</h1>
        <p className="mt-0.5 text-body-sm text-ink-secondary">
          Record a 60–90 second video introducing your skills and project ambitions.
        </p>
        <div className="mt-5">
          <ProgressSteps steps={lifecycleSteps} current={lifecycleCurrent} tone="brand" label="Video status" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-status-bg-rejected border border-status-rejected rounded-lg text-status-rejected text-xs flex items-center justify-between" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadSubmission(true)} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

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
                <p className="font-bold text-ink font-heading">Show this video on my public profile</p>
                <p className="text-ink-secondary mt-0.5 leading-relaxed">
                  {video?.status === 'APPROVED'
                    ? video.isPublic
                      ? 'Your approved video is visible on your public profile.'
                      : 'Make your video visible on your public profile and showcase.'
                    : 'Awaiting faculty approval. Only approved videos can be displayed.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleTogglePublish(!video?.isPublic)}
              disabled={publishing || video?.status !== 'APPROVED'}
              className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-opacity disabled:opacity-50 min-h-[44px] ${
                video?.isPublic ? 'btn btn-secondary' : 'btn btn-primary'
              }`}
            >
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : video?.isPublic ? <EyeOff className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
              <span>{video?.isPublic ? 'Hide from profile' : 'Show on profile'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink font-heading">Your video</h2>
              <input
                type="file"
                ref={fileInputRef}
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileSelect}
                className="hidden"
              />
              {submission?.videoUploaded && !uploading && (
                <div className="flex items-center gap-3">
                  <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary min-h-[44px]">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Replace video</span>
                  </button>
                  <button type="button" onClick={handleDelete} disabled={deleting} className="btn btn-ghost min-h-[44px] text-status-rejected">
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Delete video</span>
                  </button>
                </div>
              )}
            </div>

            {uploading ? (
              <VideoUploadCard
                uploading={uploading}
                uploadProgress={uploadProgress}
                uploadStats={uploadStats}
                videoMeta={videoMeta}
                maxVideoSizeMb={maxVideoSizeMb}
                fileInputRef={fileInputRef}
                onCancelUpload={handleCancelUpload}
                onSelectClick={() => fileInputRef.current?.click()}
              />
            ) : playbackUrl ? (
              <VideoPlayerCard
                playbackUrl={playbackUrl}
                previewError={previewError}
                video={video}
                videoRef={videoRef}
                onPlaybackError={handlePlaybackError}
                onRetryPlayback={handleRetryPlayback}
              />
            ) : (
              <VideoUploadCard
                uploading={false}
                uploadProgress={0}
                uploadStats={null}
                videoMeta={null}
                maxVideoSizeMb={maxVideoSizeMb}
                fileInputRef={fileInputRef}
                onCancelUpload={handleCancelUpload}
                onSelectClick={() => fileInputRef.current?.click()}
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <VideoReviewFeedback submission={submission} />
          <div className="surface p-6 space-y-4 text-xs">
            <h2 className="text-sm font-bold text-ink font-heading">Recording guidelines</h2>
            <ul className="space-y-2 text-ink-secondary">
              <li><strong>Duration:</strong> 60 to 90 seconds.</li>
              <li><strong>Quality:</strong> 720p landscape orientation.</li>
              <li><strong>Framing:</strong> Eye level, shoulders-up framing.</li>
              <li><strong>Audio:</strong> Clear voice in quiet surroundings.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPage;
