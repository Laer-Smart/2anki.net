import express from 'express';
import { getDatabase } from '../data_layer';
import ApiKeyRepository from '../data_layer/ApiKeyRepository';
import { getDefaultEmailService } from '../services/EmailService/EmailService';
import CreateApiKeyUseCase from '../usecases/developer/CreateApiKeyUseCase';
import ListApiKeysUseCase from '../usecases/developer/ListApiKeysUseCase';
import RevokeApiKeyUseCase from '../usecases/developer/RevokeApiKeyUseCase';
import RequestDeveloperAccessUseCase from '../usecases/developer/RequestDeveloperAccessUseCase';
import DeveloperController from '../controllers/DeveloperController';
import RequireAuthentication from './middleware/RequireAuthentication';
import RequireDeveloperAccess from './middleware/RequireDeveloperAccess';

const DeveloperRouter = () => {
  const router = express.Router();
  const database = getDatabase();
  const repo = new ApiKeyRepository(database);
  const controller = new DeveloperController(
    new CreateApiKeyUseCase(repo),
    new ListApiKeysUseCase(repo),
    new RevokeApiKeyUseCase(repo),
    new RequestDeveloperAccessUseCase(getDefaultEmailService())
  );

  router.get(
    '/api/developer/keys',
    RequireAuthentication,
    RequireDeveloperAccess,
    (req, res) => controller.list(req, res)
  );

  router.post(
    '/api/developer/keys',
    RequireAuthentication,
    RequireDeveloperAccess,
    (req, res) => controller.create(req, res)
  );

  router.delete(
    '/api/developer/keys/:id',
    RequireAuthentication,
    RequireDeveloperAccess,
    (req, res) => controller.revoke(req, res)
  );

  router.post(
    '/api/developer/request-access',
    RequireAuthentication,
    (req, res) => controller.requestAccessForUser(req, res)
  );

  return router;
};

export default DeveloperRouter;
