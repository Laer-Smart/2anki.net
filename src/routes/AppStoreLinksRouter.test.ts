import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

async function buildServer() {
  const { default: AppStoreLinksRouter } =
    await import('./AppStoreLinksRouter');
  const app = express();
  app.use(AppStoreLinksRouter());
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}` };
}

describe('GET /api/app-store', () => {
  const original = process.env.APPLE_IAP_APP_APPLE_ID;

  afterEach(() => {
    process.env.APPLE_IAP_APP_APPLE_ID = original;
  });

  it('returns the iOS and Mac product URLs when the Apple ID is set', async () => {
    process.env.APPLE_IAP_APP_APPLE_ID = '1234567890';
    const { server, url } = await buildServer();
    try {
      const res = await fetch(`${url}/api/app-store`);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body).toEqual({
        available: true,
        iosUrl: 'https://apps.apple.com/app/id1234567890',
        macUrl: 'https://apps.apple.com/app/id1234567890?mt=12',
      });
    } finally {
      server.close();
    }
  });

  it('falls back to the default Apple ID when the env var is unset', async () => {
    delete process.env.APPLE_IAP_APP_APPLE_ID;
    const { server, url } = await buildServer();
    try {
      const res = await fetch(`${url}/api/app-store`);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.available).toBe(true);
      expect(body.iosUrl).toMatch(/^https:\/\/apps\.apple\.com\/app\/id\d+$/);
    } finally {
      server.close();
    }
  });
});
