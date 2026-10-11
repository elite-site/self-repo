/**
 * The rectangle `getCroppedImg` cuts out, in the source image's own pixels.
 *
 * Declared here rather than imported: it is structurally identical to
 * `react-easy-crop`'s `Area` and to `react-image-crop`'s `PixelCrop`, so every
 * caller that already passed one of those still type-checks unchanged — but the
 * canvas helper is now free of either cropper library.
 */
export interface CropPixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * What the cropped canvas is filled with before the image is drawn.
 *
 * JPEG has no alpha channel, so any pixel the source photo leaves transparent
 * would otherwise be encoded from black and leave dark fringes around a face
 * crop. `--on-primary` is the design system's theme-invariant "text/fill on a
 * solid colour" token and resolves to white in both themes; the literal below is
 * only the fallback for a DOM where the token stylesheet is not present, and is
 * deliberately the same white so the exported bytes never change.
 */
function canvasBackground(): string {
  if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') return 'white';
  const token = getComputedStyle(document.documentElement)
    .getPropertyValue('--on-primary')
    .trim();
  return token || 'white';
}

/**
 * Loads an image from a URL or ObjectURL into an HTMLImageElement.
 * Configures crossOrigin="anonymous" to prevent canvas tainting.
 * If crossOrigin loading fails (e.g. strict CORS or caching issues),
 * it attempts a fetch-to-blob fallback before rejecting.
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => {
      // Fallback: fetch directly as a Blob to generate a same-origin object URL
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const fallbackImage = new Image();
          fallbackImage.onload = () => {
            // Keep blob URL active for canvas usage
            resolve(fallbackImage);
          };
          fallbackImage.onerror = () => reject(new Error('Failed to load image into canvas'));
          fallbackImage.src = blobUrl;
        })
        .catch(() => reject(new Error('Failed to load image for cropping')));
    };
    image.src = url;
  });

/**
 * Renders the specified croppedAreaPixels from an image to an off-screen HTML5 canvas
 * and exports the result as a Blob (defaults to image/jpeg, quality 0.92).
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropPixelArea,
  outputType: string = 'image/jpeg',
  quality: number = 0.92
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }

  const targetWidth = Math.max(1, Math.round(pixelCrop.width));
  const targetHeight = Math.max(1, Math.round(pixelCrop.height));

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.imageSmoothingQuality = 'high';
  ctx.imageSmoothingEnabled = true;

  // Fill canvas background with clean white to avoid dark edges on JPEG compression
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the selected crop area from the source image onto the canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas export to blob failed'));
          return;
        }
        resolve(blob);
      },
      outputType,
      quality
    );
  });
}

/**
 * Compresses any image File/Blob into a lightweight WebP format.
 * Resizes down to maxDimension (default: 1000px) and quality 0.85,
 * reducing typical smartphone camera photos (5-15MB) to crisp ~25-45KB WebP images.
 */
export async function compressImageToWebP(
  file: File | Blob,
  maxDimension = 1000,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/webp',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
