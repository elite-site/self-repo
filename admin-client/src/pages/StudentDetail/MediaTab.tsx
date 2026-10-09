import React, { useState } from 'react';
import {
  Film,
  FileText,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Download,
  Eye,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { ItemStatusBadge } from './ItemStatusBadge';

export interface MediaTabProps {
  introVideo: any;
  resume: any;
  onRequestChanges: (type: string, itemId: string, itemTitle: string) => void;
  onDelete: (type: string, itemId: string, itemTitle: string) => void;
}

export const MediaTab: React.FC<MediaTabProps> = ({
  introVideo,
  resume,
  onRequestChanges,
  onDelete,
}) => {
  const [videoError, setVideoError] = useState(false);
  const [videoRetryKey, setVideoRetryKey] = useState(0);

  return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. INTRODUCTION VIDEO CARD */}
        <div className="bg-surface border border-edge rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-edge mb-4">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-ink-brand" />
                <h3 className="font-semibold text-sm text-ink">Introduction Video</h3>
              </div>
              {introVideo ? (
                <ItemStatusBadge status={introVideo.status} />
              ) : (
                <span className="text-xs font-semibold text-ink-muted">Not submitted</span>
              )}
            </div>

            {introVideo ? (() => {
              const videoStreamUrl = introVideo.streamUrl || (introVideo.driveFileId ? `/api/public/media/video/${introVideo.driveFileId.trim()}?stream=true` : (introVideo.id ? `/api/public/media/video/${introVideo.id}?stream=true` : null));
              const introDriveUrl = introVideo.watchUrl || (introVideo.driveFileId ? `https://drive.google.com/file/d/${introVideo.driveFileId}/view` : null);

              return (
              <div className="space-y-3">
                {/* Video embed / player */}
                <div className="bg-surface-inverse rounded-xl overflow-hidden aspect-video relative flex items-center justify-center">
                  {videoStreamUrl ? (
                    videoError ? (
                      <div className="text-center p-6 space-y-3">
                        <AlertTriangle className="w-8 h-8 text-status-changes mx-auto" />
                        <p className="text-xs text-ink-muted">Video could not be played in browser directly.</p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setVideoError(false);
                              setVideoRetryKey((k) => k + 1);
                            }}
                            className="btn btn-secondary text-xs inline-flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                          {introDriveUrl && (
                            <a
                              href={introDriveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-primary text-xs inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open in Drive</span>
                            </a>
                          )}
                          <a
                            href={`${videoStreamUrl}${videoStreamUrl.includes('?') ? '&' : '?'}download=1`}
                            className="btn btn-ghost text-xs inline-flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <video
                        key={`${introVideo.id}-${videoRetryKey}`}
                        src={`${videoStreamUrl}${videoRetryKey > 0 ? (videoStreamUrl.includes('?') ? '&' : '?') + `retry=${videoRetryKey}` : ''}`}
                        controls
                        preload="metadata"
                        playsInline
                        onError={() => setVideoError(true)}
                        className="w-full h-full object-contain bg-black"
                      />
                    )
                  ) : (
                    <div className="text-ink-muted text-xs flex flex-col items-center gap-2">
                      <Film className="w-8 h-8 opacity-40" />
                      <span>Video uploaded</span>
                    </div>
                  )}
                </div>

                {/* Metadata & Links */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted pt-1">
                  <span>
                    Size: {introVideo.sizeMb ? `${introVideo.sizeMb} MB` : 'Recorded video'} • Submitted:{' '}
                    {new Date(introVideo.submittedAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    {introVideo.watchUrl && (
                      <a
                        href={introVideo.watchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-status-approved hover:underline font-bold text-xs inline-flex items-center gap-1"
                      >
                        <span>Open in Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Revision Note Callout */}
                {introVideo.status === 'CHANGES_REQUESTED' && (
                  <div className="p-3 bg-status-bg-changes border border-edge rounded-xl text-xs text-ink">
                    <strong>Revision Note:</strong>{' '}
                    {introVideo.reviewNote || introVideo.changeRequestNote || 'Please re-upload your introduction video.'}
                  </div>
                )}
              </div>
              );
            })() : (
              <div className="py-12 text-center text-ink-muted text-xs italic">
                No introduction video has been submitted by this student yet.
              </div>
            )}
          </div>

          {/* Video Admin Actions */}
          {introVideo && (
            <div className="pt-4 mt-4 border-t border-edge flex items-center justify-end gap-2">
              <button
                onClick={() => onRequestChanges('video', introVideo.id, 'Introduction Video')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-status-bg-changes hover:bg-status-bg-changes text-status-changes text-xs font-bold transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Request new upload</span>
              </button>
              <button
                onClick={() => onDelete('video', introVideo.id, 'Introduction Video')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-status-bg-rejected hover:bg-status-bg-rejected text-status-rejected text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete file</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. RESUME CARD */}
        <div className="bg-surface border border-edge rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-edge mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-ink-brand" />
                <h3 className="font-semibold text-sm text-ink">Professional Resume</h3>
              </div>
              {resume ? (
                <ItemStatusBadge status={resume.status} />
              ) : (
                <span className="text-xs font-semibold text-ink-muted">Not submitted</span>
              )}
            </div>

            {resume ? (
              <div className="space-y-3">
                {/* Resume preview / file box */}
                <div className="p-4 rounded-xl border border-edge bg-surface-canvas flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-status-bg-rejected text-ink-brand flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate" title={resume.filename}>
                        {resume.filename || 'Student_Resume.pdf'}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {resume.sizeMb ? `${resume.sizeMb} MB` : 'PDF'} • Submitted{' '}
                        {new Date(resume.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(resume.watchUrl || resume.previewUrl) && (
                      <a
                        href={resume.watchUrl || resume.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-status-bg-approved text-status-approved rounded-lg text-xs font-bold hover:bg-status-bg-approved transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </a>
                    )}
                    {resume.fileUrl && (
                      <a
                        href={`${resume.fileUrl}?download=1`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-sunken text-ink-secondary rounded-lg text-xs font-bold hover:bg-surface-inset transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Revision Note Callout */}
                {resume.status === 'CHANGES_REQUESTED' && (
                  <div className="p-3 bg-status-bg-changes border border-edge rounded-xl text-xs text-ink">
                    <strong>Revision Note:</strong>{' '}
                    {resume.reviewNote || 'The student was asked to revise and re-upload an updated resume.'}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-ink-muted text-xs italic">
                No resume has been uploaded by this student yet.
              </div>
            )}
          </div>

          {/* Resume Admin Actions */}
          {resume && (
            <div className="pt-4 mt-4 border-t border-edge flex items-center justify-end gap-2">
              <button
                onClick={() => onRequestChanges('resume', resume.id, 'Resume')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-status-bg-changes hover:bg-status-bg-changes text-status-changes text-xs font-bold transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Request new upload</span>
              </button>
              <button
                onClick={() => onDelete('resume', resume.id, 'Resume')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-status-bg-rejected hover:bg-status-bg-rejected text-status-rejected text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete file</span>
              </button>
            </div>
          )}
        </div>
      </div>
  );
};
