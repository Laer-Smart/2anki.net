const send = jest.fn().mockResolvedValue([{ statusCode: 202 }, {}]);

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send,
}));

import { getDefaultEmailService } from './EmailService';

interface SentMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

describe('commercial email unsubscribe links', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SENDGRID_API_KEY = 'test-key';
    process.env.DOMAIN = 'https://2anki.net';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function lastMessage(): SentMessage {
    const calls = send.mock.calls;
    return calls[calls.length - 1][0] as SentMessage;
  }

  it('inactivity-warning email contains a resolved unsubscribe URL', async () => {
    const service = getDefaultEmailService();
    await service.sendInactivityWarningEmail('alice@example.com', 'tok-inactivity');

    const { html } = lastMessage();
    expect(html).toContain('href="https://2anki.net/unsubscribe?uid=tok-inactivity"');
    expect(html).not.toContain('{{unsubscribeUrl}}');
    expect(html).toContain("Don't want emails like this? Unsubscribe");
  });

  it('abandoned-checkout-recovery email contains a resolved unsubscribe URL', async () => {
    const service = getDefaultEmailService();
    await service.sendAbandonedCheckoutRecoveryEmail('carol@example.com', 'tok-checkout');

    const { html } = lastMessage();
    expect(html).toContain('href="https://2anki.net/unsubscribe?uid=tok-checkout"');
    expect(html).not.toContain('{{unsubscribeUrl}}');
    expect(html).toContain("Don't want emails like this? Unsubscribe");
  });
});
