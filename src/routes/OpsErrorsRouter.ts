import express from 'express';
import RequireOpsAccess from './middleware/RequireOpsAccess';
import { OpsErrorsController } from '../controllers/OpsErrorsController';
import { ListErrorGroupsUseCase } from '../usecases/ops/ListErrorGroupsUseCase';
import { ErrorEventRepository } from '../data_layer/ErrorEventRepository';
import { getDatabase } from '../data_layer';

const OpsErrorsRouter = () => {
  const router = express.Router();
  const database = getDatabase();
  const repository = new ErrorEventRepository(database);
  const useCase = new ListErrorGroupsUseCase(repository);
  const controller = new OpsErrorsController(useCase);

  /**
   * @swagger
   * /api/ops/errors:
   *   get:
   *     summary: List grouped error events
   *     description: |
   *       Internal endpoint locked to the ops owner. Returns 401 for everyone else.
   *       Groups rows by exact message_hash. Never exposes ip_hash.
   *     tags: [Ops]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 50 }
   *       - in: query
   *         name: offset
   *         schema: { type: integer, default: 0 }
   *       - in: query
   *         name: source
   *         schema: { type: string, enum: [web, server] }
   *       - in: query
   *         name: sort
   *         schema: { type: string, enum: [last_seen, occurrences] }
   *     responses:
   *       200:
   *         description: Grouped error events
   *       401:
   *         description: Not the ops owner
   */
  router.get('/api/ops/errors', RequireOpsAccess, (req, res) =>
    controller.list(req, res)
  );

  return router;
};

export default OpsErrorsRouter;
