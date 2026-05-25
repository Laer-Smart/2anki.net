import { Request, Response, NextFunction } from 'express';

const DUPLICATE_SLUGS = new Set([
  'notion-to-anki',
  'pdf-to-anki',
  'markdown-to-anki',
]);

const CONVERT_PREFIX = '/convert/';

export function redirectConvertDuplicates(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.path.startsWith(CONVERT_PREFIX)) {
    const slug = req.path.slice(CONVERT_PREFIX.length);
    if (DUPLICATE_SLUGS.has(slug)) {
      // Parse the query through the URL API rather than splicing the raw
      // request string, so the redirect target stays a constant relative path.
      const { search } = new URL(req.originalUrl, 'http://canonical.invalid');
      res.redirect(301, `/${slug}${search}`);
      return;
    }
  }
  next();
}
