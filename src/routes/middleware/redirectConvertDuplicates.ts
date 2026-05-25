import { Request, Response, NextFunction } from 'express';

// Duplicate /convert/<slug> paths that should 301 to their bare canonical
// twin. The destinations are hard-coded constants looked up by exact path, so
// no request data reaches the redirect target — the bare canonical path is the
// only possible outcome. The query string is intentionally dropped: these are
// canonicalization redirects for duplicate URLs, and search engines key on the
// path.
const CONVERT_REDIRECTS = new Map<string, string>([
  ['/convert/notion-to-anki', '/notion-to-anki'],
  ['/convert/pdf-to-anki', '/pdf-to-anki'],
  ['/convert/markdown-to-anki', '/markdown-to-anki'],
]);

export function redirectConvertDuplicates(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const target = CONVERT_REDIRECTS.get(req.path);
  if (target != null) {
    res.redirect(301, target);
    return;
  }
  next();
}
