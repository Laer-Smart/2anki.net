import {
  scheduleReEngagementEmails,
  RE_ENGAGEMENT_INTERVAL_MS,
} from './scheduleReEngagementEmails';
import type { IReEngagementRepository } from '../../../data_layer/ReEngagementRepository';
import type { IEmailService } from '../../../services/EmailService/EmailService';
import type { EventsSink } from '../../../services/events/EventsSink';

jest.mock('../../../lib/storage/jobs/helpers/sendReEngagementEmails', () => ({
  sendReEngagementEmails: jest.fn().mockResolvedValue({ count: 0 }),
}));

import { sendReEngagementEmails } from '../../storage/jobs/helpers/sendReEngagementEmails';

const mockRepo = {} as IReEngagementRepository;
const mockEmailService = {} as IEmailService;

function makeSink(): jest.Mocked<Pick<EventsSink, 'record'>> {
  return { record: jest.fn() };
}

describe('scheduleReEngagementEmails', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('fires sendReEngagementEmails after one interval', async () => {
    const sink = makeSink();
    const handle = scheduleReEngagementEmails(
      mockRepo,
      mockEmailService,
      sink as unknown as EventsSink,
      { intervalMs: 1000 }
    );

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(sendReEngagementEmails).toHaveBeenCalledTimes(1);
    clearInterval(handle);
  });

  it('does not fire before the interval elapses', () => {
    const sink = makeSink();
    const handle = scheduleReEngagementEmails(
      mockRepo,
      mockEmailService,
      sink as unknown as EventsSink,
      { intervalMs: 1000 }
    );

    jest.advanceTimersByTime(999);

    expect(sendReEngagementEmails).not.toHaveBeenCalled();
    clearInterval(handle);
  });

  it('emits email_batch_sent with campaign=reengagement and the returned count', async () => {
    (sendReEngagementEmails as jest.Mock).mockResolvedValueOnce({ count: 7 });
    const sink = makeSink();
    const handle = scheduleReEngagementEmails(
      mockRepo,
      mockEmailService,
      sink as unknown as EventsSink,
      { intervalMs: 1000 }
    );

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(sink.record).toHaveBeenCalledWith({
      name: 'email_batch_sent',
      props: { campaign: 'reengagement', count: 7 },
    });
    clearInterval(handle);
  });

  it('catches errors thrown by sendReEngagementEmails without rethrowing', async () => {
    (sendReEngagementEmails as jest.Mock).mockRejectedValueOnce(
      new Error('db down')
    );
    const sink = makeSink();
    const handle = scheduleReEngagementEmails(
      mockRepo,
      mockEmailService,
      sink as unknown as EventsSink,
      { intervalMs: 1000 }
    );

    jest.advanceTimersByTime(1000);
    await expect(Promise.resolve()).resolves.toBeUndefined();

    expect(sink.record).not.toHaveBeenCalled();
    clearInterval(handle);
  });

  it('uses RE_ENGAGEMENT_INTERVAL_MS as the default interval', () => {
    expect(RE_ENGAGEMENT_INTERVAL_MS).toBe(24 * 60 * 60 * 1000);
  });
});
