import express, { NextFunction } from 'express';

import TokenRepository from '../../data_layer/TokenRepository';
import UsersRepository from '../../data_layer/UsersRepository';
import AuthenticationService from '../../services/AuthenticationService';
import { getDatabase } from '../../data_layer';
import { configureUserLocal } from './configureUserLocal';
import { isPaying } from '../../lib/isPaying';

const RequirePaying = async (
  req: express.Request,
  res: express.Response,
  next: NextFunction
) => {
  const database = getDatabase();
  const authService = new AuthenticationService(
    new TokenRepository(database),
    new UsersRepository(database)
  );
  await configureUserLocal(req, res, authService, database);

  if (!isPaying(res.locals)) {
    return res.redirect('/pricing');
  }

  return next();
};

export default RequirePaying;
