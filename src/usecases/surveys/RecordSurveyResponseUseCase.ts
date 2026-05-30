import {
  IUserSurveyRepository,
  SurveyStatus,
} from '../../data_layer/UserSurveyRepository';

const MAX_TEXT_LENGTH = 2000;

export class InvalidSurveyStatusError extends Error {
  constructor() {
    super('Invalid survey status.');
    this.name = 'InvalidSurveyStatusError';
  }
}

export interface RecordSurveyInput {
  status: SurveyStatus;
  improvement?: string;
  studying?: string;
}

function isSurveyStatus(value: unknown): value is SurveyStatus {
  return value === 'answered' || value === 'dismissed';
}

function normalizeText(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().slice(0, MAX_TEXT_LENGTH);
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
}

export class RecordSurveyResponseUseCase {
  constructor(
    private readonly repository: IUserSurveyRepository,
    private readonly surveyKey = 'post_login_v1'
  ) {}

  async execute(userId: string, input: RecordSurveyInput): Promise<void> {
    if (isSurveyStatus(input.status)) {
      await this.repository.upsert(userId, this.surveyKey, {
        status: input.status,
        improvement: normalizeText(input.improvement),
        studying: normalizeText(input.studying),
      });
      return;
    }
    throw new InvalidSurveyStatusError();
  }
}
