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

  router.get('/api/mindmaps', RequireAuthentication, (req, res) =>
    controller.list(req, res)
  );

  router.post('/api/mindmaps', RequireAuthentication, (req, res) =>
    controller.create(req, res)
  );

  router.get('/api/mindmaps/:id', RequireAuthentication, (req, res) =>
    controller.getById(req, res)
  );

  router.patch('/api/mindmaps/:id', RequireAuthentication, (req, res) =>
    controller.update(req, res)
  );

  router.delete('/api/mindmaps/:id', RequireAuthentication, (req, res) =>
    controller.remove(req, res)
  );

  router.post('/api/mindmaps/:id/export', RequireAuthentication, (req, res) =>
    controller.exportDeck(req, res)
  );

  return router;
};

export default MindmapRouter;
