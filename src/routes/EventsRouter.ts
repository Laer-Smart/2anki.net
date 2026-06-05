import express from 'express';
import { EventsController } from '../controllers/EventsController';
import { TrackEventUseCase } from '../usecases/events/TrackEventUseCase';
import { getEventsSink } from '../services/events/eventsSinkInstance';
import { anonIdMiddleware } from './middleware/anonIdMiddleware';
import { optionalAuthMiddleware } from './middleware/optionalAuthMiddleware';
import { ErrorEventController } from '../controllers/ErrorEventController';
import { IngestErrorEventUseCase } from '../usecases/events/IngestErrorEventUseCase';
import { ErrorEventRepository } from '../data_layer/ErrorEventRepository';
import { getDatabase } from '../data_layer';

const EventsRouter = () => {
  const router = express.Router();
  const sink = getEventsSink();
  const useCase = new TrackEventUseCase(sink);
  const controller = new EventsController(useCase);

  router.post(
    '/api/events/track',
    anonIdMiddleware,
    optionalAuthMiddleware,
    (req, res) => controller.track(req, res)
  );

  const database = getDatabase();
  const errorRepo = new ErrorEventRepository(database);
  const ingestUseCase = new IngestErrorEventUseCase(errorRepo);
  const errorController = new ErrorEventController(ingestUseCase);

  /**
   * @swagger
   * /api/events/errors:
   *   post:
   *     summary: Ingest a client or server error event
   *     description: |
   *       Anonymous endpoint. Rate-limited to 10 req/min per IP and 1 000/min globally.
   *       Payload must be ≤ 10 KB. Duplicate messages (same hash + IP within 5 min) return 202 with no insert.
   *     tags: [Events]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [message]
   *             properties:
   *               message:
   *                 type: string
   *               stack:
   *                 type: string
   *               url:
   *                 type: string
   *               userAgent:
   *                 type: string
   *               release:
   *                 type: string
   *               userId:
   *                 type: number
   *               source:
   *                 type: string
   *                 enum: [web, server]
   *               context:
   *                 type: object
   *     responses:
   *       202:
   *         description: Accepted (or silently deduped)
   *       400:
   *         description: Missing or invalid message field
   *       413:
   *         description: Payload exceeds 10 KB limit
   *       429:
   *         description: Rate limit exceeded
   */
  router.post('/api/events/errors', (req, res) =>
    errorController.ingest(req, res)
  );

  return router;
};

export default EventsRouter;
