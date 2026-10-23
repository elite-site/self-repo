import React from 'react';
import { ExternalLink, Download, FileText, Presentation, HelpCircle, BookMarked, Sparkles } from 'lucide-react';
import { Badge, type BadgeVariant } from '@/shared/ui/Badge';
import type { StudyResource, ResourceType } from '@/shared/types';

interface ResourceItemProps {
  resource: StudyResource;
}

const TYPE_CONFIG: Record<
  ResourceType,
  { label: string; variant: BadgeVariant; icon: React.FC<{ className?: string }> }
> = {
  NOTES: { label: 'Notes', variant: 'brand', icon: FileText },
  PPT: { label: 'PPT', variant: 'warning', icon: Presentation },
  QUESTION_PAPER: { label: 'Question Paper', variant: 'danger', icon: HelpCircle },
  LAB_MANUAL: { label: 'Lab Manual', variant: 'success', icon: BookMarked },
  SYLLABUS: { label: 'Syllabus', variant: 'info', icon: FileText },
  OTHER: { label: 'Other', variant: 'neutral', icon: FileText },
};

export const ResourceItem: React.FC<ResourceItemProps> = ({ resource }) => {
  const config = TYPE_CONFIG[resource.type] || TYPE_CONFIG.OTHER;
  const TypeIcon = config.icon;

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(resource.previewUrl || resource.driveLink, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(resource.downloadUrl || resource.driveLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-surface border border-edge hover:border-brand/40 transition-all duration-150">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted group-hover:text-brand transition-colors">
          <TypeIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-heading text-body-sm sm:text-headline-sm font-semibold text-ink break-words line-clamp-2">
              {resource.title}
            </h4>
            {resource.isNew && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-soft text-brand">
                <Sparkles className="size-3" aria-hidden="true" />
                New
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-label-sm text-ink-muted">
            <Badge label={config.label} variant={config.variant} dot={false} />
            {resource.uploadedBy && (
              <span>• Added by {resource.uploadedBy}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
        <button
          type="button"
          onClick={handlePreview}
          className="btn btn-secondary text-xs sm:text-sm py-1.5 px-3 inline-flex items-center gap-1.5 cursor-pointer"
          aria-label={`Preview ${resource.title}`}
        >
          <ExternalLink className="size-3.5" />
          <span>Preview</span>
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="btn btn-primary text-xs sm:text-sm py-1.5 px-3 inline-flex items-center gap-1.5 cursor-pointer"
          aria-label={`Download ${resource.title}`}
        >
          <Download className="size-3.5" />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
};
