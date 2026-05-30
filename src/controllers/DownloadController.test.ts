import DownloadController from './DownloadController';
import { Request, Response } from 'express';
import { Writable } from 'stream';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { track } from '../services/events/track';

jest.mock('../services/events/track', () => ({ track: jest.fn() }));

const trackMock = track as jest.Mock;

beforeEach(() => {
  trackMock.mockClear();
});

function mockResponse(): Response {
  const headers: Record<string, string> = {};
  const res = {
    locals: { owner: 'test-owner' },
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    send: jest.fn(),
    status: jest.fn().mockReturnThis(),
    redirect: jest.fn(),
    _headers: headers,
  } as unknown as Response;
  return res;
}

function makeService(overrides: Record<string, unknown> = {}) {
  return {
    isValidKey: () => true,
    getFileBody: jest.fn().mockResolvedValue(Buffer.from('fake-apkg')),
    getFilename: jest.fn().mockResolvedValue(null),
    isMissingDownloadError: () => false,
    deleteMissingFile: jest.fn(),
    ...overrides,
  };
}

describe('DownloadController.getFile', () => {
  it('sets Content-Type and Content-Disposition headers for .apkg files', async () => {
    const controller = new DownloadController(makeService() as any);
    const req = { params: { key: '123-deck.apkg' } } as unknown as Request;
    const res = mockResponse();

    await controller.getFile(req, res, {} as any);

    expect(res.send).toHaveBeenCalledWith(Buffer.from('fake-apkg'));
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/octet-stream'
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      "attachment; filename=\"123-deck.apkg\"; filename*=UTF-8''123-deck.apkg"
    );
  });

  it('appends .apkg extension when key lacks it', async () => {
    const controller = new DownloadController(makeService() as any);
    const req = { params: { key: '123-deck' } } as unknown as Request;
    const res = mockResponse();

    await controller.getFile(req, res, {} as any);

    expect(res.send).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      "attachment; filename=\"123-deck.apkg\"; filename*=UTF-8''123-deck.apkg"
    );
  });

  it('uses the friendly deck name from DB when available', async () => {
    const controller = new DownloadController(
      makeService({ getFilename: jest.fn().mockResolvedValue('My Custom Deck') }) as any
    );
    const req = { params: { key: 'owner-1234-uuid.apkg' } } as unknown as Request;
    const res = mockResponse();

    await controller.getFile(req, res, {} as any);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      "attachment; filename=\"My Custom Deck.apkg\"; filename*=UTF-8''My%20Custom%20Deck.apkg"
    );
  });

  it('falls back to the page-title slug when no custom name and no DB name', async () => {
    const controller = new DownloadController(makeService() as any);
    const req = { params: { key: 'owner-1234-uuid.apkg' } } as unknown as Request;
    const res = mockResponse();

    await controller.getFile(req, res, {} as any);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      "attachment; filename=\"owner-1234-uuid.apkg\"; filename*=UTF-8''owner-1234-uuid.apkg"
    );
  });
});

describe('DownloadController.getBulkDownload', () => {
  let workspaceBase: string;
  let originalWorkspaceBase: string | undefined;

  beforeEach(() => {
    workspaceBase = fs.mkdtempSync(path.join(os.tmpdir(), 'bulk-test-'));
    originalWorkspaceBase = process.env.WORKSPACE_BASE;
    process.env.WORKSPACE_BASE = workspaceBase;
  });

  afterEach(() => {
    fs.rmSync(workspaceBase, { recursive: true, force: true });
    if (originalWorkspaceBase === undefined) {
      delete process.env.WORKSPACE_BASE;
    } else {
      process.env.WORKSPACE_BASE = originalWorkspaceBase;
    }
  });

  function streamingResponse(): { res: Response; chunks: Buffer[]; done: Promise<void> } {
    const chunks: Buffer[] = [];
    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });

    const sink = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        cb();
      },
    });
    sink.on('finish', () => resolveDone());

    const res = Object.assign(sink, {
      headersSent: false,
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    }) as unknown as Response;

    return { res, chunks, done };
  }

  it('streams a zip archive of the .apkg files in the workspace', async () => {
    const id = 'workspace-with-decks';
    const workspace = path.join(workspaceBase, id);
    fs.mkdirSync(workspace);
    fs.writeFileSync(path.join(workspace, 'deck-one.apkg'), 'fake-apkg-one');
    fs.writeFileSync(path.join(workspace, 'deck-two.apkg'), 'fake-apkg-two');

    const controller = new DownloadController(makeService() as any);
    const req = { params: { id } } as unknown as Request;
    const { res, chunks, done } = streamingResponse();

    controller.getBulkDownload(req, res);
    await done;

    expect((res.status as jest.Mock)).not.toHaveBeenCalledWith(500);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
    expect(chunks.length).toBeGreaterThan(0);
    expect(Buffer.concat(chunks).subarray(0, 2).toString()).toBe('PK');
  });

  it('fires deck_downloaded once with bulk:true and file_count', async () => {
    const id = 'bulk-event-workspace';
    const workspace = path.join(workspaceBase, id);
    fs.mkdirSync(workspace);
    fs.writeFileSync(path.join(workspace, 'one.apkg'), 'a');
    fs.writeFileSync(path.join(workspace, 'two.apkg'), 'b');
    fs.writeFileSync(path.join(workspace, 'three.apkg'), 'c');

    const controller = new DownloadController(makeService() as any);
    const req = { params: { id } } as unknown as Request;
    const { res, done } = streamingResponse();

    controller.getBulkDownload(req, res);
    await done;

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('deck_downloaded', {
      userId: null,
      anonymousId: null,
      props: { workspace_id: id, bulk: true, file_count: 3 },
    });
  });

  it('does not fire deck_downloaded when the workspace has no .apkg files', async () => {
    const id = 'bulk-empty-workspace';
    const workspace = path.join(workspaceBase, id);
    fs.mkdirSync(workspace);

    const controller = new DownloadController(makeService() as any);
    const req = { params: { id } } as unknown as Request;
    const res = mockResponse();

    await controller.getBulkDownload(req, res);

    expect(trackMock).not.toHaveBeenCalled();
  });
});

describe('DownloadController.getLocalFile', () => {
  let workspaceBase: string;
  let originalWorkspaceBase: string | undefined;

  beforeEach(() => {
    workspaceBase = fs.mkdtempSync(path.join(os.tmpdir(), 'local-test-'));
    originalWorkspaceBase = process.env.WORKSPACE_BASE;
    process.env.WORKSPACE_BASE = workspaceBase;
  });

  afterEach(() => {
    fs.rmSync(workspaceBase, { recursive: true, force: true });
    if (originalWorkspaceBase === undefined) {
      delete process.env.WORKSPACE_BASE;
    } else {
      process.env.WORKSPACE_BASE = originalWorkspaceBase;
    }
  });

  function fileResponse() {
    return {
      sendFile: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
    } as unknown as Response;
  }

  it('fires deck_downloaded once with bulk:false on a successful send', () => {
    const id = 'local-event-workspace';
    const workspace = path.join(workspaceBase, id);
    fs.mkdirSync(workspace);
    fs.writeFileSync(path.join(workspace, 'one.apkg'), 'a');

    const controller = new DownloadController(makeService() as any);
    const req = { params: { id, filename: 'one.apkg' } } as unknown as Request;
    const res = fileResponse();

    controller.getLocalFile(req, res);

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('deck_downloaded', {
      userId: null,
      anonymousId: null,
      props: { workspace_id: id, bulk: false },
    });
    expect(res.sendFile).toHaveBeenCalled();
  });

  it('does not fire deck_downloaded when the file is missing', () => {
    const id = 'local-missing-workspace';
    const workspace = path.join(workspaceBase, id);
    fs.mkdirSync(workspace);

    const controller = new DownloadController(makeService() as any);
    const req = { params: { id, filename: 'gone.apkg' } } as unknown as Request;
    const res = fileResponse();

    controller.getLocalFile(req, res);

    expect(trackMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('DownloadController.getDownloadPage view model', () => {
  let workspaceBase: string;
  let originalWorkspaceBase: string | undefined;

  beforeEach(() => {
    workspaceBase = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-page-test-'));
    originalWorkspaceBase = process.env.WORKSPACE_BASE;
    process.env.WORKSPACE_BASE = workspaceBase;
  });

  afterEach(() => {
    fs.rmSync(workspaceBase, { recursive: true, force: true });
    if (originalWorkspaceBase === undefined) {
      delete process.env.WORKSPACE_BASE;
    } else {
      process.env.WORKSPACE_BASE = originalWorkspaceBase;
    }
  });

  function makeJobRepository(title: string | null = null) {
    return {
      findJobByObjectId: jest.fn().mockResolvedValue(title != null ? { title, created_at: new Date() } : undefined),
    };
  }

  it('renders page HTML with displayName for each .apkg file', async () => {
    const id = 'ws-view-model';
    const workspace = path.join(workspaceBase, id);
    fs.mkdirSync(workspace);
    fs.writeFileSync(path.join(workspace, '-Biology-Notes-5827131637243234.apkg'), 'x'.repeat(1000));

    const controller = new DownloadController(makeService() as any, makeJobRepository('My Source') as any);
    const req = { params: { id } } as unknown as Request;
    const res = mockResponse();

    await controller.getDownloadPage(req, res);

    const html = (res.send as jest.Mock).mock.calls[0][0] as string;
    expect(html).toContain('Biology Notes');
    expect(html).toContain('My Source');
    expect(html).not.toContain('>-Biology-Notes-5827131637243234.apkg<');
  });

  it('renders without subhead when jobs row is missing', async () => {
    const id = 'ws-no-job';
    const workspace = path.join(workspaceBase, id);
    fs.mkdirSync(workspace);
    fs.writeFileSync(path.join(workspace, 'Deck-A.apkg'), 'data');

    const controller = new DownloadController(makeService() as any, makeJobRepository(null) as any);
    const req = { params: { id } } as unknown as Request;
    const res = mockResponse();

    await controller.getDownloadPage(req, res);

    const html = (res.send as jest.Mock).mock.calls[0][0] as string;
    expect(html).toContain('1 deck ready');
    expect(html).not.toContain('From ');
  });

  it('renders empty state when workspace has no .apkg files', async () => {
    const id = 'ws-empty';
    const workspace = path.join(workspaceBase, id);
    fs.mkdirSync(workspace);

    const controller = new DownloadController(makeService() as any, makeJobRepository(null) as any);
    const req = { params: { id } } as unknown as Request;
    const res = mockResponse();

    await controller.getDownloadPage(req, res);

    const html = (res.send as jest.Mock).mock.calls[0][0] as string;
    expect(html).toContain('No decks found in your upload');
  });
});
