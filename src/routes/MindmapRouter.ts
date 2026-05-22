import express from 'express';

import { getDatabase } from '../data_layer';
import { MindmapRepository } from '../data_layer/MindmapRepository';
import { MindmapController } from '../controllers/MindmapController';
import { CreateMindmapUseCase } from '../usecases/mindmaps/CreateMindmapUseCase';
import { UpdateMindmapUseCase } from '../usecases/mindmaps/UpdateMindmapUseCase';
import { DeleteMindmapUseCase } from '../usecases/mindmaps/DeleteMindmapUseCase';
import { ListMindmapsUseCase } from '../usecases/mindmaps/ListMindmapsUseCase';
import { GetMindmapUseCase } from '../usecases/mindmaps/GetMindmapUseCase';
import { ExportMindmapUseCase } from '../usecases/mindmaps/ExportMindmapUseCase';
import RequireAuthentication from './middleware/RequireAuthentication';

const MindmapRouter = () => {
  const router = express.Router();
  const db = getDatabase();
  const repo = new MindmapRepository(db);

  const controller = new MindmapController(
    new CreateMindmapUseCase(repo),
    new UpdateMindmapUseCase(repo),
    new DeleteMindmapUseCase(repo),
    new ListMindmapsUseCase(repo),
    new GetMindmapUseCase(repo),
    new ExportMindmapUseCase(repo)
  );

  /**
   * @swagger
   * /api/mindmaps:
   *   get:
   *     summary: List the user's mind maps
   *     tags: [Mind maps]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: Maps and free-tier access block
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 maps:
   *                   type: array
   *                   items:
   *                     type: object
   *                 access:
   *                   type: object
   *                   properties:
   *                     hasUnlimited:
   *                       type: boolean
   *                     currentCount:
   *                       type: integer
   *                     freeMapLimit:
   *                       type: integer
   *                     maxNodesPerMap:
   *                       type: integer
   *       401:
   *         description: Not authenticated
   */
  router.get('/api/mindmaps', RequireAuthentication, (req, res) =>
    controller.list(req, res)
  );

  /**
   * @swagger
   * /api/mindmaps:
   *   post:
   *     summary: Create a new mind map
   *     tags: [Mind maps]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *     responses:
   *       201:
   *         description: Map created
   *       401:
   *         description: Not authenticated
   *       403:
   *         description: Free-tier map limit reached
   */
  router.post('/api/mindmaps', RequireAuthentication, (req, res) =>
    controller.create(req, res)
  );

  /**
   * @swagger
   * /api/mindmaps/{id}:
   *   get:
   *     summary: Get a single mind map
   *     tags: [Mind maps]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: The mind map
   *       401:
   *         description: Not authenticated
   *       404:
   *         description: Not found
   */
  router.get('/api/mindmaps/:id', RequireAuthentication, (req, res) =>
    controller.getById(req, res)
  );

  /**
   * @swagger
   * /api/mindmaps/{id}:
   *   patch:
   *     summary: Update a mind map's title and/or graph
   *     tags: [Mind maps]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *               data:
   *                 type: object
   *                 properties:
   *                   nodes:
   *                     type: array
   *                   edges:
   *                     type: array
   *     responses:
   *       200:
   *         description: Updated map
   *       401:
   *         description: Not authenticated
   *       403:
   *         description: Free-tier node limit reached
   *       404:
   *         description: Not found
   */
  router.patch('/api/mindmaps/:id', RequireAuthentication, (req, res) =>
    controller.update(req, res)
  );

  /**
   * @swagger
   * /api/mindmaps/{id}:
   *   delete:
   *     summary: Delete a mind map
   *     tags: [Mind maps]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       204:
   *         description: Deleted
   *       401:
   *         description: Not authenticated
   */
  router.delete('/api/mindmaps/:id', RequireAuthentication, (req, res) =>
    controller.remove(req, res)
  );

  /**
   * @swagger
   * /api/mindmaps/{id}/export:
   *   post:
   *     summary: Export a mind map as an Anki .apkg deck
   *     tags: [Mind maps]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               deckName:
   *                 type: string
   *     responses:
   *       200:
   *         description: The .apkg file
   *         content:
   *           application/octet-stream:
   *             schema:
   *               type: string
   *               format: binary
   *       401:
   *         description: Not authenticated
   *       404:
   *         description: Not found
   */
  router.post('/api/mindmaps/:id/export', RequireAuthentication, (req, res) =>
    controller.exportDeck(req, res)
  );

  return router;
};

export default MindmapRouter;
