import React from 'react';
import { Video as VideoIcon } from 'lucide-react';
import { resolveMediaUrl } from '@/shared/api';
import { PublicIntroVideo } from '../types';

interface PublicProfileAboutProps {
  name: string;
  bio: string;
  specialQualities: string;
  introVideo: PublicIntroVideo | null;
}

export const PublicProfileAbout: React.FC<PublicProfileAboutProps> = ({
  name,
  bio,
  specialQualities,
  introVideo,
}) => {
  return (
    <section id="about" className="scroll-mt-24 pt-6">
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Overview</span>
        <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">About & Introduction</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: About Me & Features */}
        <div className="lg:col-span-6 space-y-6">
          {bio ? (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm space-y-3">
              <h3 className="font-heading text-base font-bold text-white">About Me</h3>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line">
                {bio}
              </p>
            </div>
          ) : null}

          {/* Special Qualities */}
          {specialQualities ? (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">Special Qualities</h4>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{specialQualities}</p>
            </div>
          ) : null}
        </div>

        {/* Right: Introduction Video Player */}
        <div className="lg:col-span-6 print:hidden">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <VideoIcon size={18} className="text-rose-400" />
                <h3 className="font-heading text-base font-bold text-white">Introduction Video</h3>
              </div>
              <span className="text-xs text-slate-400">Department Verified Recording</span>
            </div>

            {introVideo?.streamUrl ? (
              <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 aspect-[4/3] min-h-[240px] sm:aspect-video sm:min-h-0 shadow-md">
                {introVideo.driveFileId && !introVideo.driveFileId.startsWith('mock_') ? (
                  <iframe
                    src={`https://drive.google.com/file/d/${introVideo.driveFileId}/preview`}
                    allow="autoplay; fullscreen"
                    className="w-full h-full border-0 rounded-xl"
                    title={`${name}'s introduction video`}
                  />
                ) : (
                  <video
                    src={resolveMediaUrl(introVideo.streamUrl)}
                    poster={introVideo.thumbnailUrl ? resolveMediaUrl(introVideo.thumbnailUrl) : undefined}
                    controls
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    preload="metadata"
                    playsInline
                    aria-label={`${name}'s introduction video`}
                    className="w-full h-full object-contain"
                  >
                    Your browser does not support video playback.
                  </video>
                )}
              </div>
            ) : (
              <div className="py-12 px-4 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/60 space-y-2">
                <VideoIcon size={28} className="text-slate-600 mx-auto" />
                <h4 className="text-xs font-semibold text-slate-300">No introduction video published yet</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  A video preview appears here once faculty approve it.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
