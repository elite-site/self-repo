import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Skeleton, SkeletonText } from '@/shared/ui/Skeleton';

export const PublicProfileSkeleton: React.FC = () => {
  return (
    <div className="min-h-[100dvh] bg-[#070B16] text-slate-100 flex flex-col antialiased overflow-x-clip">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(225,29,72,0.14),rgba(255,255,255,0))]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_80%_100%,rgba(59,130,246,0.08),rgba(0,0,0,0))]" />

      <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#070B16]/80 border-b border-slate-800/80">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/students"
              className="group inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors py-2 px-2.5 rounded-lg hover:bg-slate-800/60"
              title="Return to Student Directory"
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">Directory</span>
            </Link>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-2.5 min-h-[44px]">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 w-28 rounded hidden md:inline-block" />
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1 rounded-full border border-slate-800/80 bg-slate-900/60 p-1 backdrop-blur-md">
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-lg hidden sm:block" />
            <Skeleton className="h-9 w-20 rounded-lg hidden sm:block" />
            <Skeleton className="h-9 w-9 rounded-lg lg:hidden" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-[1200px] w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-12 lg:pt-14 space-y-14 sm:space-y-20 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          <div className="lg:col-span-5 space-y-4">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-12 w-64 max-w-full rounded-lg" />
            <Skeleton className="h-5 w-48" />
            <SkeletonText lines={3} />
          </div>
          <div className="lg:col-span-4 flex justify-center">
            <Skeleton className="size-44 rounded-full" />
          </div>
          <div className="lg:col-span-3">
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </main>
    </div>
  );
};
