import { Request, Response } from 'express';

import { ResolveMcpDeckDownloadUseCase } from '../usecases/mcp/ResolveMcpDeckDownloadUseCase';
import { track } from '../services/events/track';

class McpDeckDownloadController {
  constructor(private readonly useCase: ResolveMcpDeckDownloadUseCase) {}

  async download(req: Request, res: Response): Promise<void> {
    const result = await this.useCase.resolve(req.params.objectId);
    if (result.kind === 'not_found') {
      res.status(404).send();
      return;
    }
    track('mcp_deck_download', {
      userId: result.owner,
      props: { source: 'mcp_single' },
    });
    res.redirect(302, result.url);
  }
}

export default McpDeckDownloadController;
