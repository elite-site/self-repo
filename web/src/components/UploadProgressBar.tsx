import React from 'react';
import { CheckCircle2, Loader2, Music } from 'lucide-react';

export interface UploadFileProgressItem {
  label: string;
  size: number;
}

export interface UploadProgressBarProps {
  progress?: number;
  totalSizeText?: string;
  files?: UploadFileProgressItem[];
  loadedBytes?: number;
  totalBytes?: number;
}

export const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  progress = 0,
  totalSizeText = '',
  files = [],
  loadedBytes = 0,
  totalBytes = 0,
}) => {
  const effectiveTotal = totalBytes || (files.length ? files.reduce((acc, f) => acc + f.size, 0) : 0);
  const effectiveLoaded = Math.min(effectiveTotal, Math.max(0, loadedBytes || Math.round((progress / 100) * effectiveTotal)));

  const overallPercent = effectiveTotal > 0
    ? Math.min(100, Math.round((effectiveLoaded * 100) / effectiveTotal))
    : Math.min(100, Math.round(progress));

  const isComplete = overallPercent >= 100;

  // Calculate per-file progress bounds
  let accumulatedBytes = 0;
  const fileItems = files.map((file) => {
    const startBytes = accumulatedBytes;
    const endBytes = accumulatedBytes + file.size;
    accumulatedBytes = endBytes;

    const fileLoaded = Math.max(0, Math.min(file.size, effectiveLoaded - startBytes));
    const filePercent = file.size > 0 ? Math.min(100, Math.round((fileLoaded * 100) / file.size)) : 100;
    const isDone = fileLoaded >= file.size;

    const fileLoadedMB = (fileLoaded / (1024 * 1024)).toFixed(1);
    const fileTotalMB = (file.size / (1024 * 1024)).toFixed(1);

    return {
      ...file,
      fileLoaded,
      filePercent,
      isDone,
      fileLoadedMB,
      fileTotalMB,
    };
  });

  const formattedLoaded = (effectiveLoaded / (1024 * 1024)).toFixed(1);
  const formattedTotal = effectiveTotal > 0
    ? (effectiveTotal / (1024 * 1024)).toFixed(1)
    : totalSizeText;

  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-neutral-200/90 rounded-3xl p-6 sm:p-8 text-left space-y-6 shadow-sm">
      {/* HEADER STATUS */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-elite-red flex items-center justify-center shrink-0 border border-red-100">
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-bounce" />
            ) : (
              <Loader2 className="w-5 h-5 text-elite-red animate-spin" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-elite-black uppercase font-display tracking-wide">
              {isComplete ? 'Server Processing...' : 'Uploading Introduction'}
            </h3>
            <p className="text-xs text-neutral-500 font-sans mt-0.5">
              {isComplete ? 'Transferring introduction file to Google Drive' : 'Submitting media safely'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-mono font-extrabold text-elite-red">
            {overallPercent}%
          </div>
          <div className="text-[10px] text-neutral-400 font-mono">OVERALL</div>
        </div>
      </div>

      {/* INDIVIDUAL FILES BREAKDOWN LIST */}
      {fileItems.length > 0 ? (
        <div className="space-y-4">
          {fileItems.map((item, idx) => (
            <div key={idx} className="space-y-1.5 p-3 rounded-2xl bg-neutral-50/80 border border-neutral-100">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-neutral-900">{item.label}</span>
                  {item.isDone && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                      ✓ Done
                    </span>
                  )}
                </div>

                <div className="font-mono text-[11px] text-neutral-600">
                  <span>{item.fileLoadedMB} / {item.fileTotalMB} MB</span>
                  <span className="ml-2 font-bold text-elite-red">{item.filePercent}%</span>
                </div>
              </div>

              {/* Progress Bar for this file */}
              <div className="w-full h-2 bg-neutral-200/80 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    item.isDone ? 'bg-emerald-500' : 'bg-elite-red'
                  }`}
                  style={{ width: `${Math.max(item.filePercent > 0 ? 3 : 0, item.filePercent)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* SINGLE FILE AUDIO/VIDEO PROGRESS SUMMARY */
        <div className="space-y-2 p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-elite-red" />
              <span>Introduction Clip</span>
            </div>
            <span className="font-mono text-xs text-neutral-700">
              {formattedLoaded} / {formattedTotal} MB
            </span>
          </div>

          <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-elite-red transition-all duration-200"
              style={{ width: `${Math.max(3, overallPercent)}%` }}
            />
          </div>
        </div>
      )}

      {/* OVERALL PROGRESS FOOTER */}
      <div className="pt-2 border-t border-neutral-100 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-neutral-700 font-mono">
          <span>Overall Progress</span>
          <span>
            {formattedLoaded} / {formattedTotal} MB ({overallPercent}%)
          </span>
        </div>

        <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200">
          <div
            className="h-full bg-elite-red rounded-full transition-all duration-200 ease-out"
            style={{ width: `${Math.max(overallPercent > 0 ? 2 : 0, overallPercent)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
