import express from 'express';
import AppStoreLinksService from '../services/AppStoreLinksService/AppStoreLinksService';

class AppStoreLinksController {
  constructor(private readonly service: AppStoreLinksService) {}

  getLinks(_req: express.Request, res: express.Response) {
    res.status(200).json(this.service.getLinks());
  }
}

export default AppStoreLinksController;
