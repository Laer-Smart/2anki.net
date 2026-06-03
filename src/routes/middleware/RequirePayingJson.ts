import express, { NextFunction } from 'express';

import { isPaying } from '../../lib/isPaying';

const RequirePayingJson = (
  req: express.Request,
  res: express.Response,
  next: NextFunction
) => {
  if (res.locals.owner == null) {
    return res.status(401).json({ error: 'authentication required' });
  }
  if (!isPaying(res.locals)) {
    return res.status(402).json({ error: 'upgrade required' });
  }
  return next();
};

export default RequirePayingJson;
