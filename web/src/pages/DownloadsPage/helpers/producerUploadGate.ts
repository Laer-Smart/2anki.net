import UserUpload from '../../../lib/interfaces/UserUpload';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const HEAVY_UPLOADER_THRESHOLD = 21;

export function isHeavyUploader(
  uploads: UserUpload[],
  now: number = Date.now()
): boolean {
  const cutoff = now - NINETY_DAYS_MS;
  const recent = uploads.filter((upload) => {
    if (upload.created_at == null) return false;
    return new Date(upload.created_at).getTime() >= cutoff;
  });
  return recent.length >= HEAVY_UPLOADER_THRESHOLD;
}
