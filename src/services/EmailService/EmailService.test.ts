const send = jest.fn().mockResolvedValue([{ statusCode: 202 }, {}]);

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send,
}));

import { getDefaultEmailService } from './EmailService';
import { NOTION_RECONNECT_TEMPLATE } from './constants';

describe('EmailService.sendNotionReconnectEmail', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SENDGRID_API_KEY = 'test-key';
    process.env.DOMAIN = 'https://2anki.net';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function lastMessage() {
    const calls = send.mock.calls;
    return calls[calls.length - 1][0] as { to: string; subject: string; html: string; text: string };
  }

  it('loads the notion-reconnect template without error', () => {
    expect(NOTION_RECONNECT_TEMPLATE).toContain('Reconnect Notion');
    expect(NOTION_RECONNECT_TEMPLATE).toContain('{{ctaUrl}}');
    expect(NOTION_RECONNECT_TEMPLATE).toContain('2anki.net/mascot/navbar-logo.png');
  });

  it('sends with the correct subject and recipient', async () => {
    const service = getDefaultEmailService();

    await service.sendNotionReconnectEmail('user@example.com');

    const msg = lastMessage();
    expect(msg.to).toBe('user@example.com');
    expect(msg.subject).toBe('Your Notion connection expired');
  });

  it('replaces {{ctaUrl}} with the Notion reconnect URL', async () => {
    const service = getDefaultEmailService();

    await service.sendNotionReconnectEmail('user@example.com');

    const msg = lastMessage();
    expect(msg.html).toContain('https://2anki.net/notion');
    expect(msg.html).not.toContain('{{ctaUrl}}');
  });

  it('includes the expected body copy', async () => {
    const service = getDefaultEmailService();

    await service.sendNotionReconnectEmail('user@example.com');

    const msg = lastMessage();
    expect(msg.html).toContain('2anki lost access to your Notion workspace');
    expect(msg.html).toContain('Reconnect Notion');
    expect(msg.html).toContain('The 2anki Team');
    expect(msg.html).not.toContain('unsubscribe');
  });
});

describe('EmailService.sendAbandonedCheckoutRecoveryEmail', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SENDGRID_API_KEY = 'test-key';
    process.env.DOMAIN = 'https://2anki.net';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function lastMessage() {
    const calls = send.mock.calls;
    return calls[calls.length - 1][0] as { to: string; subject: string; html: string; text: string };
  }

  it('links the CTA to the checkout resume endpoint with the token', async () => {
    const service = getDefaultEmailService();

    await service.sendAbandonedCheckoutRecoveryEmail('buyer@example.com', 'tok-abc-123');

    const msg = lastMessage();
    expect(msg.html).toContain('https://2anki.net/checkout/resume?token=tok-abc-123');
    expect(msg.html).not.toContain('{{link}}');
  });

  it('keeps the unsubscribe link', async () => {
    const service = getDefaultEmailService();

    await service.sendAbandonedCheckoutRecoveryEmail('buyer@example.com', 'tok-abc-123');

    const msg = lastMessage();
    expect(msg.html).toContain('https://2anki.net/unsubscribe?uid=tok-abc-123');
    expect(msg.html).not.toContain('{{unsubscribeUrl}}');
  });
});
