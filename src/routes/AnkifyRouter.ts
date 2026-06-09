import express from 'express';
import Docker from 'dockerode';

import AnkifyController from '../controllers/AnkifyController';
import { AnkifyClientsRepository } from '../data_layer/ankify/AnkifyClientsRepository';
import { AnkifySyncMappingsRepository } from '../data_layer/ankify/AnkifySyncMappingsRepository';
import UploadRepository from '../data_layer/UploadRespository';
import { getDatabase } from '../data_layer';
import { RacService } from '../services/ankify/RacService';
import { ankiConnectFactory } from '../services/ankify/buildAnkiConnectClient';
import { notionBlockChildrenFetcherFactory } from '../services/ankify/notionBlockChildrenFetcher';
import ProvisionAnkifyClientUseCase from '../usecases/ankify/ProvisionAnkifyClientUseCase';
import ListAnkifyClientsUseCase from '../usecases/ankify/ListAnkifyClientsUseCase';
import StopAnkifyClientUseCase from '../usecases/ankify/StopAnkifyClientUseCase';
import RespinAnkifyClientUseCase from '../usecases/ankify/RespinAnkifyClientUseCase';
import { SendUploadToRacUseCase } from '../usecases/ankify/SendUploadToRacUseCase';
import { ExportReviewDataToNotionUseCase } from '../usecases/ankify/ExportReviewDataToNotionUseCase';
import { ConfigureExportScheduleUseCase } from '../usecases/ankify/ConfigureExportScheduleUseCase';
import { GetExportScheduleUseCase } from '../usecases/ankify/GetExportScheduleUseCase';
import { DeleteExportScheduleUseCase } from '../usecases/ankify/DeleteExportScheduleUseCase';
import { ListSyncLogsUseCase } from '../usecases/ankify/ListSyncLogsUseCase';
import { AnkifySyncLogsRepository } from '../data_layer/ankify/AnkifySyncLogsRepository';
import { AnkifyNotionSubscriptionsRepository } from '../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { AnkifySyncConflictsRepository } from '../data_layer/ankify/AnkifySyncConflictsRepository';
import { SyncNotionPageToRacUseCase } from '../usecases/ankify/SyncNotionPageToRacUseCase';
import { RefreshAnkifySubscriptionUseCase } from '../usecases/ankify/RefreshAnkifySubscriptionUseCase';
import { ListNotionSubscriptionsUseCase } from '../usecases/ankify/ListNotionSubscriptionsUseCase';
import { DeleteNotionSubscriptionUseCase } from '../usecases/ankify/DeleteNotionSubscriptionUseCase';
import { ListConflictsUseCase } from '../usecases/ankify/ListConflictsUseCase';
import { ResolveConflictUseCase } from '../usecases/ankify/ResolveConflictUseCase';
import { ListNotionDatabasesUseCase } from '../usecases/ankify/ListNotionDatabasesUseCase';
import { CreateReviewTrackerDatabaseUseCase } from '../usecases/ankify/CreateReviewTrackerDatabaseUseCase';
import { CheckActiveClientReadinessUseCase } from '../usecases/ankify/CheckActiveClientReadinessUseCase';
import { CheckAnkiWebStatusUseCase } from '../usecases/ankify/CheckAnkiWebStatusUseCase';
import ReissueAnkifySessionUrlUseCase from '../usecases/ankify/ReissueAnkifySessionUrlUseCase';
import { ValidateAnkifySessionTokenUseCase } from '../usecases/ankify/ValidateAnkifySessionTokenUseCase';
import { AnkifyExportSchedulesRepository } from '../data_layer/ankify/AnkifyExportSchedulesRepository';
import { getAnkifyExportScheduler } from '../lib/ankify/scheduler/instance';
import { AnkifySessionTokensRepository } from '../data_layer/ankify/AnkifySessionTokensRepository';
import AuthenticationService from '../services/AuthenticationService';
import TokenRepository from '../data_layer/TokenRepository';
import UsersRepository from '../data_layer/UsersRepository';
import { Client as NotionClient } from '@notionhq/client';
import NotionRepository from '../data_layer/NotionRespository';
import StorageHandler from '../lib/storage/StorageHandler';
import { parseCollection } from '../services/ApkgPreviewService/parseCollection';
import { extractApkg, parseMediaManifest } from '../services/ApkgPreviewService/extractApkg';
import RequireAnkifyAccess from './middleware/RequireAnkifyAccess';

const buildNotionExportClient = (token: string) => {
  const notion = new NotionClient({ auth: token });
  const findFirstDataSourceId = async (
    databaseId: string
  ): Promise<string | null> => {
    const database = await notion.databases.retrieve({
      database_id: databaseId,
    });
    const dataSources =
      'data_sources' in database
        ? (database as { data_sources: { id: string }[] }).data_sources
        : [];
    return dataSources[0]?.id ?? null;
  };
  return {
    databases: {
      query: async (params: {
        database_id: string;
        filter: { property: string; date: { equals: string } };
      }) => {
        const dataSourceId = await findFirstDataSourceId(params.database_id);
        if (dataSourceId == null) {
          return { results: [] };
        }
        const res = await notion.dataSources.query({
          data_source_id: dataSourceId,
          filter: params.filter,
        });
        return { results: res.results };
      },
    },
    pages: {
      create: async (params: {
        parent: { database_id: string };
        properties: Record<string, unknown>;
      }) => {
        const databaseId = params.parent.database_id;
        const dataSourceId = await findFirstDataSourceId(databaseId);
        if (dataSourceId == null) {
          throw new Error(
            'No data source found for the selected Notion database'
          );
        }
        return notion.pages.create({
          parent: {
            type: 'data_source_id',
            data_source_id: dataSourceId,
          },
          properties: params.properties as Parameters<
            typeof notion.pages.create
          >[0]['properties'],
        });
      },
    },
    getSchema: async (databaseId: string) => {
      const dataSourceId = await findFirstDataSourceId(databaseId);
      if (dataSourceId == null) {
        return { properties: {} };
      }
      const dataSource = await notion.dataSources.retrieve({
        data_source_id: dataSourceId,
      });
      const properties =
        (dataSource as {
          properties?: Record<string, { type: string; name?: string }>;
        }).properties ?? {};
      return { properties };
    },
  };
};

const extractNotionPageTitle = (
  props: Record<string, unknown>
): string | null => {
  for (const value of Object.values(props)) {
    const entry = value as {
      type?: string;
      title?: { plain_text?: string }[];
    };
    if (entry.type === 'title' && Array.isArray(entry.title)) {
      const title = entry.title.map((t) => t.plain_text ?? '').join('').trim();
      return title.length === 0 ? null : title;
    }
  }
  return null;
};

type NotionPageIconBlock =
  | { type: 'emoji'; emoji: string }
  | { type: 'external'; external: { url: string } }
  | { type: 'file'; file: { url: string } }
  | null
  | undefined;

const extractNotionPageIcon = (icon: NotionPageIconBlock): string | null => {
  if (icon == null) return null;
  switch (icon.type) {
    case 'emoji':
      return icon.emoji;
    case 'external':
      return icon.external.url;
    case 'file':
      return icon.file.url;
    default:
      return null;
  }
};

const buildNotionPageMetaFetcher =
  (token: string) =>
  async (notionPageId: string) => {
    const notion = new NotionClient({ auth: token });
    const page = await notion.pages.retrieve({ page_id: notionPageId });
    const props = (page as { properties?: Record<string, unknown> })
      .properties ?? {};
    const title = extractNotionPageTitle(props);
    const url = (page as { url?: string }).url ?? null;
    const icon = extractNotionPageIcon(
      (page as { icon?: NotionPageIconBlock }).icon
    );
    return { title, url, icon };
  };

const buildNotionConflictResolver = (token: string) => {
  const notion = new NotionClient({ auth: token });
  return {
    updateBlockContent: async (
      blockId: string,
      payload: { front: string; back: string }
    ) => {
      await notion.blocks.update({
        block_id: blockId,
        toggle: {
          rich_text: [{ type: 'text', text: { content: payload.front } }],
        },
      });
      const children = await notion.blocks.children.list({
        block_id: blockId,
      });
      const firstParagraph = children.results.find(
        (b) => (b as { type: string }).type === 'paragraph'
      );
      if (firstParagraph != null) {
        await notion.blocks.update({
          block_id: (firstParagraph as { id: string }).id,
          paragraph: {
            rich_text: [{ type: 'text', text: { content: payload.back } }],
          },
        });
      }
    },
  };
};

type NotionDatabaseEntry = {
  id: string;
  title: string;
  url: string | null;
  has_review_shape: boolean;
  object: 'database' | 'data_source';
};

const collectNotionDatabaseEntries = (
  results: unknown[]
): NotionDatabaseEntry[] => {
  const entries: NotionDatabaseEntry[] = [];
  for (const entry of results) {
    const obj = (entry as { object?: string }).object;
    if (obj !== 'database' && obj !== 'data_source') {
      continue;
    }
    const titleArr = (entry as { title?: { plain_text?: string }[] }).title;
    const title =
      titleArr != null && titleArr.length > 0
        ? titleArr.map((t) => t.plain_text ?? '').join('')
        : '';
    const normalized = title.trim().toLowerCase();
    if (
      normalized.length === 0 ||
      normalized === 'untitled' ||
      normalized === 'untitled database'
    ) {
      continue;
    }
    const properties =
      (entry as { properties?: Record<string, { type: string }> }).properties ??
      {};
    const hasReviewShape =
      properties.Date?.type === 'date' &&
      properties.Reviews?.type === 'number';
    entries.push({
      id: (entry as { id: string }).id,
      title,
      url: (entry as { url?: string }).url ?? null,
      has_review_shape: hasReviewShape,
      object: obj,
    });
  }
  return entries;
};

const dedupeNotionDatabaseEntries = (
  raw: NotionDatabaseEntry[]
): NotionDatabaseEntry[] => {
  const byNormalizedTitle = new Map<string, NotionDatabaseEntry>();
  for (const entry of raw) {
    const key = entry.title.trim().toLowerCase();
    const existing = byNormalizedTitle.get(key);
    if (existing == null) {
      byNormalizedTitle.set(key, entry);
      continue;
    }
    if (existing.object === 'data_source' && entry.object === 'database') {
      byNormalizedTitle.set(key, entry);
    }
  }
  return Array.from(byNormalizedTitle.values());
};

const listNotionDatabasesViaSearch = async (token: string) => {
  const notion = new NotionClient({ auth: token });
  const response = await notion.search({ page_size: 100 });
  const raw = collectNotionDatabaseEntries(response.results);
  return dedupeNotionDatabaseEntries(raw).map((entry) => ({
    id: entry.id,
    title: entry.title,
    url: entry.url,
    has_review_shape: entry.has_review_shape,
  }));
};

const createReviewTrackerInNotion = async (
  token: string,
  input: { parentPageId: string; title: string }
) => {
  const notion = new NotionClient({ auth: token });
  const response = await notion.databases.create({
    parent: { type: 'page_id', page_id: input.parentPageId },
    title: [{ type: 'text', text: { content: input.title } }],
    initial_data_source: {
      properties: {
        Name: { title: {} },
        Date: { date: {} },
        Reviews: { number: { format: 'number' } },
        'Time spent': { number: { format: 'number' } },
      },
    },
  });
  return {
    id: (response as { id: string }).id,
    url: (response as { url?: string }).url ?? null,
    title: input.title,
  };
};

const AnkifyRouter = () => {
  const router = express.Router();
  const db = getDatabase();
  const repo = new AnkifyClientsRepository(db);
  const mappings = new AnkifySyncMappingsRepository(db);
  const uploads = new UploadRepository(db);
  const schedulesRepo = new AnkifyExportSchedulesRepository(db);
  const logsRepo = new AnkifySyncLogsRepository(db);
  const subscriptionsRepo = new AnkifyNotionSubscriptionsRepository(db);
  const conflictsRepo = new AnkifySyncConflictsRepository(db);
  const sessionTokensRepo = new AnkifySessionTokensRepository(db);
  const docker = new Docker();
  const rac = new RacService(repo, docker, sessionTokensRepo);
  const authService = new AuthenticationService(
    new TokenRepository(db),
    new UsersRepository(db)
  );
  const storage = new StorageHandler();

  const fetchApkgBytes = async (key: string): Promise<Buffer> => {
    const data = await storage.getFileContents(key);
    const body = data.Body;
    if (body == null) {
      throw new Error(`APKG body missing for key ${key}`);
    }
    return Buffer.isBuffer(body) ? body : Buffer.from(body as Uint8Array);
  };

  const syncNotionPageUseCase = new SyncNotionPageToRacUseCase(
    repo,
    mappings,
    conflictsRepo,
    subscriptionsRepo,
    logsRepo,
    new NotionRepository(db),
    ankiConnectFactory,
    notionBlockChildrenFetcherFactory,
    buildNotionPageMetaFetcher
  );

  const controller = new AnkifyController(
    new ProvisionAnkifyClientUseCase(rac),
    new ListAnkifyClientsUseCase(rac),
    new StopAnkifyClientUseCase(rac),
    new SendUploadToRacUseCase(
      repo,
      mappings,
      uploads,
      fetchApkgBytes,
      async (bytes) => {
        const archive = await extractApkg(bytes);
        return {
          collection: parseCollection(archive.collectionBuffer),
          mediaMap: parseMediaManifest(archive.mediaManifestRaw),
          mediaEntries: archive.mediaEntries,
        };
      },
      ankiConnectFactory,
      logsRepo
    ),
    new RespinAnkifyClientUseCase(rac),
    new ExportReviewDataToNotionUseCase(
      repo,
      new NotionRepository(db),
      ankiConnectFactory,
      buildNotionExportClient
    ),
    new ConfigureExportScheduleUseCase(schedulesRepo, getAnkifyExportScheduler),
    new GetExportScheduleUseCase(schedulesRepo),
    new DeleteExportScheduleUseCase(schedulesRepo, getAnkifyExportScheduler),
    new ListSyncLogsUseCase(logsRepo),
    syncNotionPageUseCase,
    new ListNotionSubscriptionsUseCase(subscriptionsRepo),
    new DeleteNotionSubscriptionUseCase(subscriptionsRepo),
    new RefreshAnkifySubscriptionUseCase(
      subscriptionsRepo,
      syncNotionPageUseCase
    ),
    new ListConflictsUseCase(conflictsRepo),
    new ResolveConflictUseCase(
      repo,
      mappings,
      conflictsRepo,
      logsRepo,
      new NotionRepository(db),
      ankiConnectFactory,
      buildNotionConflictResolver
    ),
    new ListNotionDatabasesUseCase(new NotionRepository(db), {
      listDatabases: listNotionDatabasesViaSearch,
    }),
    new CreateReviewTrackerDatabaseUseCase(new NotionRepository(db), {
      createReviewTracker: createReviewTrackerInNotion,
    }),
    new CheckActiveClientReadinessUseCase(repo, ankiConnectFactory),
    new CheckAnkiWebStatusUseCase(repo, ankiConnectFactory),
    new ReissueAnkifySessionUrlUseCase(rac),
    new ValidateAnkifySessionTokenUseCase(rac, authService)
  );

  /**
   * @swagger
   * /api/ankify/clients:
   *   get:
   *     summary: List the requesting user's hosted Anki clients
   *     description: Allowlisted endpoint. Returns active and inactive Remote Anki Client records belonging to the authenticated user.
   *     tags: [Ankify]
   *     responses:
   *       200:
   *         description: Clients listed
   *       401:
   *         description: Authentication required
   *       403:
   *         description: User is not on the ankify allowlist
   */
  router.get('/api/ankify/clients', RequireAnkifyAccess, (req, res) =>
    controller.list(req, res)
  );

  /**
   * @swagger
   * /api/ankify/clients:
   *   post:
   *     summary: Provision a new hosted Anki client
   *     description: Allowlisted endpoint. Allocates host ports and starts a remote-anki-client container for the authenticated user.
   *     tags: [Ankify]
   *     responses:
   *       201:
   *         description: Client provisioned
   *       401:
   *         description: Authentication required
   *       403:
   *         description: User is not on the ankify allowlist
   *       503:
   *         description: Docker daemon unavailable or no available host ports
   */
  router.post('/api/ankify/clients', RequireAnkifyAccess, (req, res) =>
    controller.provision(req, res)
  );

  /**
   * @swagger
   * /api/ankify/clients/{id}:
   *   delete:
   *     summary: Stop and clean up a hosted Anki client
   *     description: Allowlisted endpoint. Stops the underlying container and marks the client inactive.
   *     tags: [Ankify]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Client stopped
   *       400:
   *         description: Invalid client id
   *       401:
   *         description: Authentication required
   *       403:
   *         description: User is not on the ankify allowlist
   */
  router.delete('/api/ankify/clients/:id', RequireAnkifyAccess, (req, res) =>
    controller.stop(req, res)
  );

  /**
   * @swagger
   * /api/ankify/dispatch:
   *   post:
   *     summary: Send an existing APKG upload to the user's hosted Anki client
   *     description: Allowlisted endpoint. Reads the upload's APKG, parses notes, and dispatches them via AnkiConnect into the active Ankify client. Idempotent — a second call updates rather than duplicates, keyed off ankify_sync_mappings.
   *     tags: [Ankify]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [upload_id]
   *             properties:
   *               upload_id:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Dispatched
   *       400:
   *         description: Missing or invalid upload_id
   *       404:
   *         description: Upload not found for this user
   *       409:
   *         description: No active Ankify client
   *       503:
   *         description: AnkiConnect unreachable
   */
  router.post('/api/ankify/dispatch', RequireAnkifyAccess, (req, res) =>
    controller.sendUpload(req, res)
  );

  /**
   * @swagger
   * /api/ankify/clients/respin:
   *   post:
   *     summary: Stop the active hosted Anki container and start a fresh one
   *     description: Allowlisted endpoint. The named volume backing the user's collection is preserved, so the new container has the same data.
   *     tags: [Ankify]
   *     responses:
   *       200:
   *         description: Respun
   *       503:
   *         description: Docker daemon unavailable or no available host ports
   */
  router.post('/api/ankify/clients/respin', RequireAnkifyAccess, (req, res) =>
    controller.respin(req, res)
  );

  /**
   * @swagger
   * /api/ankify/clients/{id}/reissue-session:
   *   post:
   *     summary: Mint a fresh session URL
   *     description: Allowlisted endpoint. Returns the active client with a fresh session_url containing a new 256-bit token. Prior tokens for the same client remain valid until their natural 8h TTL — open noVNC tabs survive a reissue. Tokens are revoked when the client is stopped or respun.
   *     tags: [Ankify]
   */
  router.post(
    '/api/ankify/clients/:id/reissue-session',
    RequireAnkifyAccess,
    (req, res) => controller.reissueSessionUrl(req, res)
  );

  /**
   * @swagger
   * /api/ankify/sessions/validate:
   *   post:
   *     summary: Token+cookie session validation called by the reverse proxy
   *     description: Internal endpoint called by Caddy/Traefik forward_auth on each request to /v/<token>/. Validates the URL token, the 2anki session cookie, and the allowlist. On success, sets X-Backend-Port and responds 200.
   *     tags: [Ankify]
   */
  router.post('/api/ankify/sessions/validate', (req, res) =>
    controller.validateSession(req, res)
  );

  /**
   * @swagger
   * /api/ankify/exports/review-data:
   *   post:
   *     summary: Export Anki review counts into a Notion database
   *     description: Allowlisted endpoint. Pulls the per-day review history from the active hosted Anki via AnkiConnect and writes one row per day into the user-supplied Notion database (skipping dates already present).
   *     tags: [Ankify]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [database_id]
   *             properties:
   *               database_id:
   *                 type: string
   *               date_range_days:
   *                 type: integer
   *                 description: Restrict to the trailing N days of history.
   *     responses:
   *       200:
   *         description: Export summary
   *       409:
   *         description: No active Ankify client or Notion not connected
   *       503:
   *         description: AnkiConnect unreachable
   */
  router.post(
    '/api/ankify/exports/review-data',
    RequireAnkifyAccess,
    (req, res) => controller.exportReviewData(req, res)
  );

  /**
   * @swagger
   * /api/ankify/exports/schedule:
   *   get:
   *     summary: Read the user's daily review-export schedule
   *     tags: [Ankify]
   *   post:
   *     summary: Create or update the user's daily review-export schedule
   *     description: Allowlisted endpoint. Schedules a daily run at the supplied IANA timezone-local time.
   *     tags: [Ankify]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [database_id, time_of_day, timezone]
   *             properties:
   *               database_id:
   *                 type: string
   *               time_of_day:
   *                 type: string
   *                 example: "09:00"
   *               timezone:
   *                 type: string
   *                 example: "Europe/Oslo"
   *               date_range_days:
   *                 type: integer
   *               enabled:
   *                 type: boolean
   *   delete:
   *     summary: Cancel and remove the user's daily review-export schedule
   *     tags: [Ankify]
   */
  router.get(
    '/api/ankify/exports/schedule',
    RequireAnkifyAccess,
    (req, res) => controller.getSchedule(req, res)
  );
  router.post(
    '/api/ankify/exports/schedule',
    RequireAnkifyAccess,
    (req, res) => controller.configureSchedule(req, res)
  );
  router.delete(
    '/api/ankify/exports/schedule',
    RequireAnkifyAccess,
    (req, res) => controller.deleteSchedule(req, res)
  );

  /**
   * @swagger
   * /api/ankify/sync-logs:
   *   get:
   *     summary: Recent ankify sync events for the user (newest first)
   *     description: Allowlisted endpoint. Optional query params `limit` (default 100) and `status` (success|error|info).
   *     tags: [Ankify]
   */
  router.get('/api/ankify/sync-logs', RequireAnkifyAccess, (req, res) =>
    controller.listSyncLogs(req, res)
  );

  /**
   * @swagger
   * /api/ankify/subscriptions:
   *   get:
   *     summary: List Notion pages auto-synced into the user's hosted Anki
   *     tags: [Ankify]
   *   post:
   *     summary: Subscribe a Notion page (kicks off an immediate sync)
   *     tags: [Ankify]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [notion_page_id]
   *             properties:
   *               notion_page_id:
   *                 type: string
   */
  router.get('/api/ankify/subscriptions', RequireAnkifyAccess, (req, res) =>
    controller.listSubscriptions(req, res)
  );
  router.post('/api/ankify/subscriptions', RequireAnkifyAccess, (req, res) =>
    controller.subscribeNotionPage(req, res)
  );
  router.delete(
    '/api/ankify/subscriptions/:id',
    RequireAnkifyAccess,
    (req, res) => controller.deleteSubscription(req, res)
  );

  /**
   * @swagger
   * /api/ankify/subscriptions/{id}/refresh:
   *   post:
   *     summary: Manually pull a subscribed Notion page right now
   *     description: Allowlisted endpoint. Re-runs the Notion → hosted Anki pull for the given subscription, bypassing the 5-minute polling cycle. Per-subscription 30-second cooldown enforced server-side; returns 429 with Retry-After when on cooldown.
   *     tags: [Ankify]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Refresh result (created/updated/conflicts/unchanged)
   *       400:
   *         description: Invalid subscription id
   *       404:
   *         description: Subscription not found for this user
   *       409:
   *         description: No active Ankify client or Notion not connected
   *       429:
   *         description: Cooldown — wait Retry-After seconds and try again
   *       503:
   *         description: AnkiConnect unreachable
   */
  router.post(
    '/api/ankify/subscriptions/:id/refresh',
    RequireAnkifyAccess,
    (req, res) => controller.refreshSubscription(req, res)
  );

  /**
   * @swagger
   * /api/ankify/conflicts:
   *   get:
   *     summary: List sync conflicts (pending by default)
   *     tags: [Ankify]
   * /api/ankify/conflicts/{id}/resolve:
   *   post:
   *     summary: Resolve a conflict
   *     tags: [Ankify]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [resolution]
   *             properties:
   *               resolution:
   *                 type: string
   *                 enum: [keep_notion, keep_anki, dismissed]
   */
  router.get('/api/ankify/conflicts', RequireAnkifyAccess, (req, res) =>
    controller.listConflicts(req, res)
  );
  router.post(
    '/api/ankify/conflicts/:id/resolve',
    RequireAnkifyAccess,
    (req, res) => controller.resolveConflict(req, res)
  );

  /**
   * @swagger
   * /api/ankify/notion/databases:
   *   get:
   *     summary: List the user's Notion databases
   *     description: Allowlisted endpoint. Returns each database with a `has_review_shape` flag (true when it already has Date + Reviews properties suitable for the review export).
   *     tags: [Ankify]
   *   post:
   *     summary: Create a new "Anki review tracker" Notion database under a parent page
   *     description: Allowlisted endpoint. Creates a database with Date (date) and Reviews (number) properties, ready to use as the review-export target.
   *     tags: [Ankify]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [parent_page_id]
   *             properties:
   *               parent_page_id:
   *                 type: string
   *               title:
   *                 type: string
   */
  router.get(
    '/api/ankify/notion/databases',
    RequireAnkifyAccess,
    (req, res) => controller.listNotionDatabases(req, res)
  );
  router.post(
    '/api/ankify/notion/databases',
    RequireAnkifyAccess,
    (req, res) => controller.createReviewTracker(req, res)
  );

  /**
   * @swagger
   * /api/ankify/clients/active/ready:
   *   get:
   *     summary: Probe whether the active hosted Anki container is reachable
   *     description: Allowlisted endpoint. Returns { ready, reason? } where ready is true if AnkiConnect responds inside the container. Used by the UI to show a skeleton while a freshly-provisioned container is still booting.
   *     tags: [Ankify]
   */
  router.get(
    '/api/ankify/clients/active/ready',
    RequireAnkifyAccess,
    (req, res) => controller.checkActiveClientReady(req, res)
  );

  /**
   * @swagger
   * /api/ankify/clients/active/anki-web-status:
   *   get:
   *     summary: Probe whether the active hosted Anki is signed in to AnkiWeb
   *     description: Allowlisted endpoint. Triggers ac.sync() and reports status as 'linked' (signed in and sync succeeded), 'unlinked' (sign-in needed), 'unreachable' (AnkiConnect down), 'error' (other), or 'no_active_client'.
   *     tags: [Ankify]
   */
  router.get(
    '/api/ankify/clients/active/anki-web-status',
    RequireAnkifyAccess,
    (req, res) => controller.checkAnkiWebStatus(req, res)
  );

  return router;
};

export default AnkifyRouter;
