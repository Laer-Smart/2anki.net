import { Request, Response } from 'express';
import ApkgController from './ApkgController';
import DownloadService from '../services/DownloadService';
import ApkgPreviewService from '../services/ApkgPreviewService/ApkgPreviewService';
import PdfRenderService from '../services/PdfRenderService';
import { NotionService } from '../services/NotionService/NotionService';
import JobRepository from '../data_layer/JobRepository';
import ImportApkgToNotionUseCase from '../usecases/apkg/ImportApkgToNotionUseCase';

jest.mock('../usecases/apkg/ImportApkgToNotionUseCase');
jest.mock('../lib/storage/StorageHandler', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('node:fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('fake')),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

function makeRes(locals: Record<string, unknown> = {}): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    locals: { owner: 'user-1', ...locals },
  };
}

function makeReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    params: {},
    query: {},
    body: { parent_page_id: 'parent-page-1' },
    file: {
      originalname: 'deck.apkg',
      path: '/tmp/deck.apkg',
      fieldname: 'file',
      encoding: '7bit',
      mimetype: 'application/octet-stream',
      size: 1024,
      destination: '/tmp',
      filename: 'deck.apkg',
      buffer: Buffer.from(''),
      stream: null as never,
    },
    ...overrides,
  };
}

function makeController() {
  const downloadService = {
    getFileBody: jest.fn(),
    isMissingDownloadError: jest.fn().mockReturnValue(false),
  } as unknown as DownloadService;
  const previewService = {
    parse: jest.fn(),
    getMeta: jest.fn(),
    getCardsPage: jest.fn(),
    getMediaEntry: jest.fn(),
  } as unknown as ApkgPreviewService;
  const pdfRenderService = {} as PdfRenderService;
  const notionService = {
    getNotionAPI: jest.fn().mockResolvedValue({
      createPage: jest.fn().mockResolvedValue({ id: 'page-1' }),
      appendBlocks: jest.fn().mockResolvedValue({}),
      getPage: jest.fn().mockResolvedValue({ url: 'https://notion.so/p' }),
    }),
  } as unknown as NotionService;
  const jobRepository = {
    countJobsByType: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockResolvedValue(undefined),
    updateJobStatus: jest.fn().mockResolvedValue({}),
    findJobById: jest.fn(),
  } as unknown as JobRepository;

  return new ApkgController(
    downloadService,
    previewService,
    pdfRenderService,
    notionService,
    jobRepository
  );
}

jest.mock('../usecases/apkg/PackEditedApkgUseCase');
import PackEditedApkgUseCase from '../usecases/apkg/PackEditedApkgUseCase';

describe('ApkgController.downloadEdited', () => {
  let executeMock: jest.Mock;

  beforeEach(() => {
    executeMock = jest.fn().mockResolvedValue({
      buffer: Buffer.from('fake-apkg'),
      filename: 'deck-edited.apkg',
    });
    (PackEditedApkgUseCase as jest.Mock).mockImplementation(() => ({
      execute: executeMock,
    }));
  });

  it('returns 400 when key is not an .apkg', async () => {
    const controller = makeController();
    const req = makeReq({ params: { key: 'notanapkg.zip' }, body: { edits: [] } }) as Request;
    const res = makeRes() as Response;
    await controller.downloadEdited(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when edits is not an array', async () => {
    const controller = makeController();
    const req = makeReq({ params: { key: 'deck.apkg' }, body: { edits: 'invalid' } }) as Request;
    const res = makeRes() as Response;
    await controller.downloadEdited(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when upload not found', async () => {
    const controller = makeController();
    const ds = controller['downloadService'] as jest.Mocked<DownloadService>;
    ds.getFileBody.mockResolvedValue(null);
    const req = makeReq({ params: { key: 'deck.apkg' }, body: { edits: [] } }) as Request;
    const res = makeRes() as Response;
    await controller.downloadEdited(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('sends the .apkg buffer when edits are valid', async () => {
    const fakeBuffer = Buffer.from('fake-apkg');
    const controller = makeController();
    const ds = controller['downloadService'] as jest.Mocked<DownloadService>;
    ds.getFileBody.mockResolvedValue(fakeBuffer);
    const res = makeRes() as Response;
    (res as unknown as Record<string, jest.Mock>).setHeader = jest.fn();
    (res as unknown as Record<string, jest.Mock>).send = jest.fn();
    const req = makeReq({
      params: { key: 'deck.apkg' },
      body: { edits: [{ cardIndex: 0, deleted: true }] },
    }) as Request;
    await controller.downloadEdited(req, res);
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ edits: [{ cardIndex: 0, deleted: true }] })
    );
    expect((res as unknown as Record<string, jest.Mock>).send).toHaveBeenCalledWith(
      Buffer.from('fake-apkg')
    );
  });
});

describe('ApkgController.importToNotion', () => {
  let executeMock: jest.Mock;

  beforeEach(() => {
    executeMock = jest.fn().mockResolvedValue(undefined);
    (ImportApkgToNotionUseCase as jest.Mock).mockImplementation(() => ({
      execute: executeMock,
    }));
  });

  it('allows a free user to start an import with maxNotes=1000', async () => {
    const controller = makeController();
    const req = makeReq() as Request;
    const res = makeRes({ patreon: false, subscriber: false }) as Response;

    await controller.importToNotion(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    const executeCall = executeMock.mock.calls[0];
    expect(executeCall[5]).toMatchObject({ isPaying: false, maxNotes: 1000 });
  });

  it('gives a paying user maxNotes=5000', async () => {
    const controller = makeController();
    const req = makeReq() as Request;
    const res = makeRes({ patreon: true, subscriber: false }) as Response;

    await controller.importToNotion(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    const executeCall = executeMock.mock.calls[0];
    expect(executeCall[5]).toMatchObject({ isPaying: true, maxNotes: 5000 });
  });

  it('gives a subscriber user maxNotes=5000', async () => {
    const controller = makeController();
    const req = makeReq() as Request;
    const res = makeRes({ patreon: false, subscriber: true }) as Response;

    await controller.importToNotion(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    const executeCall = executeMock.mock.calls[0];
    expect(executeCall[5]).toMatchObject({ isPaying: true, maxNotes: 5000 });
  });
});
