export function normalizeS3Endpoint(raw: string | undefined): string {
  if (raw == null || raw === '') {
    throw new Error('SPACES_ENDPOINT is required');
  }
  return /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
}
