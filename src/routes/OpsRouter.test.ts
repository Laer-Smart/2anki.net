import express from 'express';
import http from 'node:http';
import { AddressInfo } from 'node:net';

jest.mock('../lib/integrations/stripe', () => ({
  getStripe: jest.fn(),
}));

jest.mock('../data_layer', () => ({
  getDatabase: jest.fn(() => ({
    raw: jest.fn(),
  })),
}));

jest.mock('./middleware/RequireOpsAccess', () => {
  const state = (globalThis as unknown as {
    __opsAccessState?: { allow: boolean };
  });
  if (state.__opsAccessState == null) {
    state.__opsAccessState = { allow: false };
  }
  const sharedState = state.__opsAccessState;
  return {
    __esModule: true,
    default: (
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (!sharedState.allow) {
        res.status(404).end();
        return;
      }
      next();
    },
    makeRequireOpsAccess: jest.fn(),
  };
});

jest.mock('../services/ops/BusinessMetricsService', () => {
  return {
    BusinessMetricsService: class {
      async getMetrics() {
        return {
          mrr_usd: 4820,
          net_new_mrr_mtd_usd: 312,
          active_paying_subs: 184,
          churn_30d_pct: 2.1,
          failed_payments_7d: 4,
          new_paid_conversions_7d: 11,
          as_of: '2026-05-09T14:32:07.000Z',
          cache_age_seconds: 0,
        };
      }
    },
  };
});

jest.mock('../services/ops/ConversionMetricsService', () => {
  return {
    ConversionMetricsService: class {
      async getMetrics() {
        return {
          free_conversions_7d: 342,
          paid_conversions_7d: 89,
          free_conversion_success_rate_7d: 87.5,
          paid_conversion_success_rate_7d: 94.2,
          conversion_errors_7d_top_reasons: [
            { reason: 'Empty page', count: 12 },
            { reason: 'Network timeout', count: 5 },
          ],
          failed_conversions_weekly: [
            { week: '2026-05-04', count: 3 },
            { week: '2026-05-11', count: 8 },
          ],
        };
      }
    },
  };
});

jest.mock('../lib/storage/StorageHandler', () => {
  return {
    __esModule: true,
    default: class {
      listMindmapObjects() {
        return Promise.resolve([]);
      }
    },
  };
});

import OpsRouter from './OpsRouter';

const opsAccessState = (globalThis as unknown as {
  __opsAccessState: { allow: boolean };
}).__opsAccessState;

const setOwnerAccess = (allow: boolean) => {
  opsAccessState.allow = allow;
};

const startServer = async (allowOps: boolean = false) => {
  setOwnerAccess(allowOps);
  const app = express();
  app.use(OpsRouter());
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
};

describe('OpsRouter /api/ops/business/metrics', () => {
  it('returns 404 for non-owner callers', async () => {
    const { url, close } = await startServer(false);
    try {
      const response = await fetch(`${url}/api/ops/business/metrics`);
      expect(response.status).toBe(404);
    } finally {
      await close();
    }
  });

  it('returns 200 with the business metrics shape for the ops owner', async () => {
    const { url, close } = await startServer(true);
    try {
      const response = await fetch(`${url}/api/ops/business/metrics`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(
        expect.objectContaining({
          mrr_usd: expect.any(Number),
          net_new_mrr_mtd_usd: expect.any(Number),
          active_paying_subs: expect.any(Number),
          churn_30d_pct: expect.any(Number),
          failed_payments_7d: expect.any(Number),
          new_paid_conversions_7d: expect.any(Number),
          as_of: expect.any(String),
          cache_age_seconds: expect.any(Number),
        })
      );
    } finally {
      await close();
    }
  });
});

describe('OpsRouter /api/ops/conversion/metrics', () => {
  it('returns 404 for non-owner callers', async () => {
    const { url, close } = await startServer(false);
    try {
      const response = await fetch(`${url}/api/ops/conversion/metrics`);
      expect(response.status).toBe(404);
    } finally {
      await close();
    }
  });

  it('returns 200 with the conversion metrics shape for the ops owner', async () => {
    const { url, close } = await startServer(true);
    try {
      const response = await fetch(`${url}/api/ops/conversion/metrics`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(
        expect.objectContaining({
          free_conversions_7d: expect.any(Number),
          paid_conversions_7d: expect.any(Number),
          free_conversion_success_rate_7d: expect.any(Number),
          paid_conversion_success_rate_7d: expect.any(Number),
          conversion_errors_7d_top_reasons: expect.any(Array),
          failed_conversions_weekly: expect.any(Array),
        })
      );
    } finally {
      await close();
    }
  });
});
