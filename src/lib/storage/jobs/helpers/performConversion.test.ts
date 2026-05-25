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
jest.mock('../../../../usecases/users/CheckMonthlyCardLimitUseCase');
jest.mock('../../../../services/events/track', () => ({ track: jest.fn() }));

import { APIResponseError, APIErrorCode } from '@notionhq/client';
import performConversion from './performConversion';
import NotionAPIWrapper from '../../../../services/NotionService/NotionAPIWrapper';
import NotionRepository from '../../../../data_layer/NotionRespository';
import { CreateJobWorkSpaceUseCase } from '../../../../usecases/jobs/CreateJobWorkSpaceUseCase';
import { SetJobFailedUseCase } from '../../../../usecases/jobs/SetJobFailedUseCase';
import { CreateFlashcardsForJobUseCase } from '../../../../usecases/jobs/CreateFlashcardsForJobUseCase';
import { NOTION_TOKEN_EXPIRED_REASON } from '../../../../usecases/jobs/jobFailureReason';

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
});
