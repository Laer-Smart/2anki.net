import express, { NextFunction } from 'express';

import AuthenticationService from '../../services/AuthenticationService';
import TokenRepository from '../../data_layer/TokenRepository';
import UsersRepository from '../../data_layer/UsersRepository';
import { getDatabase } from '../../data_layer';
import { hasAnkifyAccess } from '../../lib/ankify/access';
import SubscriptionService from '../../services/SubscriptionService';

export const makeRequireAnkifyAccess = (authService: AuthenticationService) => {
  return async (
    req: express.Request,
    res: express.Response,
    next: NextFunction
  ) => {
    const token = req.cookies?.token;
    const user = await authService.getUserFrom(token);

    if (user == null) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const subscriptions = await SubscriptionService.getUserActiveSubscriptions(
      user.email
    );
    const autoSyncProductId = process.env.AUTO_SYNC_PRODUCT_ID ?? '';

    if (!hasAnkifyAccess(user, subscriptions, autoSyncProductId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.locals.owner = user.owner;
    res.locals.email = user.email;
    return next();
  };
};

const RequireAnkifyAccess = (
  req: express.Request,
  res: express.Response,
  next: NextFunction
) => {
  const database = getDatabase();
  const authService = new AuthenticationService(
    new TokenRepository(database),
    new UsersRepository(database)
  );
  return makeRequireAnkifyAccess(authService)(req, res, next);
};

export default RequireAnkifyAccess;
