import React from 'react';
import {
  ExternalLink,
  Download,
  Film,
  FileText,
  Award,
  FolderGit2,
  Trophy,
} from 'lucide-react';
import { UnifiedModerationItem } from '../../types';
import { DocumentOrImagePreview, VideoPreviewPlayer } from '../ModerationPreview';

interface ModerationItemPreviewProps {
  selectedItem: UnifiedModerationItem;
  driveWatchUrl: string | null;
}

export const ModerationItemPreview: React.FC<ModerationItemPreviewProps> = ({
  selectedItem,
  driveWatchUrl,
}) => {
  return (
    <div className="lg:col-span-8 flex flex-col justify-center items-center bg-surface-sunken rounded-xl p-4 min-h-[400px]">
      {/* Media Action Strip */}
      <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-edge shrink-0">
        <span className="text-label-sm font-semibold text-ink-muted">
          {selectedItem.itemType === 'video'
            ? 'Video Player'
            : selectedItem.itemType === 'resume'
            ? 'Resume Document'
            : selectedItem.itemType === 'certificate'
            ? 'Certificate Document'
            : selectedItem.itemType === 'project'
            ? 'Project Dossier'
            : 'Achievement Proof'}
        </span>
        <div className="flex items-center gap-2">
          {driveWatchUrl && (
            <a
              href={driveWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost text-label-sm py-1 px-2.5 inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand" />
              <span>Open in Drive</span>
            </a>
          )}
          {selectedItem.fileUrl && (
            <a
              href={selectedItem.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost text-label-sm py-1 px-2.5 inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand" />
              <span>Open in new tab</span>
            </a>
          )}
          {selectedItem.fileUrl && (
            <a
              href={`${selectedItem.fileUrl}${selectedItem.fileUrl.includes('?') ? '&' : '?'}download=1`}
              className="btn btn-ghost text-label-sm py-1 px-2.5 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-brand" />
              <span>Download</span>
            </a>
          )}
        </div>
      </div>

      {/* Media Container: Conditional per Artifact Type */}
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        {/* 1. INTRO VIDEO */}
        {selectedItem.itemType === 'video' && (
          <div className="w-full flex flex-col items-center justify-center">
            <VideoPreviewPlayer
              url={selectedItem.fileUrl}
              driveFileId={selectedItem.driveFileId}
              id={selectedItem.id}
              title={selectedItem.title}
            />
            <div className="w-full text-label-sm text-ink-muted flex items-center justify-between px-1 mt-3">
              <span>Submitted: {new Date(selectedItem.submittedAt).toLocaleString()}</span>
              {selectedItem.driveFileId && (
                <span className="font-mono text-xs">File ID: {selectedItem.driveFileId}</span>
              )}
            </div>
          </div>
        )}

        {/* 2. RESUME */}
        {selectedItem.itemType === 'resume' && (
          <div className="w-full flex-1 flex flex-col space-y-3">
            {selectedItem.fileUrl ? (
              <div className="w-full h-[65vh] min-h-[420px] rounded-lg overflow-hidden border border-edge bg-surface">
                <iframe
                  src={selectedItem.fileUrl}
                  title={selectedItem.title}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center gap-3 my-auto">
                <div className="w-16 h-16 rounded-full bg-brand-soft flex items-center justify-center text-brand border border-brand/20">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="font-bold text-ink">{selectedItem.title}</div>
                <p className="text-body-sm text-ink-muted">Resume document is ready for review.</p>
              </div>
            )}
            <div className="text-label-sm text-ink-muted flex items-center justify-between px-1">
              <span>Submitted: {new Date(selectedItem.submittedAt).toLocaleString()}</span>
              <span>{selectedItem.description || 'PDF Document'}</span>
            </div>
          </div>
        )}

        {/* 3. CERTIFICATE */}
        {selectedItem.itemType === 'certificate' && (() => {
          const certUrl = selectedItem.fileUrl || selectedItem.thumbnailUrl;
          return (
            <div className="w-full flex-1 flex flex-col space-y-3">
              <div className="w-full flex-1 min-h-[320px] flex items-center justify-center">
                {certUrl ? (
                  <DocumentOrImagePreview
                    url={certUrl}
                    title={selectedItem.title}
                    isPdfHint={Boolean(
                      certUrl.toLowerCase().includes('.pdf') || certUrl.toLowerCase().includes('/pdf')
                    )}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center gap-3 my-auto">
                    <div className="w-20 h-20 rounded-full bg-brand-soft flex items-center justify-center text-brand border border-brand/20">
                      <Award className="w-10 h-10" />
                    </div>
                    <p className="font-bold text-ink text-body-md">{selectedItem.title}</p>
                    <p className="text-body-sm text-ink-muted">No preview document attached</p>
                  </div>
                )}
              </div>
              <div className="p-3 surface rounded-lg border border-edge space-y-1 w-full">
                <div className="font-bold text-ink text-body-sm">{selectedItem.title}</div>
                {selectedItem.description && (
                  <p className="text-body-sm text-ink-muted">{selectedItem.description}</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* 4. PROJECT */}
        {selectedItem.itemType === 'project' && (
          <div className="w-full flex-1 flex flex-col justify-center space-y-4 p-5 surface rounded-xl border border-edge">
            <div className="space-y-2">
              <h3 className="text-headline-sm font-bold text-ink">{selectedItem.title}</h3>
              {selectedItem.description && (
                <p className="text-body-sm text-ink leading-relaxed whitespace-pre-wrap">
                  {selectedItem.description}
                </p>
              )}
            </div>

            {selectedItem.technologies && selectedItem.technologies.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-label-sm font-semibold text-ink-muted">Tech stack</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedItem.technologies.map((tech, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md text-label-sm font-medium bg-brand-soft text-brand border border-brand/20"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {selectedItem.githubUrl && (
                <a
                  href={selectedItem.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary text-body-sm inline-flex items-center gap-2"
                >
                  <FolderGit2 className="w-4 h-4 text-brand" />
                  <span>GitHub Repository</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {selectedItem.driveVideoUrl && (
                <a
                  href={selectedItem.driveVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary text-body-sm inline-flex items-center gap-2"
                >
                  <Film className="w-4 h-4 text-brand" />
                  <span>Demo Video</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* 5. ACHIEVEMENT */}
        {selectedItem.itemType === 'achievement' && (() => {
          const proofUrl = selectedItem.fileUrl || selectedItem.proofUrl;
          return (
            <div className="w-full flex-1 flex flex-col space-y-4">
              <div className="w-full flex-1 min-h-[320px] flex items-center justify-center">
                {proofUrl ? (
                  <DocumentOrImagePreview
                    url={proofUrl}
                    title={selectedItem.title}
                    isPdfHint={Boolean(
                      proofUrl.toLowerCase().includes('.pdf') || proofUrl.toLowerCase().includes('/pdf')
                    )}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center gap-3 my-auto">
                    <div className="w-20 h-20 rounded-full bg-brand-soft flex items-center justify-center text-brand border border-brand/20">
                      <Trophy className="w-10 h-10" />
                    </div>
                    <p className="font-bold text-ink text-body-md">{selectedItem.title}</p>
                    <p className="text-body-sm text-ink-muted">No proof document attached</p>
                  </div>
                )}
              </div>

              <div className="space-y-3 p-4 surface rounded-xl border border-edge w-full">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-pending text-xs font-semibold">
                      {selectedItem.category || 'Achievement'}
                    </span>
                    {selectedItem.organization && (
                      <span className="text-label-sm text-ink-muted">• {selectedItem.organization}</span>
                    )}
                  </div>
                  <h3 className="text-headline-sm font-bold text-ink">{selectedItem.title}</h3>
                </div>

                {selectedItem.description && (
                  <p className="text-body-sm text-ink leading-relaxed whitespace-pre-wrap">
                    {selectedItem.description}
                  </p>
                )}

                {proofUrl && (
                  <div className="pt-2 border-t border-edge">
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary text-body-sm inline-flex items-center gap-2"
                    >
                      <Award className="w-4 h-4 text-brand" />
                      <span>Open Proof in New Tab</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
