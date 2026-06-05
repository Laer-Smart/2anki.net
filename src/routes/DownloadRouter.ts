import express from 'express';

import RequireAuthentication from './middleware/RequireAuthentication';
import DownloadController from '../controllers/DownloadController';
import DownloadService from '../services/DownloadService';
import DownloadRepository from '../data_layer/DownloadRepository';
import JobRepository from '../data_layer/JobRepository';
import StorageHandler from '../lib/storage/StorageHandler';
import { getDatabase } from '../data_layer';

const DownloadRouter = () => {
  const database = getDatabase();
  const repository = new DownloadRepository(database);
  const jobRepository = new JobRepository(database);
  const controller = new DownloadController(
    new DownloadService(repository),
    jobRepository
  );
  const router = express.Router();

  /**
   * @swagger
   * /api/download/u/{key}:
   *   get:
   *     summary: Download user file
   *     description: Download a file uploaded by the authenticated user using the file key
   *     tags: [Download]
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *         description: Unique file key for the upload
   *     responses:
   *       200:
   *         description: File download successful
   *         content:
   *           application/octet-stream:
   *             schema:
   *               type: string
   *               format: binary
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: File not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/api/download/u/:key', RequireAuthentication, (req, res) => {
    const storage = new StorageHandler();
    controller.getFile(req, res, storage);
  });

  /**
   * @swagger
   * /download/{id}:
   *   get:
   *     summary: Get download page
   *     description: Display the download page for a converted file
   *     tags: [Download]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Download ID
   *     responses:
   *       200:
   *         description: Download page rendered successfully
   *         content:
   *           text/html:
   *             schema:
   *               type: string
   *       404:
   *         description: Download not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/download/:id', (req, res) => {
    controller.getDownloadPage(req, res);
  });

  /**
   * @swagger
   * /download/{id}/bulk:
   *   get:
   *     summary: Bulk download
   *     description: Download multiple files as a bulk package (ZIP)
   *     tags: [Download]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Download ID for bulk package
   *     responses:
   *       200:
   *         description: Bulk download successful
   *         content:
   *           application/zip:
   *             schema:
   *               type: string
   *               format: binary
   *       404:
   *         description: Download package not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/download/:id/bulk', (req, res) => {
    controller.getBulkDownload(req, res);
  });

  /**
   * @swagger
   * /download/{id}/{filename}:
   *   get:
   *     summary: Download specific file
   *     description: Download a specific file by ID and filename
   *     tags: [Download]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Download ID
   *       - in: path
   *         name: filename
   *         required: true
   *         schema:
   *           type: string
   *         description: Filename to download
   *     responses:
   *       200:
   *         description: File download successful
   *         content:
   *           application/octet-stream:
   *             schema:
   *               type: string
   *               format: binary
   *       404:
   *         description: File not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/download/:id/:filename', (req, res) => {
    controller.getLocalFile(req, res);
  });

  return router;
};

export default DownloadRouter;
