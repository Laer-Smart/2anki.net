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

  /**
   * @swagger
   * /api/developer/keys:
   *   get:
   *     summary: List the caller's API keys
   *     description: Self-service — any signed-in account. Returns key names, prefixes, and last-used timestamps; never the secret.
   *     tags: [Developer]
   *     responses:
   *       200:
   *         description: The caller's keys
   *       401:
   *         description: Not signed in
   */
  router.get('/api/developer/keys', RequireAuthentication, (req, res) =>
    controller.list(req, res)
  );

  /**
   * @swagger
   * /api/developer/keys:
   *   post:
   *     summary: Create an API key
   *     description: Self-service — any signed-in account. The secret is returned once and stored only as a hash. Keys start on the free Sandbox tier.
   *     tags: [Developer]
   *     responses:
   *       201:
   *         description: The new key, including the one-time secret
   *       400:
   *         description: Invalid key name
   *       401:
   *         description: Not signed in
   */
  router.post('/api/developer/keys', RequireAuthentication, (req, res) =>
    controller.create(req, res)
  );

  /**
   * @swagger
   * /api/developer/keys/{id}:
   *   delete:
   *     summary: Revoke an API key
   *     description: Revocation is immediate — anything using the key stops working.
   *     tags: [Developer]
   *     responses:
   *       204:
   *         description: Key revoked
   *       401:
   *         description: Not signed in
   */
  router.delete('/api/developer/keys/:id', RequireAuthentication, (req, res) =>
    controller.revoke(req, res)
  );

  router.post(
    '/api/developer/request-access',
    RequireAuthentication,
    (req, res) => controller.requestAccessForUser(req, res)
  );

  return router;
};

export default DeveloperRouter;
