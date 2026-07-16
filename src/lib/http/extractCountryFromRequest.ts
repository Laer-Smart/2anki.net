import type express from 'express';
import geoip from 'geoip-lite';
import { resolveClientIp } from '../rateLimit/ipHelpers';

const ISO_3166_ALPHA2 = /^[A-Z]{2}$/;

const readHeader = (req: express.Request, name: string): string | null => {
  const value = req.headers?.[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === 'string' ? value : null;
};

const normalizeCountry = (candidate: string | null): string | null => {
  if (candidate == null) return null;
  const upper = candidate.trim().toUpperCase();
  return ISO_3166_ALPHA2.test(upper) ? upper : null;
};

export function extractCountryFromRequest(req: express.Request): string | null {
  const fromHeader = normalizeCountry(
    readHeader(req, 'cloudfront-viewer-country') ??
      readHeader(req, 'cf-ipcountry') ??
      readHeader(req, 'x-vercel-ip-country')
  );
  if (fromHeader != null) return fromHeader;

  const geo = geoip.lookup(resolveClientIp(req));
  return normalizeCountry(geo?.country ?? null);
}
