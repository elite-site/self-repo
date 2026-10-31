import React from 'react';
import {
  Code2,
  Pencil,
  Save,
  X,
  Check,
  Loader2,
  Sparkles,
  Info,
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { GithubSkillItem } from '../types';

export interface GithubSkillsSectionProps {
  skills: GithubSkillItem[];
  selectedSkillIds: string[];
  editingSkills: boolean;
  savingSkills: boolean;
  isSkillsDirty: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveSkills: () => void;
  onToggleSkill: (skillId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export const GithubSkillsSection: React.FC<GithubSkillsSectionProps> = ({
  skills,
  selectedSkillIds,
  editingSkills,
  savingSkills,
  isSkillsDirty,
  onStartEdit,
  onCancelEdit,
  onSaveSkills,
  onToggleSkill,
  onSelectAll,
  onClearAll,
}) => {
  const selectedSet = new Set(selectedSkillIds);
  const showcasedCount = editingSkills
    ? selectedSkillIds.length
    : skills.filter((s) => s.isShowcased !== false && selectedSet.has(s.skillId || s.id)).length ||
      (selectedSkillIds.length > 0
        ? selectedSkillIds.length
        : skills.filter((s) => s.isShowcased !== false).length);

  return (
    <Card className="p-6 sm:p-8 border border-edge bg-surface shadow-card space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading text-headline-sm font-bold text-ink">
              Extracted Skills ({showcasedCount}/{skills.length} showcased)
            </h2>
            {skills.length > 0 && (
              <Badge
                label={`${skills.length} detected`}
                variant="neutral"
                dot={false}
              />
            )}
          </div>
          <p className="text-body-sm text-ink-secondary mt-1">
            Languages and tools extracted from your GitHub repositories. Choose which skills you want to showcase on your profile.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {!editingSkills ? (
            <button
              type="button"
              onClick={onStartEdit}
              disabled={skills.length === 0}
              className="btn btn-secondary inline-flex items-center gap-2 min-h-[44px] px-4"
              aria-label="Edit showcase skills"
            >
              <Pencil size={15} />
              <span>Edit Skills</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={savingSkills}
                className="btn btn-ghost inline-flex items-center gap-1.5 min-h-[44px] px-3 text-ink-secondary hover:text-ink"
                aria-label="Cancel editing showcase skills"
              >
                <X size={16} />
                <span>Cancel</span>
              </button>

              <button
                type="button"
                onClick={onSaveSkills}
                disabled={savingSkills || !isSkillsDirty}
                className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] px-4"
                aria-label="Save showcase skills"
              >
                {savingSkills ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                <span>Save Skills</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Mode Instruction Banner */}
      {editingSkills && (
        <div className="rounded-xl border border-brand/30 bg-brand-soft/40 p-4 space-y-3">
          <div className="flex items-start gap-2.5 text-body-sm text-brand">
            <Info size={18} className="shrink-0 mt-0.5" />
            <span>
              Click on any skill to toggle whether it is showcased on your profile. For example, if you are strong in Java, select Java to highlight it prominently to recruiters and visitors.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-brand/20">
            <span className="text-label-xs text-ink-secondary font-medium">Quick actions:</span>
            <button
              type="button"
              onClick={onSelectAll}
              disabled={savingSkills || selectedSkillIds.length === skills.length}
              className="text-label-xs font-semibold text-brand hover:underline min-h-[32px] px-2 py-1 rounded"
            >
              Select All ({skills.length})
            </button>
            <span className="text-ink-muted">•</span>
            <button
              type="button"
              onClick={onClearAll}
              disabled={savingSkills || selectedSkillIds.length === 0}
              className="text-label-xs font-semibold text-ink-secondary hover:text-ink hover:underline min-h-[32px] px-2 py-1 rounded"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Skills Grid / Empty State */}
      {skills.length === 0 ? (
        <div className="surface text-center py-10 px-4 rounded-xl border border-edge space-y-3">
          <Code2 className="w-10 h-10 text-ink-muted mx-auto" />
          <div className="space-y-1">
            <p className="font-heading text-label-lg font-bold text-ink">No skills detected yet</p>
            <p className="text-body-sm text-ink-secondary max-w-md mx-auto">
              Sync your GitHub account to automatically extract languages and technologies from your active repositories.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {skills.map((skill) => {
            const skillIdentifier = skill.skillId || skill.id;
            const isSelected = selectedSet.has(skillIdentifier);
            const isShowcased = editingSkills ? isSelected : (isSelected || (selectedSkillIds.length === 0 && skill.isShowcased !== false));

            if (editingSkills) {
              return (
                <button
                  key={skill.id}
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  onClick={() => onToggleSkill(skillIdentifier)}
                  disabled={savingSkills}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all text-left min-h-[52px] ${
                    isSelected
                      ? 'border-brand bg-brand-soft/30 text-ink ring-1 ring-brand'
                      : 'border-edge bg-surface-sunken text-ink-secondary hover:border-edge-strong hover:bg-surface'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-label-md truncate text-ink">
                        {skill.name}
                      </span>
                    </div>
                    <span className="text-label-xs text-ink-muted">
                      {skill.repoCount} {skill.repoCount === 1 ? 'repo' : 'repos'}
                    </span>
                  </div>

                  <div
                    className={`size-6 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                      isSelected
                        ? 'bg-brand border-brand text-on-brand'
                        : 'border-edge-strong bg-surface text-transparent'
                    }`}
                  >
                    <Check size={14} strokeWidth={2.5} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                  </div>
                </button>
              );
            }

            return (
              <div
                key={skill.id}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors min-h-[52px] ${
                  isShowcased
                    ? 'border-brand/40 bg-surface shadow-xs'
                    : 'border-edge/60 bg-surface-sunken/50 opacity-70'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-label-md truncate text-ink">
                      {skill.name}
                    </span>
                    {isShowcased && (
                      <Sparkles size={13} className="text-brand shrink-0" aria-label="Showcased skill" />
                    )}
                  </div>
                  <span className="text-label-xs text-ink-muted">
                    {skill.repoCount} {skill.repoCount === 1 ? 'repo' : 'repos'}
                  </span>
                </div>

                <div>
                  {isShowcased ? (
                    <Badge label="Showcased" variant="brand" dot={false} />
                  ) : (
                    <Badge label="Hidden" variant="neutral" dot={false} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default GithubSkillsSection;
