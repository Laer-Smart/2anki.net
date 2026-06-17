import express from 'express';
import AppStoreLinksController from '../controllers/AppStoreLinksController';
import AppStoreLinksService from '../services/AppStoreLinksService/AppStoreLinksService';

const AppStoreLinksRouter = () => {
  const controller = new AppStoreLinksController(new AppStoreLinksService());
  const router = express.Router();

  /**
   * @swagger
   * /api/app-store:
   *   get:
   *     summary: Get native app store links
   *     description: Returns the iOS and Mac App Store product URLs for the
   *       native app, built from the numeric Apple ID in the server env. When
   *       the ID is unset, `available` is false and the Download page shows its
   *       coming-soon state instead of a dead link.
   *     tags: [System]
   *     responses:
   *       200:
   *         description: Store links retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 available:
   *                   type: boolean
   *                   example: true
   *                 iosUrl:
   *                   type: string
   *                   example: "https://apps.apple.com/app/id1234567890"
   *                 macUrl:
   *                   type: string
   *                   example: "https://apps.apple.com/app/id1234567890?mt=12"
   */
  router.get('/api/app-store', (req, res) => controller.getLinks(req, res));

  return router;
};

export default AppStoreLinksRouter;
