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
    <div className="flex flex-col items-center justify-center gap-5 select-none" role="status" aria-live="polite">
      {/* Refined dual-ring circular spinner with centered circular logo badge */}
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Soft pulse glow ring */}
        <div className="absolute inset-0 rounded-full bg-brand/10 animate-pulse" />

        {/* Outer primary spinner ring */}
        <div className="absolute inset-0 rounded-full border-2 border-brand/20 border-t-brand animate-spin [animation-duration:1.1s]" />

        {/* Inner secondary counter-rotating subtle accent ring */}
        <div className="absolute inset-2 rounded-full border border-brand/15 border-b-brand/40 animate-spin [animation-duration:2.2s] [animation-direction:reverse]" />

        {/* Centered circular logo card */}
        <div className="relative w-12 h-12 rounded-full surface border border-edge shadow-xs flex items-center justify-center p-2 z-10">
          <picture className="flex items-center justify-center">
            <source srcSet="/elite-logo.webp" type="image/webp" />
            <img
              src="/elite-logo.png"
              alt="ELITE"
              className="w-7 h-7 object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </picture>
        </div>
      </div>

      {/* Uppercase message label */}
      <div className="flex flex-col items-center gap-1.5">
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
