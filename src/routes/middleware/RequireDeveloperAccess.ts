import express, { NextFunction } from 'express';

/**
 * Gate the Developers surface. Must run AFTER an auth middleware that populates
 * `res.locals` (owner, patreon, developer_access). Allowed when the account is
 * lifetime (`patreon`) OR has been granted access from ops (`developer_access`).
 * Everyone else gets 403 — the Developers page offers them a request-access
 * path that emails support so the grant can be made by email.
 */
const RequireDeveloperAccess = (
  _req: express.Request,
  res: express.Response,
  next: NextFunction
) => {
  if (!res.locals.owner) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  const allowed =
    res.locals.patreon === true || res.locals.developer_access === true;
  if (!allowed) {
    return res
      .status(403)
      .json({ message: 'Developer access is not enabled for this account.' });
  }
  return next();
};

export default RequireDeveloperAccess;
