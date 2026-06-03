export type UploadSource = 'app' | 'web' | 'dropbox' | 'google_drive';

const ALLOWED_UPLOAD_SOURCES: readonly UploadSource[] = [
  'app',
  'web',
  'dropbox',
  'google_drive',
];

export function validateUploadSource(raw: unknown): UploadSource | null {
  if (typeof raw !== 'string') {
    return null;
  }
  return ALLOWED_UPLOAD_SOURCES.includes(raw as UploadSource)
    ? (raw as UploadSource)
    : null;
}
