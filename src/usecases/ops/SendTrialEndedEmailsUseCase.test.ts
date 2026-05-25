import { SendTrialEndedEmailsUseCase } from './SendTrialEndedEmailsUseCase';
import { InMemoryTrialEndedEmailRepository } from '../../data_layer/TrialEndedEmailRepository';
import type { IEmailService } from '../../services/EmailService/EmailService';

function makeEmailService(overrides: Partial<IEmailService> = {}): IEmailService {
  return {
    sendResetEmail: jest.fn(),
    sendConversionEmail: jest.fn(),
    sendConversionLinkEmail: jest.fn(),
    sendContactEmail: jest.fn(),
    sendSubscriptionCancelledEmail: jest.fn(),
    sendSubscriptionScheduledCancellationEmail: jest.fn(),
    sendHostedAnkiAccessRequestEmail: jest.fn(),
    sendMagicLinkEmail: jest.fn(),
    sendReEngagementEmail: jest.fn(),
    sendInactivityWarningEmail: jest.fn().mockResolvedValue(undefined),
    sendAbandonedCheckoutRecoveryEmail: jest.fn().mockResolvedValue(undefined),
    sendTrialEndedEmail: jest.fn().mockResolvedValue(undefined),
    sendParserCanaryAlert: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const trialStartedAt = new Date('2026-05-25T09:00:00Z');

describe('SendTrialEndedEmailsUseCase', () => {
  let repo: InMemoryTrialEndedEmailRepository;

  beforeEach(() => {
    repo = new InMemoryTrialEndedEmailRepository();
  });

  describe('dry run', () => {
    it('returns the candidate count without sending', async () => {
      repo.seedUsers([
        { id: 1, name: 'Alice', email: 'alice@example.com', trialStartedAt },
        { id: 2, name: 'Bob', email: 'bob@example.com', trialStartedAt },
      ]);
      const emailService = makeEmailService();
      const useCase = new SendTrialEndedEmailsUseCase(repo, emailService);

      const result = await useCase.execute(true);

      expect(result).toEqual({ count: 2, dryRun: true });
      expect(emailService.sendTrialEndedEmail).not.toHaveBeenCalled();
      expect(repo.getSentUserIds().size).toBe(0);
    });
  });

  describe('live send', () => {
    it('sends to each candidate and records the send', async () => {
      repo.seedUsers([
        { id: 1, name: 'Alice', email: 'alice@example.com', trialStartedAt },
        { id: 2, name: 'Bob', email: 'bob@example.com', trialStartedAt },
      ]);
      const emailService = makeEmailService();
      const useCase = new SendTrialEndedEmailsUseCase(repo, emailService);

      const result = await useCase.execute(false);

      expect(result).toEqual({ count: 2, dryRun: false });
      expect(emailService.sendTrialEndedEmail).toHaveBeenCalledTimes(2);
      expect(repo.getSentUserIds()).toEqual(new Set([1, 2]));
    });

    it('passes the in-window deck count through to the email', async () => {
      repo.seedUsers([
        { id: 1, name: 'Alice', email: 'alice@example.com', trialStartedAt },
      ]);
      repo.seedDeckCount(1, 3);
      const emailService = makeEmailService();
      const useCase = new SendTrialEndedEmailsUseCase(repo, emailService);

      await useCase.execute(false);

      expect(emailService.sendTrialEndedEmail).toHaveBeenCalledWith(
        'alice@example.com',
        expect.any(String),
        3
      );
    });

    it('passes a deck count of 0 when the user converted nothing', async () => {
      repo.seedUsers([
        { id: 1, name: 'Alice', email: 'alice@example.com', trialStartedAt },
      ]);
      const emailService = makeEmailService();
      const useCase = new SendTrialEndedEmailsUseCase(repo, emailService);

      await useCase.execute(false);

      expect(emailService.sendTrialEndedEmail).toHaveBeenCalledWith(
        'alice@example.com',
        expect.any(String),
        0
      );
    });

    it('records the send before attempting delivery so a failure still dedups', async () => {
      repo.seedUsers([
        { id: 1, name: 'Alice', email: 'alice@example.com', trialStartedAt },
      ]);
      const emailService = makeEmailService({
        sendTrialEndedEmail: jest.fn().mockRejectedValue(new Error('SendGrid down')),
      });
      const useCase = new SendTrialEndedEmailsUseCase(repo, emailService);

      const result = await useCase.execute(false);

      expect(result.count).toBe(0);
      expect(repo.getSentUserIds()).toEqual(new Set([1]));
    });

    it('continues to the next user when one send fails', async () => {
      repo.seedUsers([
        { id: 1, name: 'Alice', email: 'alice@example.com', trialStartedAt },
        { id: 2, name: 'Bob', email: 'bob@example.com', trialStartedAt },
      ]);
      const emailService = makeEmailService({
        sendTrialEndedEmail: jest
          .fn()
          .mockRejectedValueOnce(new Error('SendGrid down'))
          .mockResolvedValueOnce(undefined),
      });
      const useCase = new SendTrialEndedEmailsUseCase(repo, emailService);

      const result = await useCase.execute(false);

      expect(result.count).toBe(1);
      expect(emailService.sendTrialEndedEmail).toHaveBeenCalledTimes(2);
    });

    it('returns zero when there are no candidates', async () => {
      const useCase = new SendTrialEndedEmailsUseCase(repo, makeEmailService());

      const result = await useCase.execute(false);

      expect(result).toEqual({ count: 0, dryRun: false });
    });
  });
});
