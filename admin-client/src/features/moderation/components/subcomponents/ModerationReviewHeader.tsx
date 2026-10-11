import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { UnifiedModerationItem } from '../../types';
import { StatusBadge, ItemTypeBadge } from '../ModerationPreview';

interface ModerationReviewHeaderProps {
  selectedItem: UnifiedModerationItem;
  selectedIndex: number;
  totalCount: number;
  onSelectPrevious: () => void;
  onSelectNext: () => void;
  onClose: () => void;
}

export const ModerationReviewHeader: React.FC<ModerationReviewHeaderProps> = ({
  selectedItem,
  selectedIndex,
  totalCount,
  onSelectPrevious,
  onSelectNext,
  onClose,
}) => {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-edge bg-surface-sunken shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-brand-soft text-brand flex items-center justify-center font-bold text-body-md border border-brand/20 shrink-0">
          {selectedItem.studentName?.charAt(0) || '?'}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 id="review-modal-title" className="font-semibold text-ink text-body-md truncate">
              {selectedItem.studentName}
            </h2>
            <ItemTypeBadge itemType={selectedItem.itemType} />
            <StatusBadge status={selectedItem.status} />
          </div>
          <div className="text-label-sm font-mono text-ink-muted">
            {selectedItem.studentRoll}
            {selectedItem.studentBranch && ` · ${selectedItem.studentBranch}`}
            {selectedItem.studentYear && ` · Year ${selectedItem.studentYear}`}
            {selectedItem.studentSection && `-${selectedItem.studentSection}`}
          </div>
        </div>
      </div>

      {/* Triage Navigation & Close */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-1 mr-2 text-label-sm font-bold text-ink-muted bg-surface px-2.5 py-1 rounded-md border border-edge">
          <span>{selectedIndex + 1}</span>
          <span>of</span>
          <span>{totalCount}</span>
        </div>
        <button
          onClick={onSelectPrevious}
          disabled={selectedIndex <= 0}
          className="btn btn-ghost p-2"
          aria-label="Previous submission"
          title="Previous (Left Arrow)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onSelectNext}
          disabled={selectedIndex >= totalCount - 1}
          className="btn btn-ghost p-2"
          aria-label="Next submission"
          title="Next (Right Arrow)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          className="btn btn-ghost p-2 text-ink-muted hover:text-ink ml-1"
          aria-label="Close review"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
