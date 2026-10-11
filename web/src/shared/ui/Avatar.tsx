import React from 'react';
import { cn } from '../../lib/cn';

/**
 * A person's picture, their initials, or a presence dot. REDESIGN_PLAN §4.8
 * "Avatar Component".
 *
 * The initials fallback is not a nice-to-have here: profile photos are optional
 * in the roster, and a card full of grey silhouettes reads as "no data" rather
 * than "no photo". Initials on the brand fill keeps the layout identical
 * whether or not an image exists, so nothing reflows when one loads.
 */

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

export interface AvatarProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Used for the initials and, when there is no image, the accessible name. */
  name?: string;
  src?: string;
  /** Overrides `name` as the accessible name. */
  alt?: string;
  /** Defaults to `md`. */
  size?: AvatarSize;
  /** Shows the presence dot. The dot is decorative — the name is the meaning. */
  online?: boolean;
}

/**
 * §4.8 dimension column. Every step is an exact Tailwind default, so nothing
 * here is an arbitrary value.
 *
 * `xs` uses `text-xs` (12px) rather than the plan's `text-xs`: there is no
 * 10px type token, and §3.6 makes tokens mandatory, so the nearest real step
 * wins. At a 24px box a two-letter initial still fits.
 */
const SIZE: Record<AvatarSize, { box: string; text: string }> = {
  xs: { box: 'size-6', text: 'text-xs' },
  sm: { box: 'size-8', text: 'text-xs' },
  md: { box: 'size-10', text: 'text-sm' },
  lg: { box: 'size-12', text: 'text-base' },
  xl: { box: 'size-16', text: 'text-lg' },
  '2xl': { box: 'size-24', text: 'text-2xl' },
  '3xl': { box: 'size-32', text: 'text-3xl' },
};

/** First letter of the first and last name, at most two. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  name = '',
  src,
  alt,
  size = 'md',
  online = false,
  className,
  ...rest
}) => {
  // A URL that 404s is the same situation as no URL as far as this component is
  // concerned, so it falls through to the initials rather than the broken-image
  // glyph. The failed URL is remembered rather than a boolean, so a caller that
  // swaps `src` — a signed Drive URL that has expired, say — gets its image back.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const showsImage = Boolean(src) && failedSrc !== src;

  const accessibleName = alt ?? name;

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full font-ui font-semibold',
        SIZE[size].box,
        !showsImage && 'bg-brand text-on-brand',
        SIZE[size].text,
        className,
      )}
      {...(accessibleName ? { role: 'img', 'aria-label': accessibleName } : {})}
      {...rest}
    >
      {showsImage ? (
        // Named by the wrapper, so the image itself stays out of the a11y tree.
        <img
          src={src}
          alt=""
          aria-hidden="true"
          onError={() => setFailedSrc(src ?? null)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true" className="flex size-full items-center justify-center">
          {initialsOf(name)}
        </span>
      )}

      {online && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-surface bg-success"
        />
      )}
    </span>
  );
};

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Every avatar in the stack, in order. */
  children: React.ReactNode;
}

/**
 * An overlapping stack for team rosters. §4.8 "Group Avatar": each avatar
 * overlaps the previous by 8px (`-ml-2`, the plan's `ml-[-8px]`), and a
 * surface-coloured ring is what keeps the overlap from reading as a smudge.
 */
export const AvatarGroup: React.FC<AvatarGroupProps> = ({ children, className, ...rest }) => (
  <div className={cn('flex items-center', className)} {...rest}>
    {React.Children.map(children, (child) => (
      <span className="-ml-2 rounded-full ring-2 ring-surface first:ml-0">{child}</span>
    ))}
  </div>
);

export default Avatar;