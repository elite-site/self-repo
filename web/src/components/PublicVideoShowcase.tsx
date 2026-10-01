import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveMediaUrl } from '../services/api';
import { usePublicVideos, PublicVideosState } from '../hooks/usePublicVideos';
import { Users, EyeOff } from 'lucide-react';

interface Props extends Partial<PublicVideosState> {
  /** Optional heading override for reuse on other public pages. */
  title?: string;
  subtitle?: string;
}

/**
 * Public showcase of student introduction videos.
 *
 * Only videos that were approved by faculty AND published (by the student or
 * an admin) are returned by the API, so this component renders an empty state
 * until the very first video is approved. Nothing  unapproved is ever exposed.
 *
 * Only one video plays at a time: playing a card pauses every other player so
 * the page never streams several videos at once.
 *
 * `videos` / `loading` / `failed` let a parent that already fetched the list
 * hand it down, so a hero and this showcase on the same page share one request.
 * Omit them and the component fetches for itself.
 */
export const PublicVideoShowcase: React.FC<Props> = ({
  title = 'Student Introduction Videos',
  subtitle = 'Watch how our students introduce themselves. Only faculty-approved recordings appear here.',
  videos: preloadedVideos,
  loading: preloadedLoading,
  failed: preloadedFailed,
}) => {
  const preloaded  =
    preloadedVideos ||
   preloadedLoading !== undefined ||
   preloadedFailed !== undefined
      ? {
          videos:
   preloadedVideos ?? [],
          loading: preloadedLoading ?? false,
          failed:
   preloadedFailed ?? false,
        }
      : undefined;

  const  {
     videos, loading, failed

       } =
         usePublicVideos(preloaded);
  const [activeId,

       setActiveId] =
         useState<string |

       null>(null);
  const playerRefs
         = useRef<Record<string,

     HTMLVideoElement | null>>({});

  /** One video at a time:  pause every other player when a new one starts. */
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

          <h2 id="public-videos-title" className="text-2xl sm:text-3xl font-extrabold text-ink font-heading tracking-tight">
            {title}
          </h2>
          <p className="text-sm text-ink-secondary mt-2 max-w-[60ch] leading-relaxed">{subtitle}</p>
        </div>

        {videos.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-ink-muted shrink-0">
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {videos.length} published {videos.length === 1 ? 'video' : 'videos'}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        /* Skeleton matching the final card shape, not a spinner. */
        <div aria-hidden="true" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-edge bg-surface
 overflow-hidden">
              <div className="aspect-video skeleton" />
              <div className="p-4 space-y-2">
                <div className="h-3.5 w-2/3 rounded skeleton" />
                <div className="h-3 w-1/2 rounded skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : failed ? (
        <div className="py-12 px-6 surface border border-edge rounded-lg text-center">
          <p className="text-sm text-ink-secondary">
            Videos are unavailable right now. Please try again later.
          </p>
        </div>
      ) : videos.length === 0 ? (
        <div className="py-12 px-6 surface border border-edge rounded-lg text-left sm:text-center max-w-xl mx-auto space-y-2">
          <div className="w-11 h-11 rounded-lg bg-surface-sunken text-ink-muted flex items-center justify-center sm:mx-auto">
            <EyeOff className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-bold text-ink">No published videos yet</h3>
          <p className="text-sm text-ink-secondary leading-relaxed">
            A student's introduction video appears here only after it is approved and published.

          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((video) => (
            <article
              key={video.id}
              className="surface overflow-hidden shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="relative bg-surface-inverse aspect-video">
                <video
                  ref={(el) => {
                    playerRefs.current[video.id] = el;
                  }}
                  src={resolveMediaUrl(video.streamUrl)}
                  poster={video.thumbnailUrl ? resolveMediaUrl(video.thumbnailUrl) : undefined}
                  controls
                  preload="none"
                  playsInline
                  onPlay={() => handlePlay(video.id)}
                  onPause={() => setActiveId((cur) => (cur === video.id ? null : cur))}
                  className="w-full h-full object-contain"
                >
                  Your browser does not support video playback.
                </video>
              </div>

              <div className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-ink truncate">{video.name}</h3>
                  <p className="text-xs text-ink-muted truncate">
                    {video.rollNo} · Year {video.year} · Section {video.section}
                  </p>
                </div>

                <Link
                  to={video.profileUrl}
                  className="shrink-0 text-xs font-bold text-brand hover:text-brand-hover whitespace-nowrap"
                >
                  View profile
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
