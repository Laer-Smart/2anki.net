import { existsSync } from 'fs';
import path from 'path';
import http from 'http';

import express, { RequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import morgan from 'morgan';
import type { Knex } from 'knex';

const localEnvFile = path.join(__dirname, '../.env');
if (existsSync(localEnvFile)) {
  dotenv.config({ path: localEnvFile });
}

import { BUILD_DIR } from './lib/constants';
import ErrorHandler from './routes/middleware/ErrorHandler';
import { makeErrorCaptureMiddleware } from './routes/middleware/ErrorCaptureMiddleware';
import { ErrorEventRepository } from './data_layer/ErrorEventRepository';
import { writeFallbackError, drainFallbackFile } from './lib/errorFallback';

// Server Endpoints
import settingsRouter from './routes/SettingsRouter';
import checksRouter from './routes/ChecksRouter';
import versionRouter from './routes/VersionRouter';
import uploadRouter from './routes/UploadRouter';
import usersRouter from './routes/UserRouter';
import notionRouter from './routes/NotionRouter';
import rulesRouter from './routes/ParserRulesRouter';
import downloadRouter from './routes/DownloadRouter';
import apkgRouter from './routes/ApkgRouter';
import favoriteRouter from './routes/FavoriteRouter';
import ankifyRouter from './routes/AnkifyRouter';
import {
  attachAnkifySessionProxy,
  buildAnkifySessionProxyDeps,
} from './routes/AnkifySessionProxyRouter';
import templatesRouter from './routes/TemplatesRouter';
import defaultRouter from './routes/DefaultRouter';
import rejectScannerProbes from './routes/middleware/rejectScannerProbes';
import { noindexNonCanonicalHosts } from './routes/middleware/noindexNonCanonicalHosts';
import webhookRouter from './routes/WebhookRouter';
import ankifyWebhookRouter from './routes/AnkifyWebhookRouter';
import swaggerRouter from './routes/SwaggerRouter';
import opsRouter from './routes/OpsRouter';
import opsErrorsRouter from './routes/OpsErrorsRouter';
import opsDiscoveryRouter from './routes/OpsDiscoveryRouter';
import ostRouter from './routes/OstRouter';
import feedbackRouter from './routes/FeedbackRouter';
import contactMessagesRouter from './routes/ContactMessagesRouter';
import showcaseRouter from './routes/ShowcaseRouter';
import emojiFeedbackRouter from './routes/EmojiFeedbackRouter';
import reEngagementRouter from './routes/ReEngagementRouter';
import emailRedirectRouter from './routes/EmailRedirectRouter';
import imageOcclusionRouter from './routes/ImageOcclusionRouter';
import chatRouter from './routes/ChatRouter';
import eventsRouter from './routes/EventsRouter';
import checkoutRouter from './routes/CheckoutRouter';
import shareRouter from './routes/ShareRouter';
import mindmapRouter from './routes/MindmapRouter';
import wellKnownRouter from './routes/WellKnownRouter';
import requestLoggingMiddleware from './routes/middleware/requestLoggingMiddleware';
import { anonIdMiddleware } from './routes/middleware/anonIdMiddleware';
import { getEventsSink } from './services/events/eventsSinkInstance';

import { getDatabase, setupDatabase } from './data_layer';
import JobRepository from './data_layer/JobRepository';
import { MagicTokenRepository } from './data_layer/MagicTokenRepository';
import ReEngagementRepository from './data_layer/ReEngagementRepository';
import InactivityEmailRepository from './data_layer/InactivityEmailRepository';
import UploadRepository from './data_layer/UploadRespository';
import { updateStripeSubscriptions } from './lib/storage/jobs/helpers/updateStripeSubscriptions';
import { scheduleReEngagementEmails } from './lib/reengagement/jobs/scheduleReEngagementEmails';
import { scheduleInactivityWarnings } from './lib/inactivity/jobs/scheduleInactivityWarnings';
import { scheduleParserCanary } from './lib/parser/canary/scheduleParserCanary';
import { getDefaultEmailService } from './services/EmailService/EmailService';
import { SendInactivityWarningsUseCase } from './usecases/ops/SendInactivityWarningsUseCase';
import { initConversionPool } from './lib/conversionPool';
import { gracefulShutdown } from './lib/gracefulShutdown';

function registerSignalHandlers(server: http.Server, database: Knex) {
  process.on('uncaughtException', (error) => {
    writeFallbackError({
      source: 'server',
      message: error?.message ?? String(error),
      stack: error?.stack,
      capturedAt: new Date().toISOString(),
      phase: 'uncaught',
    });
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    writeFallbackError({
      source: 'server',
      message: error.message,
      stack: error.stack,
      capturedAt: new Date().toISOString(),
      phase: 'unhandled-rejection',
    });
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
  });

  const handle = (signal: 'SIGTERM' | 'SIGINT') => {
    gracefulShutdown(signal, server, database).catch((err) => {
      console.error('gracefulShutdown threw, forcing exit:', err);
      process.exit(1);
    });
  };
  process.on('SIGTERM', () => handle('SIGTERM'));
  process.on('SIGINT', () => handle('SIGINT'));
}

const serve = async () => {
  const templateDir = path.join(__dirname, 'templates');
  const app = express();
  const server = http.createServer(app);

  app.use(webhookRouter());
  app.use(ankifyWebhookRouter());
  app.use(express.json({ limit: '50mb' }) as RequestHandler);
  app.use(cookieParser());
  app.use(anonIdMiddleware);
  app.use(noindexNonCanonicalHosts);

  app.use(morgan('combined') as RequestHandler);
  app.use(requestLoggingMiddleware);

  const ankifySessionValidate = buildAnkifySessionProxyDeps();
  attachAnkifySessionProxy(app, server, ankifySessionValidate);

  app.use('/templates', express.static(templateDir));
  app.use(
    '/assets',
    express.static(`${BUILD_DIR}/assets`, {
      immutable: true,
      maxAge: '1y',
    })
  );
  app.use(express.static(BUILD_DIR));

  // API Documentation
  app.use(swaggerRouter());

  app.use(checksRouter());
  app.use(versionRouter());
  app.use(uploadRouter());
  app.use(usersRouter());
  app.use(notionRouter());
  app.use(rulesRouter());
  app.use(settingsRouter());
  app.use(downloadRouter());
  app.use(apkgRouter());
  app.use(favoriteRouter());
  app.use(ankifyRouter());
  app.use(templatesRouter());
  app.use(showcaseRouter());
  app.use(opsRouter());
  app.use(opsErrorsRouter());
  app.use(opsDiscoveryRouter());
  app.use(ostRouter());
  app.use(feedbackRouter());
  app.use(contactMessagesRouter());
  app.use(emojiFeedbackRouter());
  app.use(reEngagementRouter());
  app.use(emailRedirectRouter());
  app.use(imageOcclusionRouter());
  app.use(chatRouter());
  app.use(eventsRouter());
  app.use(checkoutRouter());
  app.use(shareRouter());
  app.use(mindmapRouter());

  app.use(wellKnownRouter());
  app.use(rejectScannerProbes);
  app.use(defaultRouter());

  const database = getDatabase();
  const errorEventRepo = new ErrorEventRepository(database);
  app.use(makeErrorCaptureMiddleware(errorEventRepo, writeFallbackError));
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      next: () => void
    ) => {
      if (!err) {
        next();
      } else {
        ErrorHandler(res, req, err);
      }
    }
  );

  const cwd = process.cwd();
  process.chdir(cwd);
  if (!process.env.SECRET) {
    throw new Error(
      'SECRET environment variable is required to sign JWTs. Refusing to boot with an unset secret.'
    );
  }
  if (!process.env.WORKSPACE_BASE) {
    throw new Error(
      'WORKSPACE_BASE environment variable is required. Refusing to boot without a workspace root.'
    );
  }
  initConversionPool();
  const port = process.env.PORT || 2020;
  server.listen(port, () => {
    console.info(`Running on http://localhost:${port}`);
  });
  registerSignalHandlers(server, database);

  await setupDatabase(database);

  const drainedCount = await drainFallbackFile(errorEventRepo);
  if (drainedCount > 0) {
    console.info(`[startup] Drained ${drainedCount} error(s) from fallback file into error_events`);
  }

  const jobRepo = new JobRepository(database);
  const interruptedClaudeCount = await jobRepo.markInterruptedClaudeJobs();
  if (interruptedClaudeCount > 0) {
    console.info(`[startup] Marked ${interruptedClaudeCount} Claude job(s) as interrupted`);
  }
  const interruptedNotionCount = await jobRepo.markInterruptedNotionJobs();
  if (interruptedNotionCount > 0) {
    console.info(`[startup] Marked ${interruptedNotionCount} Notion job(s) as interrupted`);
  }

  new MagicTokenRepository(database).deleteExpired().then((count) => {
    if (count > 0) {
      console.info(`Cleaned up ${count} expired magic token(s)`);
    }
  });

  if (process.env.STRIPE_SYNC_ON_STARTUP === 'true') {
    console.info('[startup] Running Stripe subscription sync in background');
    updateStripeSubscriptions().catch((error) => {
      console.error('[startup] Stripe subscription sync failed:', error);
    });
  }

  const eventsSink = getEventsSink();
  const reEngagementRepo = new ReEngagementRepository(database);
  const emailService = getDefaultEmailService();
  scheduleReEngagementEmails(reEngagementRepo, emailService, eventsSink);

  const inactivityEmailRepo = new InactivityEmailRepository(database);
  const uploadRepo = new UploadRepository(database);
  const sendInactivityWarningsUseCase = new SendInactivityWarningsUseCase(inactivityEmailRepo, emailService, uploadRepo);
  scheduleInactivityWarnings(sendInactivityWarningsUseCase, { eventsSink });
  scheduleParserCanary(emailService);
};

serve().catch((error) => {
  writeFallbackError({
    source: 'server',
    message: error?.message ?? String(error),
    stack: error?.stack,
    capturedAt: new Date().toISOString(),
    phase: 'startup',
  });
  console.error('[startup] Fatal error during boot:', error);
  process.exit(1);
});
