export type DeviceClass = 'mobile' | 'tablet' | 'desktop' | 'unknown';

const TABLET_PATTERN = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i;
const MOBILE_PATTERN =
  /Mobi|iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i;

export function classifyDevice(
  userAgent: string | undefined | null
): DeviceClass {
  if (typeof userAgent !== 'string' || userAgent.trim().length === 0) {
    return 'unknown';
  }
  if (TABLET_PATTERN.test(userAgent)) return 'tablet';
  if (MOBILE_PATTERN.test(userAgent)) return 'mobile';
  return 'desktop';
}
