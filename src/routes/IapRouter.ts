import express from 'express';

import RequireAuthentication from './middleware/RequireAuthentication';
import RequireAllowedOrigin from './middleware/RequireAllowedOrigin';
import { getDatabase } from '../data_layer';
import UserPassRepository from '../data_layer/UserPassRepository';
import AppleTransactionsRepository from '../data_layer/AppleTransactionsRepository';
import { RedeemAppleTransactionUseCase } from '../usecases/iap/RedeemAppleTransactionUseCase';
import { createAppleStoreKitService } from '../services/AppleStoreKitService';
import IapController from '../controllers/IapController';

const IapRouter = () => {
  const router = express.Router();
  const database = getDatabase();

  /**
   * @swagger
   * /api/iap/redeem:
   *   post:
   *     summary: Credit a 2anki account after a verified Apple in-app purchase
   *     tags: [IAP]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [jws, product_id]
   *             properties:
   *               jws:
   *                 type: string
   *                 description: Apple StoreKit 2 Transaction.jwsRepresentation
   *               product_id:
   *                 type: string
   *                 description: Claimed product id, cross-checked against the decoded JWS
   *     responses:
   *       200:
   *         description: Entitlement applied; body carries the refreshed locals
   *       400:
   *         description: JWS malformed, or decoded product id does not match the body
   *       401:
   *         description: Not authenticated
   *       409:
   *         description: Transaction already credited
   *       502:
   *         description: Apple could not confirm the purchase
   */
  router.post(
    '/api/iap/redeem',
    RequireAllowedOrigin,
    RequireAuthentication,
    async (req, res, next) => {
      try {
        const useCase = new RedeemAppleTransactionUseCase(
          createAppleStoreKitService(),
          new UserPassRepository(database),
          new AppleTransactionsRepository(database)
        );
        const controller = new IapController(useCase);
        await controller.redeem(req, res);
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
};

export default IapRouter;
