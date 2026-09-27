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
        {/* Soft pulse rings */}
        <div className="absolute w-28 h-28 rounded-full bg-[#4F46E5]/10 animate-ping [animation-duration:2.8s]" />
        <div className="absolute w-20 h-20 rounded-full bg-[#4F46E5]/15 animate-pulse" />

        {/* Centered logo card */}
        <div className="relative w-16 h-16 rounded-xl bg-white border border-[#E4E7F2] shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex items-center justify-center p-3 z-10">
          <picture className="flex items-center justify-center">
            <source srcSet="/elite-logo.webp" type="image/webp" />
            <img
              src="/elite-logo.png"
              alt="ELITE"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </picture>
        </div>
      </div>

      {/* Slim indeterminate progress bar in primary indigo underneath */}
      <div className="w-48 flex flex-col items-center gap-2.5">
        <div className="w-full h-1 bg-[#E0E7FF] rounded-full overflow-hidden relative">
          <div className="absolute top-0 bottom-0 left-0 bg-[#4F46E5] rounded-full animate-indeterminate" />
        </div>

        {/* Small uppercase "Loading ELITE Portal" label in the heading font */}
        <span className="font-heading text-[11px] font-bold uppercase tracking-widest text-[#475569]">
          {message}
        </span>
      </div>
    </div>
  );

  if (!fullScreen) {
    return (
      <div className="w-full py-16 flex items-center justify-center bg-[#F7F8FC]">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 min-h-screen bg-[#F7F8FC] flex items-center justify-center z-50">
      {content}
    </div>
  );
};

export default BrandedLoading;
