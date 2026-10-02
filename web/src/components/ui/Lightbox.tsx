import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Modal } from './Modal';

export interface LightboxImage {
  src: string;
  /** Required — §3.4, and a certificate with no alt text tells a screen-reader user nothing. */
  alt: string;
}

export interface LightboxProps {
  open: boolean;
  onClose: () => void;
  images: LightboxImage[];
  /** Zero-based index of the image on screen. Controlled, like `Modal`. */
  index: number;
  onIndexChange: (index: number) => void;
  /** Accessible name for the dialog. */
  title?: string;
  className?: string;
}

const DEFAULT_TITLE = 'Image viewer';

/**
 * A full-size image viewer for certificates and gallery images — §6.7's
 * "in-page lightbox viewing", which replaced opening the file in a new tab and
 * losing the student's place.
 *
 * It is a `Modal`, not a parallel implementation of one: Escape, the focus
 * trap, the blurred scrim, the body scroll lock and the mobile bottom sheet
 * are all the same code path every other dialog takes. Only the image, the
 * counter and the two arrows are specific to it.
 */
export const Lightbox: React.FC<LightboxProps> = ({
  open,
  onClose,
  images,
  index,
  onIndexChange,
  title = DEFAULT_TITLE,
  className,
}) => {
  const count = images.length;

  /**
   * Bound on the document because the arrow keys can land anywhere inside the
   * dialog — the close button, an arrow, the body — and no single element owns
   * them. Contained to the open window; Escape is Radix's and stays Radix's.
   */
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        onIndexChange(index - 1);
      } else if (event.key === 'ArrowRight' && index < count - 1) {
        event.preventDefault();
        onIndexChange(index + 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, index, count, onIndexChange]);

  if (count === 0) return null;

  const image = images[index];
  const hasPrevious = index > 0;
  const hasNext = index < count - 1;

  const navButtonClass = cn(
    'flex size-11 shrink-0 items-center justify-center rounded-lg',
    'border border-edge bg-surface text-ink-secondary',
    'transition-colors duration-quick ease-gentle',
    'hover:bg-surface-sunken hover:text-ink',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    'disabled:cursor-not-allowed disabled:opacity-50',
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="full"
      className={className}
      footer={
        count > 1 ? (
          <div className="flex w-full items-center justify-center gap-4">
            <button
              type="button"
              aria-label="Previous image"
              disabled={!hasPrevious}
              onClick={() => onIndexChange(index - 1)}
              className={navButtonClass}
            >
              <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <span aria-live="polite" className="font-ui text-body-sm text-ink-secondary">
              {index + 1} / {count}
            </span>
            <button
              type="button"
              aria-label="Next image"
              disabled={!hasNext}
              onClick={() => onIndexChange(index + 1)}
              className={navButtonClass}
            >
              <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        ) : undefined
      }
    >
      {/* `h-full` so `max-h-full` on the image has a definite height to
          resolve against whenever the panel is capped, and falls back to the
          image's own size — and a scroll — when it is not. */}
      <div className="flex h-full items-center justify-center">
        {image && (
          <img
            src={image.src}
            alt={image.alt}
            className="mx-auto block h-auto max-h-full w-auto max-w-full object-contain"
          />
        )}
      </div>
    </Modal>
  );
};

export default Lightbox;
