import express from 'express';
import fs from 'fs';
import path from 'path';
import type { Knex } from 'knex';
import { notionCallRingBuffer } from '../services/NotionService/NotionCallRingBuffer';
import { getLastStripeWebhookAt } from '../services/stripeWebhookTimestamp';

interface IncidentEntry {
  id: string;
  start: string;
  end: string | null;
  summary: string;
}

function loadIncidents(): IncidentEntry[] {
  try {
    const filePath = path.resolve(__dirname, '../../incidents.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as IncidentEntry[]).slice(0, 3);
  } catch {
    return [];
  }
}

const HealthRouter = (database: Knex) => {
  const router = express.Router();

  /**
   * @swagger
   * /api/health:
   *   get:
   *     summary: Process health
   *     description: Returns process uptime and version. Always 200.
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Process is up
   */
  router.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? 'unknown',
    });
  });

  /**
   * @swagger
   * /api/health/db:
   *   get:
   *     summary: Database health
   *     description: Returns 200 when the database responds to a probe query, 503 otherwise.
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Database is reachable
   *       503:
   *         description: Database is unreachable
   */
  router.get('/api/health/db', async (_req, res) => {
    try {
      await database.raw('select 1');
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  /**
   * @swagger
   * /api/status:
   *   get:
   *     summary: Public status snapshot
   *     description: Aggregated signals for the public status page (api, db, Notion, Stripe, last deploy, recent incidents).
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Status snapshot
   */
  router.get('/api/status', async (_req, res) => {
    const dbOk = await database.raw('select 1').then(() => true).catch(() => false);
    const notionLastCallAt = notionCallRingBuffer.lastSuccessAt();
    const stripeLastWebhookAt = getLastStripeWebhookAt();
    const incidents = loadIncidents();

    res.json({
      api: { ok: true },
      db: { ok: dbOk },
      notion: {
        ok: notionLastCallAt != null,
        lastSuccessAt: notionLastCallAt,
      },
      stripe: {
        lastWebhookAt: stripeLastWebhookAt,
      },
      lastDeploy: {
        sha: process.env.DEPLOY_SHA ?? null,
        time: process.env.DEPLOY_TIME ?? null,
      },
      incidents,
    });
  });

  return router;
};

export default HealthRouter;
