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
      const queryStart = req.originalUrl.indexOf('?');
      const query = queryStart === -1 ? '' : req.originalUrl.slice(queryStart);
      res.redirect(301, `/${slug}${query}`);
      return;
    }
  }
  next();
}
