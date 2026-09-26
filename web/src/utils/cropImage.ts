import type { Area } from 'react-easy-crop';

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
  pixelCrop: Area,
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
