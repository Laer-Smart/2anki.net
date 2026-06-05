import express from 'express';

import type { InterviewSnapshotsRepository } from '../data_layer/InterviewSnapshotsRepository';
import type JobRepository from '../data_layer/JobRepository';
import type UsersRepository from '../data_layer/UsersRepository';

function planTierFrom(patreon: unknown, subscriber: unknown): string {
  if (patreon === true) return 'lifetime';
  if (subscriber === true) return 'pro';
  return 'free';
}

export class FeedbackController {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly jobRepo: JobRepository,
    private readonly snapshotsRepo: InterviewSnapshotsRepository
  ) {}

  async submitFeedback(req: express.Request, res: express.Response) {
    const owner: string = res.locals.owner;
    const body = req.body as Record<string, unknown>;

    const story = typeof body.story === 'string' ? body.story.trim() : '';
    const mainNeed =
      typeof body.mainNeed === 'string' ? body.mainNeed.trim() : '';
    const secondItem =
      typeof body.secondItem === 'string' ? body.secondItem.trim() : '';

    if (story.length < 10) {
      res.status(400).json({ message: 'story must be at least 10 characters' });
      return;
    }
    if (mainNeed.length < 10) {
      res
        .status(400)
        .json({ message: 'mainNeed must be at least 10 characters' });
      return;
    }

    const user = await this.usersRepo.getById(owner);
    if (user == null) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const jobCount = await this.jobRepo.countJobsByOwner(owner);
    const usagePattern = `${jobCount} conversion${jobCount !== 1 ? 's' : ''}`;

    const signupDate =
      user.created_at instanceof Date
        ? user.created_at.toISOString().slice(0, 10)
        : typeof user.created_at === 'string'
          ? (user.created_at as string).slice(0, 10)
          : null;

    const opportunities: Array<{
      body: string;
      tag: 'opportunity' | 'insight';
    }> = [{ body: mainNeed, tag: 'opportunity' }];
    if (secondItem.length >= 10) {
      opportunities.push({ body: secondItem, tag: 'insight' });
    }

    const snapshot = await this.snapshotsRepo.create({
      participantName: user.email,
      memorableQuote: story,
      photoData: null,
      signupDate,
      planTier: planTierFrom(res.locals.patreon, res.locals.subscriber),
      usagePattern,
      source: 'feedback-form',
      experienceMapData: null,
      interviewDate: new Date().toISOString().slice(0, 10),
      sessionLengthMinutes: null,
      opportunities,
    });

    res.status(201).json({ id: snapshot.id });
  }
}
