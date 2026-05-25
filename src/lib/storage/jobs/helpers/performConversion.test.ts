jest.mock('../../StorageHandler', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getWorkspacePath: () => '/tmp/fake-workspace',
    getFileContents: jest.fn().mockResolvedValue(null),
  })),
}));

jest.mock('../../../../usecases/jobs/CreateJobWorkSpaceUseCase');
jest.mock('../../../../usecases/jobs/CreateFlashcardsForJobUseCase');
jest.mock('../../../../usecases/jobs/SetJobFailedUseCase');
jest.mock('../../../../usecases/jobs/BuildDeckForJobUseCase');
jest.mock('../../../../usecases/jobs/CompleteJobUseCase');
jest.mock('../../../../usecases/jobs/NotifyUserUseCase');
jest.mock('../../../../data_layer/JobRepository');
jest.mock('../../../../data_layer/UsersRepository');
jest.mock('../../../../data_layer/NotionRespository');
jest.mock('../../../../usecases/users/CheckMonthlyCardLimitUseCase', () => {
  const actual = jest.requireActual<typeof import('../../../../usecases/users/CheckMonthlyCardLimitUseCase')>(
    '../../../../usecases/users/CheckMonthlyCardLimitUseCase'
  );
  return {
    ...actual,
    CheckMonthlyCardLimitUseCase: jest.fn(),
  };
});
jest.mock('../../../../services/events/track', () => ({ track: jest.fn() }));

import { APIResponseError, APIErrorCode } from '@notionhq/client';
import performConversion from './performConversion';
import NotionAPIWrapper from '../../../../services/NotionService/NotionAPIWrapper';
import NotionRepository from '../../../../data_layer/NotionRespository';
import { CreateJobWorkSpaceUseCase } from '../../../../usecases/jobs/CreateJobWorkSpaceUseCase';
import { SetJobFailedUseCase } from '../../../../usecases/jobs/SetJobFailedUseCase';
import { CreateFlashcardsForJobUseCase } from '../../../../usecases/jobs/CreateFlashcardsForJobUseCase';
import {
  NOTION_TOKEN_EXPIRED_REASON,
  EMPTY_DECK_FAILURE_REASON,
} from '../../../../usecases/jobs/jobFailureReason';
import {
  CheckMonthlyCardLimitUseCase,
  MonthlyLimitError,
} from '../../../../usecases/users/CheckMonthlyCardLimitUseCase';

function makeUnauthorizedError(): APIResponseError {
  const err = Object.create(APIResponseError.prototype) as APIResponseError;
  Object.assign(err, {
    name: 'APIResponseError',
    message: 'Unauthorized',
    code: APIErrorCode.Unauthorized,
    status: 401,
  });
  return err;
}

const mockDatabase = {} as any; // eslint-disable-line @typescript-eslint/no-explicit-any

const baseRequest = {
  title: 'Free user page',
  api: {} as NotionAPIWrapper,
  id: 'notion-page-id',
  owner: 'owner-1',
  isPaying: false,
  type: 'page',
  jobDbId: 42,
};

describe('performConversion — signature', () => {
  it('does not accept a res parameter (res is absent from ConversionRequest)', () => {
    expect(Object.keys(baseRequest)).not.toContain('res');
  });
});

describe('performConversion — heavy pipeline', () => {
  let errorSpy: jest.SpyInstance;
  let setJobFailedExecute: jest.Mock;
  let markTokenInvalidMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'info').mockImplementation(() => undefined);

    setJobFailedExecute = jest.fn().mockResolvedValue(undefined);
    (SetJobFailedUseCase as jest.Mock).mockImplementation(() => ({
      execute: setJobFailedExecute,
    }));

    markTokenInvalidMock = jest.fn().mockResolvedValue(undefined);
    (NotionRepository as jest.Mock).mockImplementation(() => ({
      markTokenInvalid: markTokenInvalidMock,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marks job as failed when workspace creation throws', async () => {
    const boom = new Error('workspace exploded');
    (CreateJobWorkSpaceUseCase as jest.Mock).mockImplementation(() => ({
      execute: jest.fn().mockRejectedValue(boom),
    }));

    await performConversion(mockDatabase, baseRequest);

    expect(setJobFailedExecute).toHaveBeenCalledWith(
      baseRequest.id,
      baseRequest.owner,
      expect.any(String)
    );
    expect(errorSpy).toHaveBeenCalledWith(boom);
  });

  it('marks job as failed when no decks are created', async () => {
    (CreateJobWorkSpaceUseCase as jest.Mock).mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue({
        ws: {},
        exporter: {},
        settings: {},
        bl: {},
        rules: {},
      }),
    }));
    (CreateFlashcardsForJobUseCase as jest.Mock).mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue([]),
    }));

    await performConversion(mockDatabase, baseRequest);

    expect(setJobFailedExecute).toHaveBeenCalledWith(
      baseRequest.id,
      baseRequest.owner,
      expect.stringContaining(baseRequest.id)
    );
  });

  it('sets notion_token_expired reason and calls markTokenInvalid when workspace throws a 401', async () => {
    (CreateJobWorkSpaceUseCase as jest.Mock).mockImplementation(() => ({
      execute: jest.fn().mockRejectedValue(makeUnauthorizedError()),
    }));
    const numericOwnerRequest = { ...baseRequest, owner: '42' };

    await performConversion(mockDatabase, numericOwnerRequest);

    expect(setJobFailedExecute).toHaveBeenCalledWith(
      numericOwnerRequest.id,
      numericOwnerRequest.owner,
      NOTION_TOKEN_EXPIRED_REASON
    );
    expect(markTokenInvalidMock).toHaveBeenCalledWith(42);
  });

  it('does not call markTokenInvalid for non-unauthorized errors', async () => {
    (CreateJobWorkSpaceUseCase as jest.Mock).mockImplementation(() => ({
      execute: jest.fn().mockRejectedValue(new Error('random error')),
    }));

    await performConversion(mockDatabase, baseRequest);

    expect(markTokenInvalidMock).not.toHaveBeenCalled();
  });

  it('stores structured JSON with code monthly_limit when MonthlyLimitError is thrown', async () => {
    (CreateJobWorkSpaceUseCase as jest.Mock).mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue({
        ws: {},
        exporter: {},
        settings: {},
        bl: {},
        rules: {},
      }),
    }));
    (CreateFlashcardsForJobUseCase as jest.Mock).mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue([{ cards: [1, 2, 3] }]),
    }));
    const limitError = new MonthlyLimitError(80, 100, 3, '2026-07-01T00:00:00.000Z');
    (CheckMonthlyCardLimitUseCase as jest.Mock).mockImplementation(() => ({
      execute: jest.fn().mockRejectedValue(limitError),
    }));

    await performConversion(mockDatabase, baseRequest);

    expect(setJobFailedExecute).toHaveBeenCalledWith(
      baseRequest.id,
      baseRequest.owner,
      expect.stringContaining('"code":"monthly_limit"')
    );
    const payload = JSON.parse(setJobFailedExecute.mock.calls[0][2] as string);
    expect(payload).toMatchObject({
      code: 'monthly_limit',
      cards_used: 80,
      limit: 100,
    });
  });

  it('marks job as failed with the empty-deck reason when decks have zero cards', async () => {
    (CreateJobWorkSpaceUseCase as jest.Mock).mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue({
        ws: {},
        exporter: {},
        settings: {},
        bl: {},
        rules: {},
      }),
    }));
    (CreateFlashcardsForJobUseCase as jest.Mock).mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue([{ cards: [] }]),
    }));

    await performConversion(mockDatabase, baseRequest);

    expect(setJobFailedExecute).toHaveBeenCalledWith(
      baseRequest.id,
      baseRequest.owner,
      EMPTY_DECK_FAILURE_REASON
    );
  });
});
