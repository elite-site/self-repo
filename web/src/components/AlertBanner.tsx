import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface AlertBannerProps {
  type: 'error' | 'success' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ type, title, message, onClose }) => {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-900 icon-text-red',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900 icon-text-emerald',
    info: 'bg-blue-50 border-blue-200 text-blue-900 icon-text-blue',
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border ${styles[type]} flex items-start justify-between gap-4 text-left`}>
      <div className="flex items-start gap-3">
        {type === 'error' && <AlertCircle className="w-5 h-5 text-elite-red shrink-0 mt-0.5" />}
        {type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
        {type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
        <div className="space-y-0.5">
          {title && <h4 className="text-xs font-extrabold uppercase tracking-wider font-display">{title}</h4>}
          <p className="text-xs font-medium leading-relaxed">{message}</p>
        </div>
      </div>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer shrink-0">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
