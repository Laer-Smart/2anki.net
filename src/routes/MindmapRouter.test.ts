import express from 'express';
import http from 'node:http';
import { AddressInfo } from 'node:net';

const mockCreate = jest.fn();
const mockList = jest.fn();
const mockDelete = jest.fn();
const mockExport = jest.fn();
const mockGetById = jest.fn();
const mockUpdate = jest.fn();
const mockCount = jest.fn();

jest.mock('../data_layer', () => ({
  getDatabase: jest.fn().mockReturnValue({}),
}));

jest.mock('../data_layer/MindmapRepository', () => ({
  MindmapRepository: jest.fn().mockImplementation(() => ({
    create: mockCreate,
    findById: mockGetById,
    findByUserId: mockList,
    update: mockUpdate,
    delete: mockDelete,
    countByUserId: mockCount,
  })),
}));

jest.mock('./middleware/RequireAuthentication', () => {
  const middleware = (
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    res.locals.owner = 42;
    res.locals.patreon = null;
    res.locals.subscriptionInfo = [];
    next();
  };
  return middleware;
});

process.env.SKIP_CREATE_DECK = '1';

async function buildServer() {
  const { default: MindmapRouter } = await import('./MindmapRouter');
  const app = express();
  app.use(express.json());
  app.use(MindmapRouter());
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}` };
}

describe('MindmapRouter', () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    ({ server, url } = await buildServer());
  });

  afterAll(() => server.close());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/mindmaps', () => {
    it('creates a map and returns 201', async () => {
      const map = {
        id: 'uuid-1',
        user_id: 42,
        title: 'My map',
        data: { nodes: [], edges: [] },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockCreate.mockResolvedValue(map);
      mockCount.mockResolvedValue(0);

      const res = await fetch(`${url}/api/mindmaps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'My map' }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBe('uuid-1');
    });

    it('returns 402 when free user is at cap', async () => {
      mockCount.mockResolvedValue(3);

      const res = await fetch(`${url}/api/mindmaps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Overflow' }),
      });

      expect(res.status).toBe(402);
    });
  });

  describe('GET /api/mindmaps', () => {
    it('returns list with access block', async () => {
      const maps = [
        {
          id: 'a',
          user_id: 42,
          title: 'Map A',
          data: { nodes: [], edges: [] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      mockList.mockResolvedValue(maps);
      mockCount.mockResolvedValue(1);

      const res = await fetch(`${url}/api/mindmaps`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.maps).toHaveLength(1);
      expect(body.access).toMatchObject({
        freeMapLimit: 3,
        maxNodesPerMap: 50,
        currentCount: 1,
      });
    });
  });

  describe('DELETE /api/mindmaps/:id', () => {
    it('deletes and returns 204', async () => {
      mockDelete.mockResolvedValue(undefined);

      const res = await fetch(`${url}/api/mindmaps/uuid-1`, { method: 'DELETE' });
      expect(res.status).toBe(204);
      expect(mockDelete).toHaveBeenCalledWith('uuid-1', 42);
    });
  });

  describe('POST /api/mindmaps/:id/export', () => {
    const baseMap = {
      id: 'export-id',
      user_id: 42,
      title: 'Test deck',
      data: {
        nodes: [
          { id: '1', label: 'Parent' },
          { id: '2', label: 'Child' },
        ],
        edges: [{ source: '1', target: '2' }],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('returns application/octet-stream', async () => {
      mockGetById.mockResolvedValue(baseMap);

      const res = await fetch(`${url}/api/mindmaps/export-id/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck_name: 'Test deck' }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/octet-stream');
    });

    it('defaults to cloze card type when card_type is omitted', async () => {
      mockGetById.mockResolvedValue(baseMap);

      const res = await fetch(`${url}/api/mindmaps/export-id/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck_name: 'Test deck' }),
      });

      expect(res.status).toBe(200);
    });

    it('accepts card_type basic and returns a deck', async () => {
      mockGetById.mockResolvedValue(baseMap);

      const res = await fetch(`${url}/api/mindmaps/export-id/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck_name: 'Test deck', card_type: 'basic' }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/octet-stream');
    });

    it('treats unknown card_type as cloze', async () => {
      mockGetById.mockResolvedValue(baseMap);

      const res = await fetch(`${url}/api/mindmaps/export-id/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck_name: 'Test deck', card_type: 'unknown' }),
      });

      expect(res.status).toBe(200);
    });
  });
});
