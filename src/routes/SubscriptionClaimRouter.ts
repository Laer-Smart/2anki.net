import express from 'express';
import RequireAuthentication from './middleware/RequireAuthentication';
import { getDatabase } from '../data_layer';
import { getDefaultEmailService } from '../services/EmailService/EmailService';
import { getStripe } from '../lib/integrations/stripe';
import { SubscriptionService } from '../services/SubscriptionService';
import { ClaimSubscriptionUseCase } from '../usecases/subscriptions/ClaimSubscriptionUseCase';
import { ConfirmSubscriptionClaimUseCase } from '../usecases/subscriptions/ConfirmSubscriptionClaimUseCase';
import { SubscriptionClaimController } from '../controllers/SubscriptionClaimController';
import SubscriptionClaimTokensRepository from '../data_layer/SubscriptionClaimTokensRepository';
import SubscriptionClaimAuditRepository from '../data_layer/SubscriptionClaimAuditRepository';
import UsersRepository from '../data_layer/UsersRepository';

const SubscriptionClaimRouter = () => {
  const router = express.Router();
  const database = getDatabase();
  const tokensRepo = new SubscriptionClaimTokensRepository(database);
  const auditRepo = new SubscriptionClaimAuditRepository(database);
  const usersRepo = new UsersRepository(database);
  const emailService = getDefaultEmailService();
  const stripe = getStripe();

  const claimUseCase = new ClaimSubscriptionUseCase(
    tokensRepo,
    auditRepo,
    emailService,
    SubscriptionService,
    stripe
  );

  const confirmUseCase = new ConfirmSubscriptionClaimUseCase(
    database,
    tokensRepo,
    auditRepo,
    usersRepo,
    SubscriptionService,
    stripe
  );

  const controller = new SubscriptionClaimController(claimUseCase, confirmUseCase);

  router.post(
    '/api/subscriptions/claim',
    RequireAuthentication,
    express.json(),
    (req, res) => controller.initiate(req, res)
  );

  router.post(
    '/api/subscriptions/claim/confirm',
    RequireAuthentication,
    express.json(),
    (req, res) => controller.confirm(req, res)
  );

  return router;
};

export default SubscriptionClaimRouter;
