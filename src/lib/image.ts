/**
 * Product photo handling.
 *
 * Photos live inside the costing model, which is persisted as JSON, so an
 * untouched 5 MB camera file would blow the browser's storage quota. Every
 * image is therefore downscaled to a sensible maximum edge and re-encoded as
 * JPEG before it enters the model.
 *
 * `calculateScaledDimensions` is pure and unit-tested; the rest needs a DOM.
 */

import type { ProductPhoto } from '../types/model';

export const MAX_IMAGE_EDGE = 1200;
export const IMAGE_QUALITY = 0.82;
/** Refuse anything larger than this before decoding (10 MB). */
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

/** Fits an image inside a square of `maxEdge` while keeping its aspect ratio. */
export function calculateScaledDimensions(
  width: number,
  height: number,
  maxEdge = MAX_IMAGE_EDGE,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width: Math.round(width), height: Math.round(height) };
  const ratio = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

/** Rough byte size of a data URL payload (base64 expands by 4/3). */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.round((base64.length * 3) / 4);
}

export class ImageError extends Error {}

/**
 * Reads a picked file, downscales it and returns a ProductPhoto ready to be
 * stored in the model. Throws an `ImageError` with a user-facing message.
 */
export async function readProductPhoto(file: File): Promise<ProductPhoto> {
  if (!file.type.startsWith('image/')) {
    throw new ImageError('That file is not an image. Use a JPG, PNG or WebP picture.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageError('That image is larger than 10 MB. Please pick a smaller picture.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const { width, height } = calculateScaledDimensions(image.naturalWidth, image.naturalHeight);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ImageError('This browser could not process the image.');
    // White backdrop so transparent PNGs do not turn black once JPEG-encoded.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
    return { dataUrl, name: file.name, width, height, bytes: dataUrlBytes(dataUrl) };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageError('That image could not be read. Try a different file.'));
    img.src = src;
  });
}

/** "184.2 KB" — used to reassure the user the stored photo is small. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
