import express from 'express';

import EmojiFeedbackController from '../controllers/EmojiFeedbackController';
import { EmojiFeedbackRepository } from '../data_layer/EmojiFeedbackRepository';
import { getDatabase } from '../data_layer';

const EmojiFeedbackRouter = () => {
  const router = express.Router();
  const database = getDatabase();
  const repo = new EmojiFeedbackRepository(database);
  const controller = new EmojiFeedbackController(repo);

  /**
   * @swagger
   * /api/emoji-feedback:
   *   post:
   *     summary: Submit emoji feedback
   *     tags: [Feedback]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [rating, page]
   *             properties:
   *               rating:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *               comment:
   *                 type: string
   *               email:
   *                 type: string
   *               page:
   *                 type: string
   *     responses:
   *       201:
   *         description: Feedback saved
   *       400:
   *         description: Invalid input
   */
  router.post('/api/emoji-feedback', (req, res) => controller.submit(req, res));

  return router;
};

export default EmojiFeedbackRouter;
