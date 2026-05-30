import { Request, Response } from 'express';
import { ShouldShowSurveyUseCase } from '../usecases/surveys/ShouldShowSurveyUseCase';
import { RecordSurveyResponseUseCase } from '../usecases/surveys/RecordSurveyResponseUseCase';
import { SurveyStatus } from '../data_layer/UserSurveyRepository';

interface ShouldShowResponse {
  shouldShow: boolean;
}

interface SubmitResponse {
  message: string;
}

function isSurveyStatus(value: unknown): value is SurveyStatus {
  return value === 'answered' || value === 'dismissed';
}

function isStringOrAbsent(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

export class UserSurveyController {
  constructor(
    private readonly shouldShowUseCase: ShouldShowSurveyUseCase,
    private readonly recordUseCase: RecordSurveyResponseUseCase
  ) {}

  async shouldShow(req: Request, res: Response): Promise<void> {
    const owner = res.locals.owner;
    if (owner == null) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }
    const shouldShow = await this.shouldShowUseCase.execute(String(owner));
    const response: ShouldShowResponse = { shouldShow };
    res.status(200).json(response);
  }

  async submit(req: Request, res: Response): Promise<void> {
    try {
      const owner = res.locals.owner;
      if (owner == null) {
        res.status(401).json({ message: 'Not authenticated.' });
        return;
      }
      const { status, improvement, studying } = req.body ?? {};
      if (!isSurveyStatus(status)) {
        res.status(400).json({ message: 'Invalid status.' });
        return;
      }
      if (!isStringOrAbsent(improvement) || !isStringOrAbsent(studying)) {
        res.status(400).json({ message: 'Invalid survey input.' });
        return;
      }
      await this.recordUseCase.execute(String(owner), {
        status,
        improvement,
        studying,
      });
      const response: SubmitResponse = { message: 'Thanks for the input.' };
      res.status(201).json(response);
    } catch {
      res.status(500).json({ message: 'Could not save survey.' });
    }
  }
}
