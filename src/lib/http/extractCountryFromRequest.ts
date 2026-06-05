import type express from 'express';

const ISO_3166_ALPHA2 = /^[A-Z]{2}$/;

const readHeader = (req: express.Request, name: string): string | null => {
  const value = req.headers?.[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === 'string' ? value : null;
};

export function extractCountryFromRequest(req: express.Request): string | null {
  const candidate =
    readHeader(req, 'cloudfront-viewer-country') ??
    readHeader(req, 'cf-ipcountry') ??
    readHeader(req, 'x-vercel-ip-country');
  if (candidate == null) return null;
  const upper = candidate.trim().toUpperCase();
  if (!ISO_3166_ALPHA2.test(upper)) return null;
  return upper;
}
