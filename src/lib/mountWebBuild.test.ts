import express from 'express';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';

import { INDEX_HTML_CACHE_CONTROL, mountWebBuild } from './mountWebBuild';

describe('mountWebBuild', () => {
  let buildDir: string;
  let server: http.Server;
  let baseUrl: string;

  beforeAll((done) => {
    buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-build-'));
    fs.writeFileSync(path.join(buildDir, 'index.html'), '<html>app</html>');
    fs.mkdirSync(path.join(buildDir, 'assets'));
    fs.writeFileSync(path.join(buildDir, 'assets', 'app-abc123.css'), 'body{}');

    const app = express();
    mountWebBuild(app, buildDir);
    server = app.listen(0, () => {
      const address = server.address();
      if (address == null || typeof address === 'string') {
        done(new Error('expected an ephemeral port'));
        return;
      }
      baseUrl = `http://127.0.0.1:${address.port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(() => {
      fs.rmSync(buildDir, { recursive: true, force: true });
      done();
    });
  });

  it('serves / with the no-cache header so clients revalidate the shell', async () => {
    const response = await fetch(`${baseUrl}/`);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(
      INDEX_HTML_CACHE_CONTROL
    );
  });

  it('serves /index.html with the no-cache header', async () => {
    const response = await fetch(`${baseUrl}/index.html`);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(
      INDEX_HTML_CACHE_CONTROL
    );
  });

  it('keeps hashed assets immutable for a year', async () => {
    const response = await fetch(`${baseUrl}/assets/app-abc123.css`);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable'
    );
  });
});
