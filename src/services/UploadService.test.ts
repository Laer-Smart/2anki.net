import os from 'os';
import path from 'path';
import express from 'express';

jest.mock('../usecases/uploads/GeneratePackagesUseCase', () => {
  return {
    __esModule: true,
    default: jest.fn(),
  };
});

jest.mock('../lib/integrations/stripe', () => ({
  getStripe: jest.fn().mockReturnValue({
    customers: { retrieve: jest.fn() },
  }),
  updateStoreSubscription: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/SubscriptionService', () => ({
  __esModule: true,
  default: { findActiveStripeSubscriptions: jest.fn().mockResolvedValue([]) },
}));

const mockStorageDelete = jest.fn().mockResolvedValue(true);
jest.mock('../lib/storage/StorageHandler', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      delete: mockStorageDelete,
    })),
  };
});

import GeneratePackagesUseCase from '../usecases/uploads/GeneratePackagesUseCase';
import { EmptyDeckError } from '../usecases/jobs/EmptyDeckError';
import { DeckTooLargeError } from '../lib/parser/exporters/DeckTooLargeError';
import UploadService from './UploadService';
import { IUploadRepository } from '../data_layer/UploadRespository';
import JobRepository from '../data_layer/JobRepository';
import Uploads from '../data_layer/public/Uploads';

const MockGeneratePackagesUseCase = GeneratePackagesUseCase as jest.MockedClass<typeof GeneratePackagesUseCase>;

function buildRepository(): IUploadRepository {
  return {
    deleteUpload: (_owner: number, _key: string) => Promise.resolve(1),
    getUploadsByOwner: (_owner: number) => Promise.resolve([] as Uploads[]),
    findByIdAndOwner: (_id: number, _owner: number) => Promise.resolve(null),
    findByKey: (_owner: number, _key: string) => Promise.resolve(null),
    findAllByObjectIdAndOwner: (_objectId: string, _owner: number) =>
      Promise.resolve([] as Uploads[]),
    update: (_owner: number, _filename: string, _key: string, _size_mb: number) =>
      Promise.resolve([] as Uploads[]),
    getLastUploadForUser: (_userId: number) => Promise.resolve(null),
  };
}

function buildRequest(overrides: Partial<express.Request> = {}): express.Request {
  return {
    files: [{ originalname: 'study-notes.zip', mimetype: 'application/zip', size: 1024, path: '/tmp/study-notes.zip' }],
    body: {},
    path: '/api/upload/file',
    ...overrides,
  } as unknown as express.Request;
}

function buildResponse(): {
  res: express.Response;
  capturedStatus: () => number;
  capturedJson: () => unknown;
  capturedSend: () => unknown;
} {
  let status = 0;
  let json: unknown = null;
  let sent: unknown = null;

  const jsonFn = jest.fn((body: unknown) => {
    json = body;
    return res; // eslint-disable-line @typescript-eslint/no-use-before-define
  });
  const statusFn = jest.fn((code: number) => {
    status = code;
    return res; // eslint-disable-line @typescript-eslint/no-use-before-define
  });
  const setFn = jest.fn(() => res); // eslint-disable-line @typescript-eslint/no-use-before-define
  const sendFn = jest.fn((body: unknown) => {
    sent = body;
    return res; // eslint-disable-line @typescript-eslint/no-use-before-define
  });
  const contentTypeFn = jest.fn(() => res); // eslint-disable-line @typescript-eslint/no-use-before-define
  const attachmentFn = jest.fn(() => res); // eslint-disable-line @typescript-eslint/no-use-before-define
  const redirectFn = jest.fn(() => res); // eslint-disable-line @typescript-eslint/no-use-before-define

  const res = {
    status: statusFn,
    json: jsonFn,
    set: setFn,
    send: sendFn,
    contentType: contentTypeFn,
    attachment: attachmentFn,
    redirect: redirectFn,
    locals: {},
    headersSent: false,
  } as unknown as express.Response;

  return {
    res,
    capturedStatus: () => status,
    capturedJson: () => json,
    capturedSend: () => sent,
  };
}

describe('UploadService.handleUpload — error paths', () => {
  const originalWorkspaceBase = process.env.WORKSPACE_BASE;

  beforeAll(() => {
    process.env.WORKSPACE_BASE = path.join(os.tmpdir(), 'upload-service-test');
  });

  afterAll(() => {
    process.env.WORKSPACE_BASE = originalWorkspaceBase;
  });

  beforeEach(() => {
    MockGeneratePackagesUseCase.mockClear();
  });

  it('returns 400 JSON with empty_export code, spec copy and docs link when no packages are produced', async () => {
    MockGeneratePackagesUseCase.mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue({ packages: [] }),
    }) as unknown as InstanceType<typeof GeneratePackagesUseCase>);

    const service = new UploadService(buildRepository(), {} as JobRepository);
    const req = buildRequest();
    const { res, capturedStatus, capturedJson } = buildResponse();

    await service.handleUpload(req, res);

    expect(capturedStatus()).toBe(400);
    const body = capturedJson() as {
      code: string;
      message: string;
      filename: string;
      docsLink: string;
    };
    expect(body.code).toBe('empty_export');
    expect(typeof body.message).toBe('string');
    expect(body.message).not.toMatch(/rules/i);
    expect(body.message).not.toMatch(/valid toggle/i);
    expect(body.message).not.toMatch(/<[a-z]/i);
    expect(body.message).toBe(
      'No cards were found in this file. Most files need a toggle-list (Notion) or a question/answer pair to become cards. See common problems for the formats that work.'
    );
    expect(body.filename).toBe('study-notes.zip');
    expect(body.docsLink).toBe('/documentation/help/common-problems');
  });

  it('EmptyDeckError response body contains no HTML tags', async () => {
    MockGeneratePackagesUseCase.mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue({ packages: [] }),
    }) as unknown as InstanceType<typeof GeneratePackagesUseCase>);

    const service = new UploadService(buildRepository(), {} as JobRepository);
    const req = buildRequest();
    const { res, capturedJson } = buildResponse();

    await service.handleUpload(req, res);

    const body = capturedJson() as { message: string };
    expect(body.message).not.toMatch(/<[a-z]/i);
  });

  it('uses in-memory uploaded file contents for empty-deck diagnostics when no disk path exists', async () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      MockGeneratePackagesUseCase.mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({ packages: [] }),
      }) as unknown as InstanceType<typeof GeneratePackagesUseCase>);

      const service = new UploadService(buildRepository(), {} as JobRepository);
      const req = buildRequest({
        files: [
          {
            fieldname: 'files',
            originalname: 'memory-upload.html',
            encoding: '7bit',
            mimetype: 'text/html',
            size: 36,
            buffer: Buffer.from('<details><summary>Q</summary>A</details>'),
          } as Express.Multer.File,
        ],
      });
      const { res, capturedStatus } = buildResponse();

      await service.handleUpload(req, res);

      expect(capturedStatus()).toBe(400);
      expect(errorSpy).not.toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('<details>'));
    } finally {
      infoSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('returns 400 JSON when deck serialization overflows (DeckTooLargeError path)', async () => {
    MockGeneratePackagesUseCase.mockImplementation(() => ({
      execute: jest.fn().mockRejectedValue(new DeckTooLargeError()),
    }) as unknown as InstanceType<typeof GeneratePackagesUseCase>);

    const service = new UploadService(buildRepository(), {} as JobRepository);
    const req = buildRequest();
    const { res, capturedStatus, capturedJson } = buildResponse();

    await service.handleUpload(req, res);

    expect(capturedStatus()).toBe(400);
    const body = capturedJson() as { message: string };
    expect(typeof body.message).toBe('string');
    expect(body.message).not.toMatch(/<[a-z]/i);
    expect(body.message).not.toMatch(/Invalid string length/i);
    expect(body.message).toMatch(/split/i);
  });

  it('DeckTooLargeError response body contains no stack trace or V8 internals', async () => {
    MockGeneratePackagesUseCase.mockImplementation(() => ({
      execute: jest.fn().mockRejectedValue(new DeckTooLargeError()),
    }) as unknown as InstanceType<typeof GeneratePackagesUseCase>);

    const service = new UploadService(buildRepository(), {} as JobRepository);
    const req = buildRequest();
    const { res, capturedJson } = buildResponse();

    await service.handleUpload(req, res);

    const body = capturedJson() as { message: string };
    expect(body.message).not.toMatch(/at .*\(/);
    expect(body.message).not.toMatch(/RangeError/);
  });

  it('rejects .apkg upload with 400 and the "already an Anki deck" message before reaching GeneratePackagesUseCase', async () => {
    const executeMock = jest.fn();
    MockGeneratePackagesUseCase.mockImplementation(() => ({
      execute: executeMock,
    }) as unknown as InstanceType<typeof GeneratePackagesUseCase>);

    const service = new UploadService(buildRepository(), {} as JobRepository);
    const req = buildRequest({
      files: [
        {
          originalname: 'my-deck.apkg',
          mimetype: 'application/octet-stream',
          size: 82138,
          path: '/tmp/abc123',
          fieldname: 'pakker',
          encoding: '7bit',
          destination: '/tmp',
          filename: 'abc123',
          buffer: Buffer.alloc(0),
          stream: null,
          key: '',
        } as unknown as Express.Multer.File,
      ],
    });
    const { res, capturedStatus, capturedSend } = buildResponse();

    await service.handleUpload(req, res);

    expect(capturedStatus()).toBe(400);
    expect(typeof capturedSend()).toBe('string');
    expect(capturedSend() as string).toContain('already an Anki deck');
    expect(executeMock).not.toHaveBeenCalled();
  });
});

describe('UploadService.deleteUpload — cascade', () => {
  beforeEach(() => {
    mockStorageDelete.mockClear();
  });

  it('removes the upload row, the S3 object, and the linked job', async () => {
    const repo: IUploadRepository = {
      ...buildRepository(),
      findByKey: jest.fn().mockResolvedValue({
        id: 1,
        owner: 7,
        key: 'k.apkg',
        filename: 'k.apkg',
        object_id: 'obj-123',
        size_mb: 1,
        created_at: new Date(),
      } as Uploads),
      deleteUpload: jest.fn().mockResolvedValue(1),
    };
    const jobRepository = {
      deleteJobByObjectId: jest.fn().mockResolvedValue(1),
    } as unknown as JobRepository;

    const service = new UploadService(repo, jobRepository);
    await service.deleteUpload(7, 'k.apkg');

    expect(repo.findByKey).toHaveBeenCalledWith(7, 'k.apkg');
    expect(repo.deleteUpload).toHaveBeenCalledWith(7, 'k.apkg');
    expect(mockStorageDelete).toHaveBeenCalledWith('k.apkg');
    expect(jobRepository.deleteJobByObjectId).toHaveBeenCalledWith(
      'obj-123',
      '7'
    );
  });

  it('skips the job delete when the upload row has no object_id', async () => {
    const repo: IUploadRepository = {
      ...buildRepository(),
      findByKey: jest.fn().mockResolvedValue({
        id: 1,
        owner: 7,
        key: 'k.apkg',
        filename: 'k.apkg',
        object_id: null,
        size_mb: 1,
        created_at: new Date(),
      } as Uploads),
      deleteUpload: jest.fn().mockResolvedValue(1),
    };
    const jobRepository = {
      deleteJobByObjectId: jest.fn(),
    } as unknown as JobRepository;

    const service = new UploadService(repo, jobRepository);
    await service.deleteUpload(7, 'k.apkg');

    expect(repo.deleteUpload).toHaveBeenCalledWith(7, 'k.apkg');
    expect(mockStorageDelete).toHaveBeenCalledWith('k.apkg');
    expect(jobRepository.deleteJobByObjectId).not.toHaveBeenCalled();
  });

  it('skips the job delete when no matching upload row exists', async () => {
    const repo: IUploadRepository = {
      ...buildRepository(),
      findByKey: jest.fn().mockResolvedValue(null),
      deleteUpload: jest.fn().mockResolvedValue(0),
    };
    const jobRepository = {
      deleteJobByObjectId: jest.fn(),
    } as unknown as JobRepository;

    const service = new UploadService(repo, jobRepository);
    await service.deleteUpload(7, 'k.apkg');

    expect(jobRepository.deleteJobByObjectId).not.toHaveBeenCalled();
  });
});
