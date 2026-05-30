import express from 'express';
import http from 'node:http';
import { AddressInfo } from 'node:net';

let mockAuthOwner: number | null = 42;

jest.mock('./middleware/RequireAuthentication', () => {
  const middleware = (
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (mockAuthOwner == null) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    res.locals.owner = mockAuthOwner;
    next();
  };
  return { __esModule: true, default: middleware };
});

jest.mock('./middleware/normalizeUploadFilenames', () => ({
  normalizeUploadFilenames: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction
  ) => next(),
}));

const mockTransform = jest.fn();

jest.mock('../controllers/TransformController', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ transform: mockTransform })),
}));

jest.mock('../usecases/ankify/TransformApkgUseCase', () => ({
  TransformApkgUseCase: jest.fn().mockImplementation(() => ({})),
}));

import TransformRouter from './TransformRouter';

const startServer = async () => {
  const app = express();
  app.use(TransformRouter());
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};

const postUpload = async (
  url: string,
  payload: { filename?: string; bytes?: Buffer; field?: string } = {}
) => {
  const filename = payload.filename ?? 'deck.apkg';
  const bytes = payload.bytes ?? Buffer.from('apkg-bytes');
  const field = payload.field ?? 'file';
  const boundary = '----TransformRouterTest';
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`
    ),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return fetch(`${url}/api/transform/upload`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
};

describe('TransformRouter POST /api/transform/upload', () => {
  beforeEach(() => {
    mockAuthOwner = 42;
    mockTransform.mockReset();
    mockTransform.mockImplementation(
      (_req: express.Request, res: express.Response) => {
        res.status(202).json({ ok: true });
      }
    );
  });

  it('rejects unauthenticated requests with 401', async () => {
    mockAuthOwner = null;
    const { url, close } = await startServer();
    try {
      const res = await postUpload(url);
      expect(res.status).toBe(401);
      expect(mockTransform).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it('forwards an authenticated upload to the controller transform method', async () => {
    const { url, close } = await startServer();
    try {
      const res = await postUpload(url);
      expect(res.status).toBe(202);
      expect(mockTransform).toHaveBeenCalledTimes(1);
      const reqArg = mockTransform.mock.calls[0][0] as express.Request & {
        files?: Array<{ originalname: string }>;
      };
      expect(reqArg.files?.[0]?.originalname).toBe('deck.apkg');
    } finally {
      await close();
    }
  });

  it('does not register any GET handler on the transform path', async () => {
    const { url, close } = await startServer();
    try {
      const res = await fetch(`${url}/api/transform/upload`);
      expect(res.status).toBe(404);
      expect(mockTransform).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });
});
