const send = jest.fn().mockResolvedValue([{ statusCode: 202 }, {}]);

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send,
}));

import { getDefaultEmailService } from './EmailService';
import { NOTION_RECONNECT_TEMPLATE } from './constants';

interface SentMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

describe('EmailService.sendTrialEndedEmail', () => {
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

  describe('when the user converted at least one deck', () => {
    it('leads with the count and drives a single upgrade CTA to pricing', async () => {
      const service = getDefaultEmailService();

      await service.sendTrialEndedEmail('alice@example.com', 'tok-1', 3);

      const msg = lastMessage();
      expect(msg.to).toBe('alice@example.com');
      expect(msg.subject).toBe('You made 3 decks during your 2anki trial');
      expect(msg.html).toContain('You made 3 decks during that hour.');
      expect(msg.html).toContain('Upgrade to continue');
      expect(msg.html).toContain('c=post_trial&to=/pricing');
      expect(msg.html).not.toContain('Make your first deck');
      expect(msg.html).not.toContain('See pricing');
    });

    it('uses the singular noun for exactly one deck', async () => {
      const service = getDefaultEmailService();

      await service.sendTrialEndedEmail('alice@example.com', 'tok-1', 1);

      expect(lastMessage().subject).toBe('You made 1 deck during your 2anki trial');
    });
  });

  describe('when the user converted nothing', () => {
    it('drives the converter as the primary CTA with pricing as a secondary link', async () => {
      const service = getDefaultEmailService();

      await service.sendTrialEndedEmail('bob@example.com', 'tok-2', 0);

      const msg = lastMessage();
      expect(msg.subject).toBe("Your 2anki trial ended — here's what stays free");
      expect(msg.html).toContain('Your 1-hour trial just ended.');
      expect(msg.html).not.toContain('during that hour');
      expect(msg.html).toContain('Make your first deck');
      expect(msg.html).toContain('c=post_trial&to=/upload');
      expect(msg.html).toContain('See pricing');
      expect(msg.html).toContain('c=post_trial&to=/pricing');
    });
  });

  it('does not state a fixed free-tier card number', async () => {
    const service = getDefaultEmailService();

    await service.sendTrialEndedEmail('alice@example.com', 'tok-1', 2);

    const msg = lastMessage();
    expect(msg.html).toContain('your monthly limit applies');
    expect(msg.html).not.toContain('100 cards');
  });
});

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
