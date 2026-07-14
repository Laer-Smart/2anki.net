import { Request, Response } from 'express';

import { IFeatureInterestRepository } from '../data_layer/FeatureInterestRepository';
import { isKnownFeatureKey } from '../lib/featureInterest/keys';

const COMMENT_MAX_LENGTH = 280;

const parseComment = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, COMMENT_MAX_LENGTH);
};

const parseOwner = (value: unknown): number | null =>
  typeof value === 'number' ? value : null;

const parseAnonymousId = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value.slice(0, 100) : null;

class FeatureInterestController {
  constructor(private readonly repo: IFeatureInterestRepository) {}

  async record(req: Request, res: Response) {
    try {
      const { feature_key: featureKey, comment } = req.body;

      if (!isKnownFeatureKey(featureKey)) {
        res.status(400).json({ message: 'Unknown feature.' });
        return;
      }

      const anonymousId = parseAnonymousId(req.cookies?.anon_id);

      await this.repo.record({
        feature_key: featureKey,
        user_id: parseOwner(res.locals.owner),
        anonymous_id: anonymousId,
        comment: parseComment(comment),
      });

      res.status(201).json({ message: 'Interest recorded.' });
    } catch {
      res.status(500).json({ message: 'Failed to record interest.' });
    }
  }
}

export default FeatureInterestController;
