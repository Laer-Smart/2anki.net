import express from 'express';
import multer from 'multer';

import RequireAuthentication from './middleware/RequireAuthentication';
import { normalizeUploadFilenames } from './middleware/normalizeUploadFilenames';
import TransformController from '../controllers/TransformController';
import { TransformApkgUseCase } from '../usecases/ankify/TransformApkgUseCase';

const TRANSFORM_UPLOAD_LIMIT_BYTES = 100 * 1024 * 1024;

const TransformRouter = () => {
  const router = express.Router();
  const controller = new TransformController(new TransformApkgUseCase());

  router.post(
    '/api/transform/upload',
    RequireAuthentication,
    multer({
      dest: '/tmp',
      limits: { fileSize: TRANSFORM_UPLOAD_LIMIT_BYTES },
    }).array('file', 1),
    normalizeUploadFilenames,
    (req, res) => controller.transform(req, res)
  );

  return router;
};

export default TransformRouter;
