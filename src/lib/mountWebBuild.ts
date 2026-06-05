import express from 'express';
import http from 'http';
import path from 'path';

export const INDEX_HTML_CACHE_CONTROL = 'no-cache, must-revalidate';

const revalidateIndexHtml = (res: http.ServerResponse, filePath: string) => {
  if (path.basename(filePath) === 'index.html') {
    res.setHeader('Cache-Control', INDEX_HTML_CACHE_CONTROL);
  }
};

export const mountWebBuild = (app: express.Express, buildDir: string) => {
  app.use(
    '/assets',
    express.static(path.join(buildDir, 'assets'), {
      immutable: true,
      maxAge: '1y',
    })
  );
  app.use(express.static(buildDir, { setHeaders: revalidateIndexHtml }));
};
