// Chat and other multipart uploads gate on raw file size (10 MB per file). A
// phone photo attached on iOS arrives as a lossless PNG (Safari converts HEIC
// at pick time) that can be ~10 MB for a 12 MP image, tripping the gate even
// though the picture itself is small. Downscale + re-encode to JPEG before the
// gate so a normal photo attaches instead of being rejected. PDFs, GIFs
// (animation), and anything that fails to decode pass through untouched.

const MAX_EDGE = 1568;
const QUALITY = 0.85;

export function shouldCompressType(type: string): boolean {
  return type.startsWith('image/') && type !== 'image/gif';
}

export function compressedName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'image';
  return `${base}.jpg`;
}

export function scaledDimensions(
  width: number,
  height: number
): { width: number; height: number } {
  const longest = Math.max(width, height);
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
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

export async function compressImageForUpload(file: File): Promise<File> {
  if (!shouldCompressType(file.type)) return file;

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file;
  }

  const { width, height } = scaledDimensions(
    img.naturalWidth,
    img.naturalHeight
  );
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx == null) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY)
  );
  if (blob == null || blob.size >= file.size) return file;

  return new File([blob], compressedName(file.name), { type: 'image/jpeg' });
}
