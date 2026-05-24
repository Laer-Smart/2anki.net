import express from 'express';
import RequireAuthentication from './middleware/RequireAuthentication';
import { optionalAuthMiddleware } from './middleware/optionalAuthMiddleware';
import AutoSyncCheckoutController from '../controllers/AutoSyncCheckoutController';
import PassCheckoutController from '../controllers/PassCheckoutController';
import UnlimitedCheckoutController from '../controllers/UnlimitedCheckoutController';
import { AutoSyncCheckoutUseCase } from '../usecases/checkout/AutoSyncCheckoutUseCase';
import { CreatePassCheckoutUseCase } from '../usecases/checkout/CreatePassCheckoutUseCase';
import { UnlimitedCheckoutUseCase } from '../usecases/checkout/UnlimitedCheckoutUseCase';
import { getStripe } from '../lib/integrations/stripe';

const DEFAULT_MAX_SUBSCRIBERS = 50;

const CheckoutRouter = () => {
  const router = express.Router();

  const priceId = process.env.AUTO_SYNC_PRICE_ID ?? '';
  const productId = process.env.AUTO_SYNC_PRODUCT_ID ?? '';
  const maxSubscribers = Number.parseInt(process.env.HOSTED_ANKI_MAX_SUBSCRIBERS ?? '', 10) || DEFAULT_MAX_SUBSCRIBERS;

  router.post(
    '/api/checkout/auto-sync',
    RequireAuthentication,
    express.json(),
    (req, res) => {
      if (priceId === '') {
        return res.status(404).json({ message: 'Auto Sync checkout is not available' });
      }
      const useCase = new AutoSyncCheckoutUseCase(getStripe(), priceId, productId, maxSubscribers);
      const controller = new AutoSyncCheckoutController(useCase);
      return controller.createSession(req, res);
    }
  );

  const unlimitedMonthlyPriceId = process.env.UNLIMITED_MONTHLY_PRICE_ID ?? '';
  const unlimitedYearlyPriceId = process.env.UNLIMITED_YEARLY_PRICE_ID ?? '';

  router.post(
    '/api/checkout/unlimited',
    RequireAuthentication,
    express.json(),
    (req, res) => {
      if (unlimitedMonthlyPriceId === '') {
        return res.status(503).json({ message: 'Unlimited checkout is not available' });
      }
      const useCase = new UnlimitedCheckoutUseCase(
        getStripe(),
        unlimitedMonthlyPriceId,
        unlimitedYearlyPriceId
      );
      const controller = new UnlimitedCheckoutController(useCase);
      return controller.createSession(req, res);
    }
  );

  router.post(
    '/api/checkout/pass/24h',
    optionalAuthMiddleware,
    express.json(),
    (req, res) => {
      const pass24hPriceId = process.env.PASS_24H_PRICE_ID ?? '';
      if (pass24hPriceId === '') {
        return res.status(503).json({ message: 'Day Pass is not available right now.' });
      }
      const useCase = new CreatePassCheckoutUseCase(getStripe(), pass24hPriceId, '24h');
      const controller = new PassCheckoutController(useCase);
      return controller.createSession(req, res);
    }
  );

  router.post(
    '/api/checkout/pass/7d',
    optionalAuthMiddleware,
    express.json(),
    (req, res) => {
      const pass7dPriceId = process.env.PASS_7D_PRICE_ID ?? '';
      if (pass7dPriceId === '') {
        return res.status(503).json({ message: 'Week Pass is not available right now.' });
      }
      const useCase = new CreatePassCheckoutUseCase(getStripe(), pass7dPriceId, '7d');
      const controller = new PassCheckoutController(useCase);
      return controller.createSession(req, res);
    }
  );

  return router;
};

export default CheckoutRouter;
