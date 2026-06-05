import express from 'express';
import RequireOpsAccess from './middleware/RequireOpsAccess';
import { OpsErrorsController } from '../controllers/OpsErrorsController';
import { ListErrorGroupsUseCase } from '../usecases/ops/ListErrorGroupsUseCase';
import { ExportErrorGroupsUseCase } from '../usecases/ops/ExportErrorGroupsUseCase';
import { ResolveErrorGroupUseCase } from '../usecases/ops/ResolveErrorGroupUseCase';
import { ReopenErrorGroupUseCase } from '../usecases/ops/ReopenErrorGroupUseCase';
import { ErrorEventRepository } from '../data_layer/ErrorEventRepository';
import { getDatabase } from '../data_layer';

const OpsErrorsRouter = () => {
  const router = express.Router();
  const database = getDatabase();
  const repository = new ErrorEventRepository(database);
  const listUseCase = new ListErrorGroupsUseCase(repository);
  const exportUseCase = new ExportErrorGroupsUseCase(repository);
  const resolveUseCase = new ResolveErrorGroupUseCase(repository);
  const reopenUseCase = new ReopenErrorGroupUseCase(repository);
  const controller = new OpsErrorsController(
    listUseCase,
    exportUseCase,
    resolveUseCase,
    reopenUseCase
  );

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
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [unresolved, resolved, all], default: unresolved }
   *     responses:
   *       200:
   *         description: Grouped error events
   *       404:
   *         description: Not the ops owner
   */
  router.get('/api/ops/errors', RequireOpsAccess, (req, res) =>
    controller.list(req, res)
  );

  /**
   * @swagger
   * /api/ops/errors/export:
   *   get:
   *     summary: Export error groups as a Claude-ready markdown file
   *     description: |
   *       Internal endpoint locked to the ops owner. Returns 401 for everyone else.
   *       One markdown document with an investigation preamble and a section per
   *       group, each carrying the latest sample event. Never exposes ip_hash.
   *     tags: [Ops]
   *     parameters:
   *       - in: query
   *         name: source
   *         schema: { type: string, enum: [web, server] }
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [unresolved, resolved, all], default: unresolved }
   *     responses:
   *       200:
   *         description: Markdown attachment
   *       404:
   *         description: Not the ops owner
   */
  router.get('/api/ops/errors/export', RequireOpsAccess, (req, res) =>
    controller.exportMarkdown(req, res)
  );

  /**
   * @swagger
   * /api/ops/errors/{messageHash}/resolve:
   *   post:
   *     summary: Mark an error group resolved
   *     description: |
   *       Records a resolution timestamp for the group. A later occurrence
   *       (last_seen after resolved_at) reopens the group automatically.
   *     tags: [Ops]
   *     parameters:
   *       - in: path
   *         name: messageHash
   *         required: true
   *         schema: { type: string, pattern: '^[a-f0-9]{64}$' }
   *     responses:
   *       204:
   *         description: Resolved
   *       400:
   *         description: Invalid message hash
   *       404:
   *         description: Not the ops owner
   *   delete:
   *     summary: Reopen a resolved error group
   *     tags: [Ops]
   *     parameters:
   *       - in: path
   *         name: messageHash
   *         required: true
   *         schema: { type: string, pattern: '^[a-f0-9]{64}$' }
   *     responses:
   *       204:
   *         description: Reopened
   *       400:
   *         description: Invalid message hash
   *       404:
   *         description: Not the ops owner
   */
  router.post('/api/ops/errors/:messageHash/resolve', RequireOpsAccess, (req, res) =>
    controller.resolve(req, res)
  );
  router.delete('/api/ops/errors/:messageHash/resolve', RequireOpsAccess, (req, res) =>
    controller.reopen(req, res)
  );

  return router;
};

export default OpsErrorsRouter;
