import express from 'express';

import FeatureInterestController from '../controllers/FeatureInterestController';
import { FeatureInterestRepository } from '../data_layer/FeatureInterestRepository';
import { getDatabase } from '../data_layer';
import { OptionalAuthentication } from './middleware/RequireAuthentication';

const FeatureInterestRouter = () => {
  const router = express.Router();
  const database = getDatabase();
  const repo = new FeatureInterestRepository(database);
  const controller = new FeatureInterestController(repo);

  /**
   * @swagger
   * /api/feature-interest:
   *   post:
   *     summary: Record interest in a not-yet-built feature
   *     tags: [Feedback]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [feature_key]
   *             properties:
   *               feature_key:
   *                 type: string
   *               comment:
   *                 type: string
   *     responses:
   *       201:
   *         description: Interest recorded
   *       400:
   *         description: Unknown feature
   */
  router.post('/api/feature-interest', OptionalAuthentication, (req, res) =>
    controller.record(req, res)
  );

  return router;
};

export default FeatureInterestRouter;
