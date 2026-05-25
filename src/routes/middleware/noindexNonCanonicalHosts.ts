import { Request, Response, NextFunction } from 'express';

const CANONICAL_HOSTS = new Set(['2anki.net']);

export function noindexNonCanonicalHosts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const host = req.hostname;
  if (host != null && host !== '' && !CANONICAL_HOSTS.has(host)) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
}
