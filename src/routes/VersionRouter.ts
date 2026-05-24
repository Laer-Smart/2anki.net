import express from 'express';
import VersionController from '../controllers/VersionController';
import VersionService from '../services/VersionService';

const VersionRouter = () => {
  const controller = new VersionController(new VersionService());
  const router = express.Router();

  /**
   * @swagger
   * /api/version:
   *   get:
   *     summary: Get API version information
   *     description: Returns the running package version and the git SHA the
   *       process was built from. Used by the deploy workflow to verify that
   *       the new code is actually running (not a stale process).
   *     tags: [System]
   *     responses:
   *       200:
   *         description: Version information retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 version:
   *                   type: string
   *                   example: "2.0.0"
   *                 sha:
   *                   type: string
   *                   description: Git SHA (full 40-char) the build was created from,
   *                     or "unknown" if GIT_SHA is unset in the runtime env.
   *                   example: "9be7cb9bbcd7..."
   */
  router.get('/api/version', (req, res) => controller.getVersionInfo(req, res));

  return router;
};

export default VersionRouter;
