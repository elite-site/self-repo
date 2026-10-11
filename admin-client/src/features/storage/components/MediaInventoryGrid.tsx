import React from 'react';
import { Layers, FileVideo, FileText, Award, Image as ImageIcon } from 'lucide-react';
import { StorageStatsResponse } from '../types';

interface MediaInventoryGridProps {
  inventory: StorageStatsResponse['inventory'];
}

export const MediaInventoryGrid: React.FC<MediaInventoryGridProps> = ({ inventory }) => {
  return (
    <div>
      <h2 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
        <Layers className="w-4 h-4 text-ink-brand" />
        Indexed Cloud Media Inventory
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Submission Videos */}
        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-status-bg-rejected text-status-rejected flex items-center justify-center mb-3">
            <FileVideo className="w-4 h-4" />
          </div>
          <div className="text-2xl font-semibold text-ink">
            {inventory.submissionVideos}
          </div>
          <div className="text-xs font-medium text-ink-muted mt-0.5">
            Intro Videos
          </div>
        </div>

        {/* Student Profile Intro Videos */}
        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-status-bg-review text-status-review flex items-center justify-center mb-3">
            <FileVideo className="w-4 h-4" />
          </div>
          <div className="text-2xl font-semibold text-ink">
            {inventory.introVideos}
          </div>
          <div className="text-xs font-medium text-ink-muted mt-0.5">
            Portfolio Videos
          </div>
        </div>

        {/* Resumes */}
        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-status-bg-approved text-status-approved flex items-center justify-center mb-3">
            <FileText className="w-4 h-4" />
          </div>
          <div className="text-2xl font-semibold text-ink">
            {inventory.resumes}
          </div>
          <div className="text-xs font-medium text-ink-muted mt-0.5">
            PDF Resumes
          </div>
        </div>

        {/* Certificates */}
        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-status-bg-approved text-status-approved flex items-center justify-center mb-3">
            <Award className="w-4 h-4" />
          </div>
          <div className="text-2xl font-semibold text-ink">
            {inventory.certificates}
          </div>
          <div className="text-xs font-medium text-ink-muted mt-0.5">
            Certificates
          </div>
        </div>

        {/* Achievement Proofs */}
        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-status-bg-pending text-status-pending flex items-center justify-center mb-3">
            <Award className="w-4 h-4" />
          </div>
          <div className="text-2xl font-semibold text-ink">
            {inventory.achievementProofs}
          </div>
          <div className="text-xs font-medium text-ink-muted mt-0.5">
            Award Evidence
          </div>
        </div>

        {/* Profile Photos */}
        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-brand-soft text-ink-brand flex items-center justify-center mb-3">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="text-2xl font-semibold text-ink">
            {inventory.profilePhotos}
          </div>
          <div className="text-xs font-medium text-ink-muted mt-0.5">
            Profile Photos
          </div>
        </div>
      </div>
    </div>
  );
};
