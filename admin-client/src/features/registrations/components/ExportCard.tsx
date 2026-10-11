import React from 'react';
import { Download, FileSpreadsheet, CheckCircle2, LucideIcon } from 'lucide-react';

export interface DatasetItem {
  id: string;
  title: string;
  category: string;
  icon: LucideIcon;
  color: string;
  description: string;
  fields: string[];
  getUrl: () => string;
  filename: string;
}

export interface ExportCardProps {
  dataset: DatasetItem;
  isDownloading: boolean;
  onDownload: (id: string, url: string, filename: string) => void;
}

export const ExportCard: React.FC<ExportCardProps> = ({
  dataset,
  isDownloading,
  onDownload,
}) => {
  const Icon = dataset.icon;

  return (
    <div className="bg-surface border border-edge rounded-xl p-6 shadow-sm hover:border-edge-strong transition-colors flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                dataset.color === 'blue'
                  ? 'bg-status-bg-approved text-status-approved'
                  : dataset.color === 'emerald'
                  ? 'bg-status-bg-approved text-status-approved'
                  : dataset.color === 'purple'
                  ? 'bg-status-bg-review text-status-review'
                  : 'bg-status-bg-rejected text-status-rejected'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-ink-muted">{dataset.category}</span>
              <h3 className="text-base font-bold text-ink leading-snug">{dataset.title}</h3>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-surface-sunken text-ink-secondary rounded">
            <FileSpreadsheet className="w-3 h-3 text-status-approved" />
            .XLSX
          </span>
        </div>

        <p className="text-xs text-ink-secondary mb-4 leading-relaxed">{dataset.description}</p>

        {/* Schema preview tags */}
        <div className="mb-6">
          <span className="text-xs font-medium text-ink-muted block mb-1.5">
            Schema attributes included:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {dataset.fields.map((field) => (
              <span
                key={field}
                className="text-xs font-medium px-2 py-0.5 bg-surface-sunken text-ink-secondary rounded border border-edge/60"
              >
                {field}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-4 border-t border-edge flex items-center justify-between">
        <span className="text-xs text-ink-muted flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-status-approved" />
          Ready to stream
        </span>
        <button
          onClick={() => onDownload(dataset.id, dataset.getUrl(), dataset.filename)}
          disabled={isDownloading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface-inverse text-ink-inverse text-xs font-bold rounded-lg hover:opacity-90 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
          {isDownloading ? 'Generating workbook…' : 'Download'}
        </button>
      </div>
    </div>
  );
};
