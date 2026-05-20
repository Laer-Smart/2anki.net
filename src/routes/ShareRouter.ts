import express, { Request, Response, NextFunction } from 'express';
import RequireAuthentication from './middleware/RequireAuthentication';
import ShareController from '../controllers/ShareController';
import ShareRepository from '../data_layer/ShareRepository';
import ShareService from '../services/ShareService';
import CreateShareUseCase from '../usecases/share/CreateShareUseCase';
import ResolveShareUseCase from '../usecases/share/ResolveShareUseCase';
import RevokeShareUseCase from '../usecases/share/RevokeShareUseCase';
import StorageHandler from '../lib/storage/StorageHandler';
import ApkgPreviewService from '../services/ApkgPreviewService/ApkgPreviewService';
import DownloadService from '../services/DownloadService';
import DownloadRepository from '../data_layer/DownloadRepository';
import UploadRepository from '../data_layer/UploadRespository';
import { getDatabase } from '../data_layer';

const MAX_REQUESTS_PER_IP_PER_MINUTE = 100;
const MAX_DOWNLOADS_PER_TOKEN_PER_HOUR = 10;
const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

interface Counter {
  count: number;
  resetAt: number;
}

const ipCounters = new Map<string, Counter>();
const tokenDownloadCounters = new Map<string, Counter>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
  }
  return req.ip ?? 'unknown';
}

function checkCounter(
  map: Map<string, Counter>,
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (entry == null || now >= entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}

function ipRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  if (checkCounter(ipCounters, ip, MAX_REQUESTS_PER_IP_PER_MINUTE, ONE_MINUTE_MS)) {
    next();
  } else {
    res.status(429).json({ message: 'Too many requests. Try again in a minute.' });
  }
}

function tokenDownloadRateLimit(req: Request, res: Response, next: NextFunction) {
  const { token } = req.params;
  if (checkCounter(tokenDownloadCounters, token, MAX_DOWNLOADS_PER_TOKEN_PER_HOUR, ONE_HOUR_MS)) {
    next();
  } else {
    res.status(429).json({ message: 'Too many downloads for this link. Try again later.' });
  }
}

const ShareRouter = () => {
  const database = getDatabase();
  const shareRepository = new ShareRepository(database);
  const uploadRepository = new UploadRepository(database);
  const shareService = new ShareService(shareRepository);
  const downloadService = new DownloadService(new DownloadRepository(database));
  const previewService = new ApkgPreviewService();
  const storage = new StorageHandler();

  const createUseCase = new CreateShareUseCase(uploadRepository, shareService);
  const resolveUseCase = new ResolveShareUseCase(shareService);
  const revokeUseCase = new RevokeShareUseCase(shareService);

  const controller = new ShareController(
    createUseCase,
    resolveUseCase,
    revokeUseCase,
    shareService,
    storage,
    previewService,
    downloadService
  );

  const router = express.Router();

  router.post('/api/shares', RequireAuthentication, (req, res) =>
    controller.createShare(req, res)
  );

  router.get('/api/shares', RequireAuthentication, (req, res) =>
    controller.getActiveSharesForOwner(req, res)
  );

  router.get('/api/shares/:token/meta', ipRateLimit, (req, res) =>
    controller.getMeta(req, res)
  );

  router.get('/api/shares/:token/cards', ipRateLimit, (req, res) =>
    controller.getCards(req, res)
  );

  router.get('/api/shares/:token/media/:name', ipRateLimit, (req, res) =>
    controller.getMedia(req, res)
  );

  router.get(
    '/api/shares/:token/download',
    ipRateLimit,
    tokenDownloadRateLimit,
    (req, res) => controller.download(req, res)
  );

  router.delete('/api/shares/:token', RequireAuthentication, (req, res) =>
    controller.revokeShare(req, res)
  );

  return router;
};

export default ShareRouter;
