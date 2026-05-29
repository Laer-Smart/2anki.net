import { SendAbandonedCheckoutRecoveryOnExpiryUseCase } from './SendAbandonedCheckoutRecoveryOnExpiryUseCase';
import type { IAbandonedCheckoutRecoveryRepository } from '../../data_layer/AbandonedCheckoutRecoveryRepository';
import type { IEmailService } from '../../services/EmailService/EmailService';

jest.mock('../../lib/misc/hashToken', () => (s: string) => `hashed:${s}`);

function makeRepo(
  claimed = true,
  optedOut = false
): jest.Mocked<IAbandonedCheckoutRecoveryRepository> {
  return {
    claimSession: jest.fn().mockResolvedValue(claimed),
    recordEmailSend: jest.fn().mockResolvedValue(undefined),
    isMarketingOptedOut: jest.fn().mockResolvedValue(optedOut),
  };
}

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
  };
}

describe('SendAbandonedCheckoutRecoveryOnExpiryUseCase', () => {
  it('sends email and claims row when insert wins', async () => {
    const repo = makeRepo(true);
    const emailService = makeEmailService();
    const useCase = new SendAbandonedCheckoutRecoveryOnExpiryUseCase(repo, emailService);

    await useCase.execute('cs_test_abc123', 'alice@example.com');

    expect(repo.claimSession).toHaveBeenCalledWith(
      'cs_test_abc123',
      'alice@example.com',
      expect.any(String)
    );
    expect(emailService.sendAbandonedCheckoutRecoveryEmail).toHaveBeenCalledWith(
      'alice@example.com',
      expect.any(String)
    );
  });

  it('passes a non-empty token to the email service', async () => {
    const repo = makeRepo(true);
    const emailService = makeEmailService();
    const useCase = new SendAbandonedCheckoutRecoveryOnExpiryUseCase(repo, emailService);

    await useCase.execute('cs_test_tok', 'alice@example.com');

    const [, token] = emailService.sendAbandonedCheckoutRecoveryEmail.mock.calls[0];
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('passes the same token to claimSession and the email service', async () => {
    const repo = makeRepo(true);
    const emailService = makeEmailService();
    const useCase = new SendAbandonedCheckoutRecoveryOnExpiryUseCase(repo, emailService);

    await useCase.execute('cs_test_same_tok', 'alice@example.com');

    const claimToken = (repo.claimSession as jest.Mock).mock.calls[0][2];
    const [, emailToken] = emailService.sendAbandonedCheckoutRecoveryEmail.mock.calls[0];
    expect(claimToken).toBe(emailToken);
  });

  it('does not send email when insert is a no-op (duplicate)', async () => {
    const repo = makeRepo(false);
    const emailService = makeEmailService();
    const useCase = new SendAbandonedCheckoutRecoveryOnExpiryUseCase(repo, emailService);

    await useCase.execute('cs_test_abc123', 'alice@example.com');

    expect(repo.claimSession).toHaveBeenCalledWith(
      'cs_test_abc123',
      'alice@example.com',
      expect.any(String)
    );
    expect(emailService.sendAbandonedCheckoutRecoveryEmail).not.toHaveBeenCalled();
  });

  it('does not send email when the user has opted out of marketing', async () => {
    const repo = makeRepo(true, true);
    const emailService = makeEmailService();
    const useCase = new SendAbandonedCheckoutRecoveryOnExpiryUseCase(repo, emailService);

    await useCase.execute('cs_opted_out', 'optout@example.com');

    expect(repo.isMarketingOptedOut).toHaveBeenCalledWith('optout@example.com');
    expect(repo.claimSession).not.toHaveBeenCalled();
    expect(emailService.sendAbandonedCheckoutRecoveryEmail).not.toHaveBeenCalled();
  });

  it('skips with warn log when email is missing', async () => {
    const repo = makeRepo(true);
    const emailService = makeEmailService();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const useCase = new SendAbandonedCheckoutRecoveryOnExpiryUseCase(repo, emailService);

    await useCase.execute('cs_test_no_email', null);

    expect(repo.claimSession).not.toHaveBeenCalled();
    expect(emailService.sendAbandonedCheckoutRecoveryEmail).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'checkout.session.expired.no_email',
      expect.objectContaining({ session_id_hash: expect.any(String) })
    );
    warnSpy.mockRestore();
  });

  it('idempotent — second execution with same session does not double-send', async () => {
    const claimCalls: boolean[] = [true, false];
    const repo: jest.Mocked<IAbandonedCheckoutRecoveryRepository> = {
      claimSession: jest.fn().mockImplementation(() => {
        return Promise.resolve(claimCalls.shift() ?? false);
      }),
      recordEmailSend: jest.fn().mockResolvedValue(undefined),
      isMarketingOptedOut: jest.fn().mockResolvedValue(false),
    };
    const emailService = makeEmailService();
    const useCase = new SendAbandonedCheckoutRecoveryOnExpiryUseCase(repo, emailService);

    await useCase.execute('cs_test_dup', 'bob@example.com');
    await useCase.execute('cs_test_dup', 'bob@example.com');

    expect(emailService.sendAbandonedCheckoutRecoveryEmail).toHaveBeenCalledTimes(1);
  });
});
