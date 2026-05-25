import { SendAbandonedCheckoutRecoveryOnExpiryUseCase } from './SendAbandonedCheckoutRecoveryOnExpiryUseCase';
import type { IAbandonedCheckoutRecoveryRepository } from '../../data_layer/AbandonedCheckoutRecoveryRepository';
import type { IEmailService } from '../../services/EmailService/EmailService';

jest.mock('../../lib/misc/hashToken', () => (s: string) => `hashed:${s}`);

function makeRepo(claimed = true): jest.Mocked<IAbandonedCheckoutRecoveryRepository> {
  return {
    claimSession: jest.fn().mockResolvedValue(claimed),
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
  };
}

describe('SendAbandonedCheckoutRecoveryOnExpiryUseCase', () => {
  it('sends email and claims row when insert wins', async () => {
    const repo = makeRepo(true);
    const emailService = makeEmailService();
    const useCase = new SendAbandonedCheckoutRecoveryOnExpiryUseCase(repo, emailService);

    await useCase.execute('cs_test_abc123', 'alice@example.com');

    expect(repo.claimSession).toHaveBeenCalledWith('cs_test_abc123', 'alice@example.com');
    expect(emailService.sendAbandonedCheckoutRecoveryEmail).toHaveBeenCalledWith('alice@example.com');
  });

  it('does not send email when insert is a no-op (duplicate)', async () => {
    const repo = makeRepo(false);
    const emailService = makeEmailService();
    const useCase = new SendAbandonedCheckoutRecoveryOnExpiryUseCase(repo, emailService);

    await useCase.execute('cs_test_abc123', 'alice@example.com');

    expect(repo.claimSession).toHaveBeenCalledWith('cs_test_abc123', 'alice@example.com');
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
    };
    const emailService = makeEmailService();
    const useCase = new SendAbandonedCheckoutRecoveryOnExpiryUseCase(repo, emailService);

    await useCase.execute('cs_test_dup', 'bob@example.com');
    await useCase.execute('cs_test_dup', 'bob@example.com');

    expect(emailService.sendAbandonedCheckoutRecoveryEmail).toHaveBeenCalledTimes(1);
  });
});
