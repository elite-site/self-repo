import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, resolveMediaUrl } from '../services/api';
import { PublicIntroVideo } from '../types';
import { Film, Loader2, Play, Users, EyeOff } from 'lucide-react';

interface PublicVideoShowcaseProps {
  /** Optional heading override for reuse on other public pages. */
  title?: string;
  subtitle?: string;
}

/**
 * Public showcase of student introduction videos.
 *
 * Only videos that were approved by faculty AND published (by the student or
 * an admin) are returned by the API, so this component renders an empty state
 * until the very first video is approved — nothing unapproved is ever exposed.
 *
 * Only one video plays at a time: playing a card pauses every other player so
 * the page never streams several videos at once.
 */
export const PublicVideoShowcase: React.FC<PublicVideoShowcaseProps> = ({
  title = 'Student Introduction Videos',
  subtitle = 'Watch how our students introduce themselves — approved recordings from the department.',
}) => {
  const [videos, setVideos] = useState<PublicIntroVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const playerRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    let cancelled = false;

    api
      .getPublicVideos()
      .then((res) => {
        if (cancelled) return;
        setVideos(res.items);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** One video at a time — pause every other player when a new one starts. */
  const handlePlay = (id: string) => {
    setActiveId(id);
    Object.entries(playerRefs.current).forEach(([key, player]) => {
      if (key !== id && player && !player.paused) player.pause();
    });
  };

  return (
    <section id="public-videos" aria-labelledby="public-videos-title" className="w-full py-12 sm:py-16">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 text-left">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-[10px] font-mono font-bold text-[#DC2626] tracking-wider uppercase mb-3">
            <Film className="w-3 h-3" />
            <span>Public Showcase</span>
          </div>
          <h2 id="public-videos-title" className="text-2xl sm:text-3xl font-extrabold text-[#0B192C] tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-neutral-500 mt-1.5 max-w-2xl leading-relaxed">{subtitle}</p>
        </div>

        {videos.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-500 shrink-0">
            <Users className="w-3.5 h-3.5" />
            <span>
              {videos.length} published {videos.length === 1 ? 'video' : 'videos'}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 bg-white border border-[#E2E8F0] rounded-2xl">
          <Loader2 className="w-6 h-6 animate-spin text-[#DC2626]" />
        </div>
      ) : failed ? (
        <div className="py-12 px-6 bg-white border border-[#E2E8F0] rounded-2xl text-center">
          <p className="text-xs text-neutral-500">Videos are unavailable right now. Please try again later.</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="py-14 px-6 bg-white border border-[#E2E8F0] rounded-2xl text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <EyeOff className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#0B192C]">No published videos yet</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
            A student's introduction video appears here only after it is approved and published.
            Nothing is shown before that.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((video) => (
            <article
              key={video.id}
              className="group bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="relative bg-black aspect-video">
                <video
                  ref={(el) => {
                    playerRefs.current[video.id] = el;
                  }}
                  src={resolveMediaUrl(video.streamUrl)}
                  controls
                  preload="none"
                  playsInline
                  onPlay={() => handlePlay(video.id)}
                  onPause={() => setActiveId((cur) => (cur === video.id ? null : cur))}
                  className="w-full h-full object-contain"
                >
                  Your browser does not support video playback.
                </video>

                {activeId !== video.id && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="w-14 h-14 rounded-full bg-black/55 backdrop-blur-sm border border-white/25 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#0B192C] truncate">{video.name}</h3>
                  <p className="text-[11px] font-mono text-neutral-500 truncate">
                    {video.rollNo} · Year {video.year} · Section {video.section}
                  </p>
                </div>

                <Link
                  to={video.profileUrl}
                  className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#DC2626] hover:text-[#B5121B] whitespace-nowrap"
                >
                  Profile
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
