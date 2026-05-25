import { Request } from 'express';
import { ALLOWED_ORIGINS } from '../../lib/constants';

const ALLOWED_REDIRECT_PATHS = [
  '/notion',
  '/search',
  '/upload',
  '/downloads',
  '/favorites',
  '/templates',
  '/pricing',
  '/settings',
  '/anki',
  '/card-options',
];

const isValidRedirectUrl = (url: string): boolean => {
  try {
    // Check if it's a relative path (starts with /)
    if (url.startsWith('/')) {
      // Allow only specific internal paths
      return ALLOWED_REDIRECT_PATHS.some(
        (allowedPath) =>
          url === allowedPath || url.startsWith(allowedPath + '/')
      );
    }

    // For absolute URLs, validate against allowed origins
    const parsedUrl = new URL(url);

    // Only allow HTTPS (except localhost for development)
    if (
      parsedUrl.protocol !== 'https:' &&
      !parsedUrl.hostname.includes('localhost')
    ) {
      return false;
    }

    // Check if full URL is in ALLOWED_ORIGINS or if the origin is allowed
    const fullUrl = url;
    const origin = parsedUrl.origin;

    return (
      ALLOWED_ORIGINS.includes(fullUrl) ||
      ALLOWED_ORIGINS.includes(origin) ||
      ALLOWED_ORIGINS.includes(origin + '/')
    );
  } catch {
    // Invalid URL format
    return false;
  }
};

export const getRedirect = (req: Request): string => {
  const queryRedirect = req.query.redirect?.toString();
  const bodyRedirect = typeof req.body?.redirect === 'string' ? req.body.redirect : undefined;
  const redirectParam = queryRedirect ?? bodyRedirect;

  if (redirectParam == null || redirectParam === '') {
    return '/upload';
  }

  if (isValidRedirectUrl(redirectParam)) {
    return redirectParam;
  }

  return '/upload';
};
