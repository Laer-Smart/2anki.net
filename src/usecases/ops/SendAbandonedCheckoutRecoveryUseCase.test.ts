import { SendAbandonedCheckoutRecoveryUseCase } from './SendAbandonedCheckoutRecoveryUseCase';
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
});
