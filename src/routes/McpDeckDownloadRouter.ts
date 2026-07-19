import express from 'express';

import { getDatabase } from '../data_layer';
import UploadRepository from '../data_layer/UploadRespository';
import StorageHandler from '../lib/storage/StorageHandler';
import McpDeckDownloadController from '../controllers/McpDeckDownloadController';
import { ResolveMcpDeckDownloadUseCase } from '../usecases/mcp/ResolveMcpDeckDownloadUseCase';

const OBJECT_ID_PATTERN = /^[0-9a-f-]{36}$/i;

export function createMcpDeckDownloadRouter(
  controller: McpDeckDownloadController
): express.Router {
  const router = express.Router();
  router.get('/api/mcp/decks/:objectId/download', (req, res) => {
    if (!OBJECT_ID_PATTERN.test(req.params.objectId ?? '')) {
      res.status(404).send();
      return;
    }
    void controller.download(req, res);
  });
  return router;
}

export default function mcpDeckDownloadRouter(): express.Router {
  const database = getDatabase();
  const useCase = new ResolveMcpDeckDownloadUseCase(
    new UploadRepository(database),
    new StorageHandler()
  );
  return createMcpDeckDownloadRouter(new McpDeckDownloadController(useCase));
}
