import React from 'react';
import { Inbox, Film, FileText, Award, FolderGit2, Trophy } from 'lucide-react';
import { TabType } from '../types';

export const TAB_CONFIG: Array<{ id: TabType; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'all', label: 'All Submissions', icon: Inbox },
  { id: 'videos', label: 'Intro Videos', icon: Film },
  { id: 'resumes', label: 'Resumes', icon: FileText },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'projects', label: 'Projects', icon: FolderGit2 },
  { id: 'github-projects', label: 'GitHub Projects', icon: FolderGit2 },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
];

interface ModerationFilterTabsProps {
  activeTab: TabType;
  counts: Record<TabType, number>;
  onTabChange: (tab: TabType) => void;
}

export const ModerationFilterTabs: React.FC<ModerationFilterTabsProps> = ({
  activeTab,
  counts,
  onTabChange,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-edge" role="tablist">
      {TAB_CONFIG.map((tab) => {
        const Icon = tab.icon;
        const count = counts[tab.id];
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={isActive}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-body-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
              isActive
                ? 'bg-brand text-ink-inverse shadow-xs'
                : 'text-ink-secondary hover:text-ink hover:bg-surface-sunken'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            <span
              className={`ml-1 text-xs px-1.5 py-0.2 rounded-full font-mono ${
                isActive ? 'bg-white/20 text-white' : 'bg-surface-sunken text-ink-muted border border-edge'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
