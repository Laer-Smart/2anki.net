import type { Knex } from 'knex';

jest.mock('./helpers/runFileSystemCleanup', () => ({
  __esModule: true,
  runFileSystemCleanup: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./helpers/deleteOldUploads', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
  MS_21: 21 * 60 * 1000,
  MS_24_HOURS: 24 * 60 * 60 * 1000,
}));

import { ScheduleCleanup } from './ScheduleCleanup';
import { runFileSystemCleanup } from './helpers/runFileSystemCleanup';
import deleteOldUploads, {
  MS_21,
  MS_24_HOURS,
} from './helpers/deleteOldUploads';

const db = { __id: 'fake-knex' } as unknown as Knex;

describe('ScheduleCleanup', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    errorSpy.mockRestore();
  });

  it('runs the filesystem cleanup on every MS_21 tick', () => {
    ScheduleCleanup(db);

    expect(runFileSystemCleanup).not.toHaveBeenCalled();

    jest.advanceTimersByTime(MS_21);
    expect(runFileSystemCleanup).toHaveBeenCalledTimes(1);
    expect(runFileSystemCleanup).toHaveBeenCalledWith(db);

    jest.advanceTimersByTime(MS_21);
    expect(runFileSystemCleanup).toHaveBeenCalledTimes(2);
  });

  it('runs the old-upload cleanup on every 24h tick', () => {
    ScheduleCleanup(db);

    jest.advanceTimersByTime(MS_24_HOURS);
    expect(deleteOldUploads).toHaveBeenCalledTimes(1);
    expect(deleteOldUploads).toHaveBeenCalledWith(db);
  });

  it('swallows a rejected filesystem cleanup so the interval keeps running', async () => {
    (runFileSystemCleanup as jest.Mock).mockRejectedValueOnce(
      new Error('cleanup boom')
    );

    ScheduleCleanup(db);

    jest.advanceTimersByTime(MS_21);
    await Promise.resolve();

    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
  });
});
