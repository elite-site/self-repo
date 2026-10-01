import React from 'react';

interface BrandedLoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export const BrandedLoading: React.FC<BrandedLoadingProps> = ({
  message = 'Loading ELITE Portal',
  fullScreen = true,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-6 select-none">
      {/* Centered logo with a soft pulse ring behind it */}
      <div className="relative flex items-center justify-center">
        {/* Soft pulse rings using brand color */}
        <div className="absolute w-28 h-28 rounded-full bg-brand/10 animate-ping [animation-duration:2.8s]" />
        <div className="absolute w-20 h-20 rounded-full bg-brand/15 animate-pulse" />

        {/* Centered logo card */}
        <div className="relative w-16 h-16 rounded-xl surface flex items-center justify-center p-3 z-10">
          <picture className="flex items-center justify-center">
            <source srcSet="/admin/elite-logo.webp" type="image/webp" />
            <img
              src="/admin/elite-logo.png"
              alt="ELITE"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                // If /admin/elite-logo.png isn't available, try root /elite-logo.png
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/elite-logo.png')) {
                  target.src = '/elite-logo.png';
                } else {
                  target.style.display = 'none';
                }
              }}
            />
          </picture>
        </div>
      </div>

      {/* Slim indeterminate progress bar in brand color underneath */}
      <div className="w-48 flex flex-col items-center gap-2.5">
        <div className="w-full h-1 bg-brand-soft rounded-full overflow-hidden relative">
          <div className="absolute top-0 bottom-0 left-0 bg-brand rounded-full animate-indeterminate" />
        </div>

        {/* Small uppercase "Loading ELITE Portal" label in the heading font */}
        <span className="font-heading text-[11px] font-bold uppercase tracking-widest text-ink-secondary">
          {message}
        </span>
      </div>
    </div>
  );

  if (!fullScreen) {
    return (
      <div className="w-full py-16 flex items-center justify-center bg-surface-canvas">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 min-h-[100dvh] bg-surface-canvas flex items-center justify-center z-modal">
      {content}
    </div>
  );
};

export default BrandedLoading;
