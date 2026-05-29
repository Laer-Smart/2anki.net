import { SendAbandonedCheckoutRecoveryUseCase } from './SendAbandonedCheckoutRecoveryUseCase';
import type { IAbandonedCheckoutRecoveryRepository } from '../../data_layer/AbandonedCheckoutRecoveryRepository';
import type { IEmailService } from '../../services/EmailService/EmailService';

function makeEmailService(): jest.Mocked<IEmailService> {
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
    sendInactivityWarningEmail: jest.fn(),
    sendAbandonedCheckoutRecoveryEmail: jest.fn().mockResolvedValue(undefined),
    sendTrialEndedEmail: jest.fn().mockResolvedValue(undefined),
    sendParserCanaryAlert: jest.fn().mockResolvedValue(undefined),
    sendNotionReconnectEmail: jest.fn().mockResolvedValue(undefined),
    sendSubscriptionClaimConfirmation: jest.fn().mockResolvedValue(undefined),
  };
}

function makeRepo(optedOut = false): jest.Mocked<IAbandonedCheckoutRecoveryRepository> {
  return {
    claimSession: jest.fn().mockResolvedValue(true),
    recordEmailSend: jest.fn().mockResolvedValue(undefined),
    isMarketingOptedOut: jest.fn().mockResolvedValue(optedOut),
  };
}

describe('SendAbandonedCheckoutRecoveryUseCase', () => {
  it('returns candidate count without sending in dry run', async () => {
    const emailService = makeEmailService();
    const useCase = new SendAbandonedCheckoutRecoveryUseCase(emailService);

    const result = await useCase.execute(
      ['alice@example.com', 'bob@example.com'],
      true
    );

    expect(result).toEqual({
      dryRun: true,
      candidates: 2,
      sent: 0,
      failed: 0,
      failures: [],
    });
    expect(
      emailService.sendAbandonedCheckoutRecoveryEmail
    ).not.toHaveBeenCalled();
  });

  it('sends one email per unique address when dryRun is false', async () => {
    const emailService = makeEmailService();
    const useCase = new SendAbandonedCheckoutRecoveryUseCase(emailService);

    const result = await useCase.execute(
      ['Alice@Example.com', 'alice@example.com', 'bob@example.com'],
      false
    );

    expect(result.dryRun).toBe(false);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(
      emailService.sendAbandonedCheckoutRecoveryEmail
    ).toHaveBeenCalledTimes(2);
  });

  it('passes a non-empty unsubscribe token with each email', async () => {
    const emailService = makeEmailService();
    const useCase = new SendAbandonedCheckoutRecoveryUseCase(emailService);

    await useCase.execute(['alice@example.com'], false);

    const [, token] = emailService.sendAbandonedCheckoutRecoveryEmail.mock.calls[0];
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('rejects invalid email shapes', async () => {
    const emailService = makeEmailService();
    const useCase = new SendAbandonedCheckoutRecoveryUseCase(emailService);

    const result = await useCase.execute(
      ['notanemail', 'foo@bar', '', 'real@example.com'],
      true
    );

    expect(result.candidates).toBe(1);
  });

  it('records failures and keeps going', async () => {
    const emailService = makeEmailService();
    emailService.sendAbandonedCheckoutRecoveryEmail.mockImplementationOnce(
      () => Promise.reject(new Error('SendGrid 500'))
    );
    const useCase = new SendAbandonedCheckoutRecoveryUseCase(emailService);

    const result = await useCase.execute(
      ['fails@example.com', 'works@example.com'],
      false
    );

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.failures[0]).toEqual({
      email: 'fails@example.com',
      error: 'SendGrid 500',
    });
  });

  it('skips opted-out emails when a repository is provided', async () => {
    const emailService = makeEmailService();
    const repo = makeRepo(true);
    const useCase = new SendAbandonedCheckoutRecoveryUseCase(emailService, repo);

    const result = await useCase.execute(['optout@example.com'], false);

    expect(result.sent).toBe(0);
    expect(emailService.sendAbandonedCheckoutRecoveryEmail).not.toHaveBeenCalled();
    expect(repo.isMarketingOptedOut).toHaveBeenCalledWith('optout@example.com');
  });

  it('sends to non-opted-out emails when a repository is provided', async () => {
    const emailService = makeEmailService();
    const repo = makeRepo(false);
    const useCase = new SendAbandonedCheckoutRecoveryUseCase(emailService, repo);

    const result = await useCase.execute(['active@example.com'], false);

    expect(result.sent).toBe(1);
    expect(emailService.sendAbandonedCheckoutRecoveryEmail).toHaveBeenCalledTimes(1);
  });

  it('persists the token via recordEmailSend after a successful send', async () => {
    const emailService = makeEmailService();
    const repo = makeRepo(false);
    const useCase = new SendAbandonedCheckoutRecoveryUseCase(emailService, repo);

    await useCase.execute(['active@example.com'], false);

    const [emailArg, tokenArg] = emailService.sendAbandonedCheckoutRecoveryEmail.mock.calls[0];
    expect(repo.recordEmailSend).toHaveBeenCalledWith(emailArg, tokenArg);
  });

  it('stores a token that is a non-empty string', async () => {
    const emailService = makeEmailService();
    const repo = makeRepo(false);
    const useCase = new SendAbandonedCheckoutRecoveryUseCase(emailService, repo);

    await useCase.execute(['store@example.com'], false);

    const [, persistedToken] = (repo.recordEmailSend as jest.Mock).mock.calls[0];
    expect(typeof persistedToken).toBe('string');
    expect(persistedToken.length).toBeGreaterThan(0);
  });
});
