import { Request, Response, NextFunction } from 'express';

/**
 * Builds the redirect target on the canonical host, preserving the path and
 * query. Resolving the request path against the canonical origin and then
 * asserting the host is unchanged keeps a crafted path (e.g. `//evil.com`)
 * from sending the visitor off the canonical host.
 */
function buildCanonicalUrl(canonicalHost: string, originalUrl: string): string {
  const base = `https://${canonicalHost}`;
  const target = new URL(originalUrl, base);
  if (target.host === canonicalHost) {
    return target.toString();
  }
  return `${base}/`;
}

/**
 * 301-redirects any request whose host is not the configured canonical host
 * to `https://<CANONICAL_HOST><original-path-and-query>`. This collapses the
 * www, typo, and bot-generated subdomains that the server otherwise answers
 * with 200 into a single canonical apex, so search engines stop indexing
 * duplicate copies of the site.
 *
 * Only subdomains of the canonical host are redirected (anything ending in
 * `.<CANONICAL_HOST>`), so localhost, internal health-check probes, and
 * unrelated domains pass through untouched.
 *
 * Gated on CANONICAL_HOST: when it is unset (local dev, tests, staging) the
 * middleware is a transparent no-op.
 */
export function redirectNonCanonicalHosts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const canonicalHost = process.env.CANONICAL_HOST;
  if (canonicalHost == null || canonicalHost === '') {
    next();
    return;
  }

  const host = req.hostname;
  if (host != null && host !== '' && host.endsWith(`.${canonicalHost}`)) {
    res.redirect(301, buildCanonicalUrl(canonicalHost, req.originalUrl));
    return;
  }

  next();
}
