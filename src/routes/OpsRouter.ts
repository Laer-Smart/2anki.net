import express from 'express';

import OpsController from '../controllers/OpsController';
import { GetOpsMetricsUseCase } from '../usecases/ops/GetOpsMetricsUseCase';
import { GetBusinessMetricsUseCase } from '../usecases/ops/GetBusinessMetricsUseCase';
import { GetConversionMetricsUseCase } from '../usecases/ops/GetConversionMetricsUseCase';
import { GetPerformanceMetricsUseCase } from '../usecases/ops/GetPerformanceMetricsUseCase';
import { GetReturnRateMetricsUseCase } from '../usecases/ops/GetReturnRateMetricsUseCase';
import { SendAbandonedCheckoutRecoveryUseCase } from '../usecases/ops/SendAbandonedCheckoutRecoveryUseCase';
import { PopulateShowcaseUseCase } from '../usecases/ops/PopulateShowcaseUseCase';
import { ObservabilityRepository } from '../data_layer/ObservabilityRepository';
import { ObservabilityQueryService } from '../services/observability/ObservabilityQueryService';
import { BusinessMetricsService } from '../services/ops/BusinessMetricsService';
import { ConversionMetricsService } from '../services/ops/ConversionMetricsService';
import { PerformanceMetricsService } from '../services/ops/PerformanceMetricsService';
import { ReturnRateMetricsService } from '../services/ops/ReturnRateMetricsService';
import { BusinessMetricsCacheRepository } from '../data_layer/BusinessMetricsCacheRepository';
import { CancellationFeedbackRepository } from '../data_layer/CancellationFeedbackRepository';
import { EmojiFeedbackRepository } from '../data_layer/EmojiFeedbackRepository';
import { ReEngagementFeedbackRepository } from '../data_layer/ReEngagementFeedbackRepository';
import UsersRepository from '../data_layer/UsersRepository';
import { ShowcaseRepository } from '../data_layer/ShowcaseRepository';
import DownloadRepository from '../data_layer/DownloadRepository';
import NotionRepository from '../data_layer/NotionRespository';
import BlocksCacheRepository from '../data_layer/BlocksCacheRepository';
import DownloadService from '../services/DownloadService';
import ApkgPreviewService from '../services/ApkgPreviewService/ApkgPreviewService';
import { NotionService } from '../services/NotionService/NotionService';
import { getDatabase } from '../data_layer';
import RequireOpsAccess from './middleware/RequireOpsAccess';
import InactivityEmailRepository from '../data_layer/InactivityEmailRepository';
import { SendInactivityWarningsUseCase } from '../usecases/ops/SendInactivityWarningsUseCase';
import { getDefaultEmailService } from '../services/EmailService/EmailService';
import { UserVisibleErrorsRepository } from '../data_layer/UserVisibleErrorsRepository';

const OpsRouter = () => {
  const router = express.Router();
  const database = getDatabase();
  const repo = new ObservabilityRepository(database);
  const queryService = new ObservabilityQueryService(repo);

  const businessMetricsService = new BusinessMetricsService({
    cacheRepository: new BusinessMetricsCacheRepository(database),
    cancellationRepository: new CancellationFeedbackRepository(database),
    emojiFeedbackRepository: new EmojiFeedbackRepository(database),
    reengagementRepository: new ReEngagementFeedbackRepository(database),
    signupCountryRepository: new UsersRepository(database),
  });

  const conversionMetricsService = new ConversionMetricsService(database);
  const performanceMetricsService = new PerformanceMetricsService(
    database,
    new UserVisibleErrorsRepository(database)
  );

  const showcaseRepo = new ShowcaseRepository(database);
  const populateShowcase = new PopulateShowcaseUseCase(
    showcaseRepo,
    new NotionService(
      new NotionRepository(database),
      undefined,
      new BlocksCacheRepository(database)
    ),
    new ApkgPreviewService(),
    new DownloadService(new DownloadRepository(database))
  );

  const emailService = getDefaultEmailService();
  const controller = new OpsController(
    new GetOpsMetricsUseCase(queryService),
    new GetBusinessMetricsUseCase(businessMetricsService),
    new GetConversionMetricsUseCase(conversionMetricsService),
    populateShowcase,
    showcaseRepo,
    new SendInactivityWarningsUseCase(
      new InactivityEmailRepository(database),
      emailService
    ),
    new GetPerformanceMetricsUseCase(performanceMetricsService),
    new SendAbandonedCheckoutRecoveryUseCase(emailService),
    new GetReturnRateMetricsUseCase(new ReturnRateMetricsService(database))
  );

  /**
   * @swagger
   * /api/ops/metrics:
   *   get:
   *     summary: Aggregated request/outbound observability metrics
   *     description: Internal endpoint locked to the ops owner. Returns 404 for everyone else (we don't reveal that the dashboard exists).
   *     tags: [Ops]
   *     parameters:
   *       - in: query
   *         name: window
   *         required: false
   *         schema:
   *           type: string
   *           enum: [1h, 24h, 7d]
   *     responses:
   *       200:
   *         description: Metrics payload
   *       404:
   *         description: Not the ops owner
   */
  router.get('/api/ops/metrics', RequireOpsAccess, (req, res) =>
    controller.getMetrics(req, res)
  );

  /**
   * @swagger
   * /api/ops/business/metrics:
   *   get:
   *     summary: Business metrics from Stripe-backed subscriptions
   *     description: Internal endpoint locked to the ops owner. Returns 404 for everyone else.
   *     tags: [Ops]
   *     responses:
   *       200:
   *         description: Business metrics payload
   *       404:
   *         description: Not the ops owner
   */
  router.get('/api/ops/business/metrics', RequireOpsAccess, (req, res) =>
    controller.getBusinessMetrics(req, res)
  );

  /**
   * @swagger
   * /api/ops/conversion/metrics:
   *   get:
   *     summary: Conversion success/failure metrics from jobs table
   *     description: Internal endpoint locked to the ops owner. Returns 404 for everyone else.
   *     tags: [Ops]
   *     responses:
   *       200:
   *         description: Conversion metrics payload
   *       404:
   *         description: Not the ops owner
   */
  router.get('/api/ops/conversion/metrics', RequireOpsAccess, (req, res) =>
    controller.getConversionMetrics(req, res)
  );

  /**
   * @swagger
   * /api/ops/showcase/populate:
   *   post:
   *     summary: Populate homepage showcase
   *     description: Fetches Notion blocks and APKG cards, caches them in the database for the homepage showcase section.
   *     tags: [Ops]
   *     responses:
   *       200:
   *         description: Showcase populated
   *       404:
   *         description: Not the ops owner
   */
  router.post('/api/ops/showcase/populate', RequireOpsAccess, (req, res) =>
    controller.populateShowcase(req, res)
  );

  /**
   * @swagger
   * /api/ops/showcase:
   *   delete:
   *     summary: Purge homepage showcase
   *     description: Deletes the cached showcase data. The homepage section hides when no data exists.
   *     tags: [Ops]
   *     responses:
   *       200:
   *         description: Showcase purged
   *       404:
   *         description: Not the ops owner
   */
  router.delete('/api/ops/showcase', RequireOpsAccess, (req, res) =>
    controller.purgeShowcase(req, res)
  );

  /**
   * @swagger
   * /api/ops/send-inactivity-warnings:
   *   post:
   *     summary: Send inactivity warning emails to dormant free accounts
   *     description: |
   *       Finds free users inactive for 6+ months and sends a deletion warning email.
   *       Exempt: patreon=true (lifetime) and active Stripe subscribers.
   *       Pass ?dryRun=false to send real emails; omit or pass ?dryRun=true to count candidates only.
   *       Run manually — do not put on a cron until signal is validated.
   *     tags: [Ops]
   *     parameters:
   *       - in: query
   *         name: dryRun
   *         schema:
   *           type: string
   *           enum: ['true', 'false']
   *         description: Defaults to true. Pass false to actually send emails.
   *     responses:
   *       200:
   *         description: Result with candidate count and dryRun flag
   *       404:
   *         description: Not the ops owner
   */
  router.post('/api/ops/send-inactivity-warnings', RequireOpsAccess, (req, res) =>
    controller.sendInactivityWarnings(req, res)
  );

  /**
   * @swagger
   * /api/ops/performance/metrics:
   *   get:
   *     summary: Job-duration percentiles, status breakdown, and signup-country counts
   *     description: |
   *       Internal endpoint locked to the ops owner. Returns p50/p95/p99 job durations (24h and 7d), terminal-status counts, the 20 slowest done jobs in the last 24h, and signup country breakdown for the last 7 days. Returns 404 for everyone else.
   *     tags: [Ops]
   *     responses:
   *       200:
   *         description: Performance metrics payload
   *       404:
   *         description: Not the ops owner
   */
  router.get('/api/ops/performance/metrics', RequireOpsAccess, (req, res) =>
    controller.getPerformanceMetrics(req, res)
  );

  /**
   * @swagger
   * /api/ops/send-abandoned-checkout-recovery:
   *   post:
   *     summary: Send abandoned-checkout recovery emails
   *     description: |
   *       Mail the supplied list of email addresses with the abandoned-checkout recovery template. Pass `dryRun: false` in the body to actually send; defaults to true. Run manually only.
   *     tags: [Ops]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [emails]
   *             properties:
   *               emails:
   *                 type: array
   *                 items: { type: string }
   *               dryRun:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Result with sent/failed counts and dryRun flag
   *       400:
   *         description: emails missing or invalid
   *       404:
   *         description: Not the ops owner
   */
  router.post(
    '/api/ops/send-abandoned-checkout-recovery',
    RequireOpsAccess,
    (req, res) => controller.sendAbandonedCheckoutRecovery(req, res)
  );

  /**
   * @swagger
   * /api/ops/return-rate/metrics:
   *   get:
   *     summary: Post-completion return-rate metrics bucketed by source type
   *     description: |
   *       Internal endpoint locked to the ops owner. Returns the % of users who returned for a
   *       second conversion within 7, 14, and 30 days of their prior successful conversion,
   *       bucketed by source_type (page, database, conversion). Cohort window is the last 90 days.
   *       Returns 404 for everyone else.
   *     tags: [Ops]
   *     responses:
   *       200:
   *         description: Return-rate metrics payload
   *       404:
   *         description: Not the ops owner
   */
  router.get('/api/ops/return-rate/metrics', RequireOpsAccess, (req, res) =>
    controller.getReturnRateMetrics(req, res)
  );

  return router;
};

export default OpsRouter;
