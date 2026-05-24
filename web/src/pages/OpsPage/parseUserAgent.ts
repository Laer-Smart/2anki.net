export function parseUserAgent(ua: string | null): string {
  if (ua == null || ua.trim().length === 0) return '(unknown)';

  if (/HeadlessChrome/.test(ua)) return 'Chrome (headless)';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua) && /Safari\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';

  return ua.slice(0, 40);
}
