// Anthropic's vision API caps each image at 5 MB (decoded) and downscales
// anything larger than ~1568px on the long edge anyway. We re-encode every
// upload to a JPEG that fits comfortably under both limits, which also gives
// the request a deterministic media type regardless of the source format.

const MAX_EDGE = 1568;
const MAX_BYTES = 4_500_000;
const QUALITY_STEPS = [0.85, 0.7, 0.55, 0.4];
const MAX_SHRINK_ATTEMPTS = 4;

export interface PreparedImage {
  base64: string;
  mediaType: 'image/jpeg';
  width: number;
  height: number;
}

export function approxBytesFromBase64(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

export function initialScale(width: number, height: number): number {
  const longest = Math.max(width, height);
  return longest > MAX_EDGE ? MAX_EDGE / longest : 1;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the image'));
    };
    img.src = url;
  });
}

function encodeUnderCeiling(
  img: HTMLImageElement,
  width: number,
  height: number
): PreparedImage | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx == null) throw new Error('Canvas is not supported in this browser');
  ctx.drawImage(img, 0, 0, width, height);

  for (const quality of QUALITY_STEPS) {
    const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1] ?? '';
    if (approxBytesFromBase64(base64) <= MAX_BYTES) {
      return { base64, mediaType: 'image/jpeg', width, height };
    }
  }
  return null;
}

export async function prepareImageForVision(file: File): Promise<PreparedImage> {
  const img = await loadImage(file);
  let scale = initialScale(img.naturalWidth, img.naturalHeight);

  for (let attempt = 0; attempt < MAX_SHRINK_ATTEMPTS; attempt++) {
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const result = encodeUnderCeiling(img, width, height);
    if (result != null) return result;
    scale *= 0.75;
  }

  throw new Error(
    'Could not shrink this image enough. Try a smaller or lower-resolution photo.'
  );
}
