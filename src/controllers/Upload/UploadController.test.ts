import express from 'express';
import multer from 'multer';

jest.mock('../../lib/misc/GetUploadHandler');

jest.mock('../../lib/integrations/stripe', () => ({
  getStripe: jest.fn().mockReturnValue({
    customers: { retrieve: jest.fn() },
  }),
  updateStoreSubscription: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/SubscriptionService', () => ({
  __esModule: true,
  default: { findActiveStripeSubscriptions: jest.fn().mockResolvedValue([]) },
}));

import { getUploadHandler } from '../../lib/misc/GetUploadHandler';
import { INotionRepository } from '../../data_layer/NotionRespository';
import { IUploadRepository } from '../../data_layer/UploadRespository';
import NotionTokens from '../../data_layer/public/NotionTokens';
import Uploads from '../../data_layer/public/Uploads';
import NotionService from '../../services/NotionService';
import UploadService from '../../services/UploadService';
import JobRepository from '../../data_layer/JobRepository';
import UploadController from './UploadController';

describe('Upload file', () => {
  test('upload failed is caught', () => {
    // Arrange
    const repository: IUploadRepository = {
      deleteUpload: function (owner: number, _key: string): Promise<number> {
        return Promise.resolve(1);
      },
      getUploadsByOwner: function (owner: number): Promise<Uploads[]> {
        return Promise.resolve([]);
      },
      findByIdAndOwner: function (
        _id: number,
        _owner: number
      ): Promise<Uploads | null> {
        return Promise.resolve(null);
      },
      findByKey: function (
        _owner: number,
        _key: string
      ): Promise<Uploads | null> {
        return Promise.resolve(null);
      },
      findAllByObjectIdAndOwner: function (
        _objectId: string,
        _owner: number
      ): Promise<Uploads[]> {
        return Promise.resolve([]);
      },
      update: function (
        owner: number,
        filename: string,
        key: string,
        size_mb: number
      ): Promise<Uploads[]> {
        return Promise.resolve([]);
      },
      getLastUploadForUser: function (_userId: number) {
        return Promise.resolve(null);
      },
    };
    const notionRepository: INotionRepository = {
      getNotionData: function (owner: string | number): Promise<NotionTokens> {
        return Promise.resolve({ owner: 1, token: '...' } as NotionTokens);
      },
      saveNotionToken: function (
        user: number,
        data: { [key: string]: string },
        hash: (token: string) => string
      ): Promise<boolean> {
        return Promise.resolve(true);
      },
      getNotionToken: function (owner: string): Promise<string> {
        return Promise.resolve('...');
      },
      deleteBlocksByOwner: function (owner: number): Promise<number> {
        return Promise.resolve(owner);
      },
      deleteNotionData(owner: number): Promise<boolean> {
        return Promise.resolve(true);
      },
      markTokenInvalid: jest.fn().mockResolvedValue(undefined),
      clearTokenInvalid: jest.fn().mockResolvedValue(undefined),
      setReconnectEmailSent: jest.fn().mockResolvedValue(true),
    };
    const uploadService = new UploadService(repository, {} as JobRepository);
    const notionService = new NotionService(notionRepository);
    const uploadController = new UploadController(uploadService, notionService);

    // Act
    const jsonSpy = jest.fn();
    let capturedStatus = 0;

    // Assert
    uploadController.file(
      {} as express.Request,
      {
        status: (code: number) => {
          capturedStatus = code;
          return { json: jsonSpy } as unknown as express.Response;
        },
      } as unknown as express.Response
    );

    expect(capturedStatus).toBe(400);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
  });
});

describe('Upload file — multer error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 413 with code=too_large when multer LIMIT_FILE_SIZE fires', async () => {
    const multerError = new multer.MulterError('LIMIT_FILE_SIZE');
    (getUploadHandler as jest.Mock).mockImplementation(
      () =>
        (_req: express.Request, _res: express.Response, cb: (err?: unknown) => void) => {
          cb(multerError);
        }
    );

    const jsonSpy = jest.fn();
    let capturedStatus = 0;

    const repository = {
      deleteUpload: jest.fn(),
      getUploadsByOwner: jest.fn().mockResolvedValue([]),
      findByIdAndOwner: jest.fn().mockResolvedValue(null),
      findByKey: jest.fn().mockResolvedValue(null),
      findAllByObjectIdAndOwner: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue([]),
      getLastUploadForUser: jest.fn().mockResolvedValue(null),
    };
    const notionRepository: INotionRepository = {
      getNotionData: jest.fn() as INotionRepository['getNotionData'],
      saveNotionToken: jest.fn() as INotionRepository['saveNotionToken'],
      getNotionToken: jest.fn() as INotionRepository['getNotionToken'],
      deleteBlocksByOwner: jest.fn() as INotionRepository['deleteBlocksByOwner'],
      deleteNotionData: jest.fn() as INotionRepository['deleteNotionData'],
      markTokenInvalid: jest.fn().mockResolvedValue(undefined),
      clearTokenInvalid: jest.fn().mockResolvedValue(undefined),
      setReconnectEmailSent: jest.fn().mockResolvedValue(true),
    };
    const uploadService = new UploadService(repository, {} as JobRepository);
    const notionService = new NotionService(notionRepository);
    const controller = new UploadController(uploadService, notionService);

    await new Promise<void>((resolve) => {
      const fakeRes = {
        locals: {},
        status: (code: number) => {
          capturedStatus = code;
          return {
            json: (body: unknown) => {
              jsonSpy(body);
              resolve();
            },
          };
        },
      } as unknown as express.Response;
      controller.file({} as express.Request, fakeRes);
    });

    expect(capturedStatus).toBe(413);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'too_large',
        message: expect.stringContaining('50 MB'),
      })
    );
  });
});
