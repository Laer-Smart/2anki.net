import express from 'express';
import http from 'http';
import { denyFraming } from './denyFraming';

interface AddressWithPort {
  port: number;
}

async function fetchLoginHeaders(
  buildApp: () => express.Express
): Promise<Headers> {
  const app = buildApp();
  const server = http.createServer(app).listen(0);
  try {
    const port = (server.address() as AddressWithPort).port;
    const res = await fetch(`http://127.0.0.1:${port}/login`);
    return res.headers;
  } finally {
    server.close();
  }
}

describe('denyFraming wire-up', () => {
  it('sets headers on routes that respond inside earlier routers when denyFraming is mounted first', async () => {
    const headers = await fetchLoginHeaders(() => {
      const app = express();
      app.use(denyFraming);
      app.get('/login', (_req, res) => res.send('<html>spa</html>'));
      return app;
    });

    expect(headers.get('x-frame-options')).toBe('DENY');
    expect(headers.get('content-security-policy')).toBe(
      "frame-ancestors 'none'"
    );
  });

  it('does NOT set headers when denyFraming is mounted after the responding route (regression guard)', async () => {
    const headers = await fetchLoginHeaders(() => {
      const app = express();
      app.get('/login', (_req, res) => res.send('<html>spa</html>'));
      app.use(denyFraming);
      return app;
    });

    expect(headers.get('x-frame-options')).toBeNull();
    expect(headers.get('content-security-policy')).toBeNull();
  });
});
