import React, { useRef } from 'react';
import { FileText, UploadCloud, X, ExternalLink } from 'lucide-react';

export interface FileFieldProps {
  id?: string;
  label?: React.ReactNode;
  hint?: string;
  required?: boolean;
  accept?: string;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  existingFileUrl?: string | null;
  existingFileName?: string | null;
  onRemoveExisting?: () => void;
  disabled?: boolean;
  error?: string | null;
}

export const FileField: React.FC<FileFieldProps> = ({
  id = 'file-field',
  label,
  hint,
  required,
  accept,
  selectedFile,
  onFileSelect,
  existingFileUrl,
  existingFileName,
  onRemoveExisting,
  disabled = false,
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileSelect(file);
    e.target.value = '';
  };

  const handleRemove = () => {
    onFileSelect(null);
    if (onRemoveExisting) {
      onRemoveExisting();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasFile = Boolean(selectedFile || existingFileUrl);

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="label">
          {label} {required && <span className="text-status-rejected">*</span>}
        </label>
      )}

      <input
        id={id}
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
        aria-describedby={hint ? `${id}-hint` : undefined}
      />

      {!hasFile ? (
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="btn btn-secondary text-xs min-h-[38px]"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Choose file</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-lg border border-edge bg-surface-canvas text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-brand shrink-0" />
            <span className="font-semibold text-ink truncate max-w-[16rem]">
              {selectedFile ? selectedFile.name : (existingFileName || 'Attached document')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!selectedFile && existingFileUrl && (
              <a
                href={existingFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost px-2 py-1 text-xs inline-flex items-center gap-1 text-ink-brand hover:text-brand-hover"
              >
                <span>View file</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="btn btn-secondary px-2.5 py-1 text-xs"
            >
              Replace file
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="btn btn-ghost px-2 py-1 text-xs text-status-rejected hover:bg-status-bg-rejected hover:border-status-rejected"
            >
              <X className="w-3 h-3" />
              <span>Remove file</span>
            </button>
          </div>
        </div>
      )}

      {hint && (
        <p id={`${id}-hint`} className="hint text-xs">
          {hint}
        </p>
      )}

      {error && (
        <p className="error-text text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
