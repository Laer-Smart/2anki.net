import express from 'express';
import VersionService from '../services/VersionService';

class VersionController {
  constructor(private readonly service: VersionService) {}

  getVersionInfo(_req: express.Request, res: express.Response) {
    res.status(200).json(this.service.getVersion());
  }
}

export default VersionController;
