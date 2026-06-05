import express from 'express';

import type {
  InterviewSnapshotsRepository,
  OpportunityTag,
} from '../data_layer/InterviewSnapshotsRepository';

const VALID_TAGS: ReadonlySet<string> = new Set(['opportunity', 'insight']);

export class OpsDiscoveryController {
  constructor(private readonly snapshotsRepo: InterviewSnapshotsRepository) {}

  async listSnapshots(_req: express.Request, res: express.Response) {
    const snapshots = await this.snapshotsRepo.list();
    res.json(snapshots);
  }

  async createSnapshot(req: express.Request, res: express.Response) {
    const body = req.body as Record<string, unknown>;

    const participantName =
      typeof body.participantName === 'string'
        ? body.participantName.trim()
        : '';
    if (participantName.length === 0) {
      res.status(400).json({ message: 'participantName is required' });
      return;
    }

    const interviewDate =
      typeof body.interviewDate === 'string' ? body.interviewDate.trim() : '';
    if (interviewDate.length === 0) {
      res.status(400).json({ message: 'interviewDate is required' });
      return;
    }

    const rawOpportunities = Array.isArray(body.opportunities)
      ? body.opportunities
      : [];
    const opportunities: Array<{ body: string; tag: OpportunityTag }> = [];
    for (const opp of rawOpportunities) {
      if (typeof opp !== 'object' || opp == null) continue;
      const oppBody = typeof opp.body === 'string' ? opp.body.trim() : '';
      const oppTag = typeof opp.tag === 'string' ? opp.tag : '';
      if (oppBody.length === 0 || !VALID_TAGS.has(oppTag)) continue;
      opportunities.push({ body: oppBody, tag: oppTag as OpportunityTag });
    }

    const sessionLength =
      typeof body.sessionLengthMinutes === 'number' &&
      Number.isFinite(body.sessionLengthMinutes)
        ? Math.floor(body.sessionLengthMinutes)
        : null;

    const snapshot = await this.snapshotsRepo.create({
      participantName,
      memorableQuote:
        typeof body.memorableQuote === 'string' ? body.memorableQuote : '',
      photoData:
        typeof body.photoData === 'string' && body.photoData.length > 0
          ? body.photoData
          : null,
      signupDate:
        typeof body.signupDate === 'string' && body.signupDate.length > 0
          ? body.signupDate
          : null,
      planTier: typeof body.planTier === 'string' ? body.planTier : '',
      usagePattern:
        typeof body.usagePattern === 'string' ? body.usagePattern : '',
      source: typeof body.source === 'string' ? body.source : '',
      experienceMapData:
        typeof body.experienceMapData === 'string' &&
        body.experienceMapData.length > 0
          ? body.experienceMapData
          : null,
      interviewDate,
      sessionLengthMinutes: sessionLength,
      opportunities,
    });

    res.status(201).json(snapshot);
  }

  async deleteSnapshot(req: express.Request, res: express.Response) {
    const { id } = req.params;
    if (typeof id !== 'string' || id.trim().length === 0) {
      res.status(400).json({ message: 'id is required' });
      return;
    }

    const deleted = await this.snapshotsRepo.remove(id.trim());
    if (!deleted) {
      res.status(404).json({ message: 'Snapshot not found' });
      return;
    }

    res.json({ message: 'Deleted' });
  }
}
