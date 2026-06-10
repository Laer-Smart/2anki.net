import { Request, Response } from 'express';

import { IEmojiFeedbackRepository } from '../data_layer/EmojiFeedbackRepository';

const EMAIL_MAX_LENGTH = 254;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, EMAIL_MAX_LENGTH);
  return EMAIL_SHAPE.test(trimmed) ? trimmed : null;
};

class EmojiFeedbackController {
  constructor(private readonly repo: IEmojiFeedbackRepository) {}

  async submit(req: Request, res: Response) {
    try {
      const { rating, comment, page, email } = req.body;

      if (
        typeof rating !== 'number' ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        res.status(400).json({ message: 'Rating must be 1-5.' });
        return;
      }

      if (typeof page !== 'string' || page.trim().length === 0) {
        res.status(400).json({ message: 'Page is required.' });
        return;
      }

      const sanitizedComment =
        typeof comment === 'string' && comment.trim().length > 0
          ? comment.trim().slice(0, 2000)
          : null;

      await this.repo.insert({
        rating,
        comment: sanitizedComment,
        page: page.trim().slice(0, 255),
        email: parseEmail(email),
      });

      res.status(201).json({ message: 'Thank you for your feedback!' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to save feedback.' });
    }
  }
}

export default EmojiFeedbackController;
