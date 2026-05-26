import express from 'express';

import { GetOpsMetricsUseCase } from '../usecases/ops/GetOpsMetricsUseCase';
import { GetBusinessMetricsUseCase } from '../usecases/ops/GetBusinessMetricsUseCase';
import { GetConversionMetricsUseCase } from '../usecases/ops/GetConversionMetricsUseCase';
import { GetPerformanceMetricsUseCase } from '../usecases/ops/GetPerformanceMetricsUseCase';
import { GetReturnRateMetricsUseCase } from '../usecases/ops/GetReturnRateMetricsUseCase';
import { PopulateShowcaseUseCase } from '../usecases/ops/PopulateShowcaseUseCase';
import { SendInactivityWarningsUseCase } from '../usecases/ops/SendInactivityWarningsUseCase';
import { SendAbandonedCheckoutRecoveryUseCase } from '../usecases/ops/SendAbandonedCheckoutRecoveryUseCase';
import { IShowcaseRepository } from '../data_layer/ShowcaseRepository';
import { GetMindmapImageStatsUseCase } from '../usecases/mindmaps/GetMindmapImageStatsUseCase';

class OpsController {
  constructor(
    private readonly getOpsMetrics: GetOpsMetricsUseCase,
    private readonly getBusinessMetricsUseCase?: GetBusinessMetricsUseCase,
    private readonly getConversionMetricsUseCase?: GetConversionMetricsUseCase,
    private readonly populateShowcaseUseCase?: PopulateShowcaseUseCase,
    private readonly showcaseRepo?: IShowcaseRepository,
    private readonly sendInactivityWarningsUseCase?: SendInactivityWarningsUseCase,
    private readonly getPerformanceMetricsUseCase?: GetPerformanceMetricsUseCase,
    private readonly sendAbandonedCheckoutRecoveryUseCase?: SendAbandonedCheckoutRecoveryUseCase,
    private readonly getReturnRateMetricsUseCase?: GetReturnRateMetricsUseCase,
    private readonly getMindmapImageStatsUseCase?: GetMindmapImageStatsUseCase
  ) {}

  async getMetrics(req: express.Request, res: express.Response) {
    try {
      const window = req.query.window;
      const result = await this.getOpsMetrics.execute(window);
      res.status(200).json(result);
    } catch (error) {
      console.error('[ops] getMetrics failed', error);
      res.status(500).json({ message: 'Failed to load ops metrics' });
    }
  }

  async getBusinessMetrics(_req: express.Request, res: express.Response) {
    if (this.getBusinessMetricsUseCase == null) {
      res.status(500).json({ message: 'Business metrics not configured' });
      return;
    }
    try {
      const result = await this.getBusinessMetricsUseCase.execute();
      res.set('Cache-Control', 'private, max-age=86400');
      res.status(200).json(result);
    } catch (error) {
      console.error('[ops] getBusinessMetrics failed', error);
      res.status(500).json({ message: 'Failed to load business metrics' });
    }
  }

  async getConversionMetrics(_req: express.Request, res: express.Response) {
    if (this.getConversionMetricsUseCase == null) {
      res.status(500).json({ message: 'Conversion metrics not configured' });
      return;
    }
    try {
      const result = await this.getConversionMetricsUseCase.execute();
      res.status(200).json(result);
    } catch (error) {
      console.error('[ops] getConversionMetrics failed', error);
      res.status(500).json({ message: 'Failed to load conversion metrics' });
    }
  }
  async populateShowcase(req: express.Request, res: express.Response) {
    if (this.populateShowcaseUseCase == null) {
      res.status(500).json({ message: 'Showcase not configured' });
      return;
    }
    try {
      const { pageId, apkgKey } = req.body;
      if (typeof pageId !== 'string' || pageId.trim().length === 0) {
        res.status(400).json({ message: 'pageId is required' });
        return;
      }
      if (typeof apkgKey !== 'string' || apkgKey.trim().length === 0) {
        res.status(400).json({ message: 'apkgKey is required' });
        return;
      }
      await this.populateShowcaseUseCase.execute(
        res.locals.owner,
        pageId.trim(),
        apkgKey.trim()
      );
      res.status(200).json({ message: 'Showcase populated.' });
    } catch (error) {
      console.error('[ops] populateShowcase failed', error);
      res.status(500).json({ message: 'Failed to populate showcase.' });
    }
  }

  async purgeShowcase(_req: express.Request, res: express.Response) {
    if (this.showcaseRepo == null) {
      res.status(500).json({ message: 'Showcase not configured' });
      return;
    }
    try {
      await this.showcaseRepo.purge();
      res.status(200).json({ message: 'Showcase purged.' });
    } catch (error) {
      console.error('[ops] purgeShowcase failed', error);
      res.status(500).json({ message: 'Failed to purge showcase.' });
    }
  }

  async getPerformanceMetrics(_req: express.Request, res: express.Response) {
    if (this.getPerformanceMetricsUseCase == null) {
      res.status(500).json({ message: 'Performance metrics not configured' });
      return;
    }
    try {
      const result = await this.getPerformanceMetricsUseCase.execute();
      res.status(200).json(result);
    } catch (error) {
      console.error('[ops] getPerformanceMetrics failed', error);
      res.status(500).json({ message: 'Failed to load performance metrics' });
    }
  }

  async sendAbandonedCheckoutRecovery(
    req: express.Request,
    res: express.Response
  ) {
    if (this.sendAbandonedCheckoutRecoveryUseCase == null) {
      res
        .status(500)
        .json({ message: 'Abandoned-checkout recovery not configured' });
      return;
    }
    const body = req.body as { emails?: unknown; dryRun?: unknown };
    if (!Array.isArray(body.emails)) {
      res.status(400).json({ message: 'emails must be an array of strings' });
      return;
    }
    const emails = body.emails.filter(
      (e): e is string => typeof e === 'string' && e.includes('@')
    );
    const dryRun = body.dryRun !== false;
    try {
      const result = await this.sendAbandonedCheckoutRecoveryUseCase.execute(
        emails,
        dryRun
      );
      res.status(200).json(result);
    } catch (error) {
      console.error('[ops] sendAbandonedCheckoutRecovery failed', error);
      res
        .status(500)
        .json({ message: 'Failed to run abandoned-checkout recovery' });
    }
  }

  async sendInactivityWarnings(req: express.Request, res: express.Response) {
    if (this.sendInactivityWarningsUseCase == null) {
      res.status(500).json({ message: 'Inactivity warnings not configured' });
      return;
    }
    try {
      const dryRun = req.query.dryRun !== 'false';
      const result = await this.sendInactivityWarningsUseCase.execute(dryRun);
      res.status(200).json(result);
    } catch (error) {
      console.error('[ops] sendInactivityWarnings failed', error);
      res.status(500).json({ message: 'Failed to run inactivity warnings' });
    }
  }

  async getReturnRateMetrics(_req: express.Request, res: express.Response) {
    if (this.getReturnRateMetricsUseCase == null) {
      res.status(500).json({ message: 'Return-rate metrics not configured' });
      return;
    }
    try {
      const result = await this.getReturnRateMetricsUseCase.execute();
      res.status(200).json(result);
    } catch (error) {
      console.error('[ops] getReturnRateMetrics failed', error);
      res.status(500).json({ message: 'Failed to load return-rate metrics' });
    }
  }

  async getMindmapImageStats(_req: express.Request, res: express.Response) {
    if (this.getMindmapImageStatsUseCase == null) {
      res.status(500).json({ message: 'Mindmap image stats not configured' });
      return;
    }
    try {
      const result = await this.getMindmapImageStatsUseCase.execute();
      res.status(200).json(result);
    } catch (error) {
      console.error('[ops] getMindmapImageStats failed', error);
      res.status(500).json({ message: 'Failed to load mindmap image stats' });
    }
  }
}

export default OpsController;
