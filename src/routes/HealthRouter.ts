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

  router.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? 'unknown',
    });
  });

  router.get('/api/health/db', async (_req, res) => {
    try {
      await database.raw('select 1');
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

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
