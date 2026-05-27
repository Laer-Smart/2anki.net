import sgMail = require('@sendgrid/mail');
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

import {
  ABANDONED_CHECKOUT_RECOVERY_TEMPLATE,
  CONVERT_LINK_TEMPLATE,
  CONVERT_TEMPLATE,
  DEFAULT_SENDER,
  INACTIVITY_WARNING_TEMPLATE,
  MAGIC_LINK_TEMPLATE,
  PASSWORD_RESET_TEMPLATE,
  RE_ENGAGEMENT_TEMPLATE,
  SUBSCRIPTION_CANCELLED_TEMPLATE,
  SUBSCRIPTION_CANCELLATIONS_LOG_PATH,
  SUBSCRIPTION_SCHEDULED_CANCELLATION_TEMPLATE,
  TRIAL_ENDED_TEMPLATE,
} from './constants';
import { isValidDeckName, addDeckNameSuffix } from '../../lib/anki/format';
import { ClientResponse } from '@sendgrid/mail';
import { SUPPORT_EMAIL_ADDRESS } from '../../lib/constants';

type EmailResponse = { didSend: boolean; error?: Error };

export interface IEmailService {
  sendResetEmail(email: string, token: string): Promise<void>;
  sendConversionEmail(email: string, filename: string, contents: Buffer): void;
  sendConversionLinkEmail(email: string, filename: string, link: string): void;
  sendContactEmail(
    name: string,
    email: string,
    message: string,
    attachments: Express.Multer.File[]
  ): Promise<EmailResponse>;
  sendSubscriptionCancelledEmail(
    email: string,
    name: string,
    subscriptionId: string
  ): Promise<void>;
  sendSubscriptionScheduledCancellationEmail(
    email: string,
    name: string,
    cancelDate: Date
  ): Promise<void>;
  sendHostedAnkiAccessRequestEmail(
    userId: string,
    userEmail: string
  ): Promise<EmailResponse>;
  sendMagicLinkEmail(
    email: string,
    token: string,
    purpose: 'login' | 'password_reset'
  ): Promise<void>;
  sendReEngagementEmail(
    to: string,
    name: string,
    token: string
  ): Promise<void>;
  sendInactivityWarningEmail(to: string, token: string, lastConversion?: { deckName: string } | null): Promise<void>;
  sendAbandonedCheckoutRecoveryEmail(to: string, token: string): Promise<void>;
  sendTrialEndedEmail(to: string, token: string, deckCount: number): Promise<void>;
  sendParserCanaryAlert(to: string, summary: string): Promise<void>;
}

class EmailService implements IEmailService {
  constructor(
    apiKey: string,
    readonly defaultSender: string
  ) {
    sgMail.setApiKey(apiKey);
  }

  async sendResetEmail(email: string, token: string): Promise<void> {
    const link = `${process.env.DOMAIN ?? 'https://2anki.net'}/users/r/${token}`;
    const markup = PASSWORD_RESET_TEMPLATE.replace('{{link}}', link);
    const msg = {
      to: email,
      from: this.defaultSender,
      subject: 'Reset your 2anki.net password',
      text: `We received your password change request, you can change it here ${link}`,
      html: markup,
      replyTo: 'support@2anki.net',
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  sendConversionEmail(
    email: string,
    filename: string,
    contents: Buffer
  ): Promise<[ClientResponse, {}]> {
    const markup = CONVERT_TEMPLATE;

    let attachedFilename = filename;
    if (!isValidDeckName(filename)) {
      attachedFilename = addDeckNameSuffix(filename);
    }
    const msg = {
      to: email,
      from: DEFAULT_SENDER,
      subject: `2anki.net - Your «${filename}» deck is ready`,
      text: 'Attached is your deck',
      html: markup,
      replyTo: 'support@2anki.net',
      attachments: [
        {
          content: contents.toString('base64'),
          filename: attachedFilename,
          type: 'application/apkg',
          disposition: 'attachment',
        },
      ],
    };

    return sgMail.send(msg);
  }

  async sendConversionLinkEmail(email: string, filename: string, link: string) {
    const markup = CONVERT_LINK_TEMPLATE.replace(/{{link}}/g, link);
    const msg = {
      to: email,
      from: DEFAULT_SENDER,
      subject: `2anki.net - Your «${filename}» deck is ready`,
      text: `Download your deck here: ${link}`,
      html: markup,
      replyTo: 'support@2anki.net',
    };

    await sgMail.send(msg);
  }

  async sendContactEmail(
    name: string,
    email: string,
    message: string,
    attachments: Express.Multer.File[]
  ): Promise<EmailResponse> {
    const msg = {
      to: SUPPORT_EMAIL_ADDRESS,
      from: DEFAULT_SENDER,
      replyTo: email,
      subject: `Contact form submission on behalf of ${
        name ?? 'Anon'
      } <${email}>`,
      text: `Message: ${message}\n\n`,
      attachments: attachments.map((file) => ({
        content: file.buffer.toString('base64'),
        filename: file.originalname,
        type: file.mimetype,
        disposition: 'attachment',
      })),
    };
    try {
      await sgMail.send(msg);
      return { didSend: true };
    } catch (e) {
      console.error('Error sending email', e);
      return { didSend: false, error: e as Error };
    }
  }

  async sendHostedAnkiAccessRequestEmail(
    userId: string,
    userEmail: string
  ): Promise<EmailResponse> {
    const msg = {
      to: SUPPORT_EMAIL_ADDRESS,
      from: DEFAULT_SENDER,
      subject: 'Auto Sync access request',
      text: `User ${userId} <${userEmail}> requested access to Auto Sync.`,
      replyTo: userEmail,
    };
    try {
      await sgMail.send(msg);
      return { didSend: true };
    } catch (e) {
      console.error('Error sending Auto Sync access request email', e);
      return { didSend: false, error: e as Error };
    }
  }

  async sendMagicLinkEmail(
    email: string,
    token: string,
    purpose: 'login' | 'password_reset'
  ): Promise<void> {
    const link = `${process.env.DOMAIN ?? 'https://2anki.net'}/auth/magic?token=${token}`;
    const isLogin = purpose === 'login';
    const subject = isLogin
      ? 'Your 2anki login link'
      : 'Reset your 2anki password';
    const heading = isLogin
      ? 'Sign in to 2anki.net'
      : 'Reset your 2anki.net password';
    const description = isLogin
      ? 'Click the button below to sign in to your account.'
      : 'Click the button below to reset your password.';
    const buttonText = isLogin ? 'Sign in' : 'Reset password';

    const markup = MAGIC_LINK_TEMPLATE.replace('{{title}}', heading)
      .replace('{{heading}}', heading)
      .replace('{{description}}', description)
      .replace('{{link}}', link)
      .replace('{{buttonText}}', buttonText);

    const plainText = isLogin
      ? `Sign in to your 2anki account using this link: ${link}`
      : `Reset your 2anki password using this link: ${link}`;

    const msg = {
      to: email,
      from: this.defaultSender,
      subject,
      text: plainText,
      html: markup,
      replyTo: 'support@2anki.net',
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error('Failed to send magic link email:', error);
      throw error;
    }
  }

  async sendReEngagementEmail(
    to: string,
    name: string,
    token: string
  ): Promise<void> {
    const domain = process.env.DOMAIN ?? 'https://2anki.net';
    const surveyUrl = `${domain}/feedback/onboarding?uid=${token}`;
    const unsubscribeUrl = `${domain}/unsubscribe?uid=${token}`;
    const markup = RE_ENGAGEMENT_TEMPLATE.replaceAll('{{name}}', name)
      .replaceAll('{{surveyUrl}}', surveyUrl)
      .replaceAll('{{unsubscribeUrl}}', unsubscribeUrl);

    const msg = {
      to,
      from: this.defaultSender,
      subject: 'Still figuring out 2anki? We can help.',
      text: `Hi ${name},\n\nYou signed up for 2anki a few days ago but haven't converted anything yet.\n\nWhen you're ready, visit https://2anki.net\n\nTell us what happened: ${surveyUrl}\n\nThe 2anki Team`,
      html: markup,
      replyTo: 'support@2anki.net',
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error('Failed to send re-engagement email:', error);
      throw error;
    }
  }

  async sendInactivityWarningEmail(
    to: string,
    token: string,
    lastConversion?: { deckName: string } | null
  ): Promise<void> {
    const domain = process.env.DOMAIN ?? 'https://2anki.net';

    const hasConversion = lastConversion != null;
    const bodyText = hasConversion
      ? `Your last deck on 2anki was ${lastConversion.deckName}. If another exam or chapter is coming up, your account is ready — paste a Notion link or drop in a file and you'll have a deck in under a minute.`
      : `You signed up for 2anki but haven't made a deck yet. When you're ready, paste a Notion link or drop in a file at 2anki.net and you'll have an Anki deck in under a minute.`;

    const ctaUrl = `${domain}/r/email?t=${encodeURIComponent(token)}&c=inactivity&to=/upload`;
    const unsubscribeUrl = `${domain}/unsubscribe?uid=${token}`;

    const markup = INACTIVITY_WARNING_TEMPLATE
      .replace('{{bodyText}}', bodyText)
      .replace('{{ctaUrl}}', ctaUrl)
      .replace('{{unsubscribeUrl}}', unsubscribeUrl);

    const $ = cheerio.load(markup);
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    const msg = {
      to,
      from: this.defaultSender,
      subject: 'Your decks on 2anki — still here when you need them',
      text,
      html: markup,
      replyTo: 'support@2anki.net',
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error(`Failed to send inactivity warning to ${to}:`, error);
      throw error;
    }
  }

  async sendAbandonedCheckoutRecoveryEmail(to: string, token: string): Promise<void> {
    const domain = process.env.DOMAIN ?? 'https://2anki.net';
    const link = `${domain}/pricing?from=recovery`;
    const unsubscribeUrl = `${domain}/unsubscribe?uid=${token}`;
    const markup = ABANDONED_CHECKOUT_RECOVERY_TEMPLATE
      .replace('{{link}}', link)
      .replace('{{unsubscribeUrl}}', unsubscribeUrl);
    const $ = cheerio.load(markup);
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    const msg = {
      to,
      from: this.defaultSender,
      subject: 'Pick up where you left off on 2anki',
      text,
      html: markup,
      replyTo: 'support@2anki.net',
    };
    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error(
        `Failed to send abandoned-checkout recovery to ${to}:`,
        error
      );
      throw error;
    }
  }

  async sendTrialEndedEmail(
    to: string,
    token: string,
    deckCount: number
  ): Promise<void> {
    const domain = process.env.DOMAIN ?? 'https://2anki.net';
    const tokenParam = encodeURIComponent(token);
    const pricingUrl = `${domain}/r/email?t=${tokenParam}&c=post_trial&to=/pricing`;

    const madeDecks = deckCount > 0;
    const noun = deckCount === 1 ? 'deck' : 'decks';

    const subject = madeDecks
      ? `You made ${deckCount} ${noun} during your 2anki trial`
      : "Your 2anki trial ended — here's what stays free";
    const lead = madeDecks
      ? `Your 1-hour trial just ended. You made ${deckCount} ${noun} during that hour.`
      : 'Your 1-hour trial just ended.';
    const ctaLabel = madeDecks ? 'Upgrade to continue' : 'Make your first deck';
    const ctaUrl = madeDecks
      ? pricingUrl
      : `${domain}/r/email?t=${tokenParam}&c=post_trial&to=/upload`;
    const secondaryCta = madeDecks
      ? ''
      : `<p class="email-muted" style="text-align: center; margin: 0 0 24px; font-size: 13px;"><a href="${pricingUrl}" style="color: #6b7280;">See pricing</a></p>`;

    const unsubscribeUrl = `${domain}/unsubscribe?uid=${encodeURIComponent(token)}`;

    const markup = TRIAL_ENDED_TEMPLATE.replaceAll('{{lead}}', lead)
      .replaceAll('{{ctaLabel}}', ctaLabel)
      .replaceAll('{{ctaUrl}}', ctaUrl)
      .replaceAll('{{secondaryCta}}', secondaryCta)
      .replace('{{unsubscribeUrl}}', unsubscribeUrl);

    const $ = cheerio.load(markup);
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    const msg = {
      to,
      from: this.defaultSender,
      subject,
      text,
      html: markup,
      replyTo: 'support@2anki.net',
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error(`Failed to send trial-ended email to ${to}:`, error);
      throw error;
    }
  }

  private loadCancellationsSent(): Set<string> {
    try {
      // Ensure .2anki directory exists
      const dir = path.dirname(SUBSCRIPTION_CANCELLATIONS_LOG_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(SUBSCRIPTION_CANCELLATIONS_LOG_PATH)) {
        const data = fs.readFileSync(
          SUBSCRIPTION_CANCELLATIONS_LOG_PATH,
          'utf8'
        );
        return new Set(JSON.parse(data));
      }
    } catch (error) {
      console.warn('Error loading cancellations log:', error);
    }
    return new Set();
  }

  private saveCancellationSent(subscriptionId: string): void {
    try {
      const cancellationsSent = this.loadCancellationsSent();
      cancellationsSent.add(subscriptionId);
      fs.writeFileSync(
        SUBSCRIPTION_CANCELLATIONS_LOG_PATH,
        JSON.stringify([...cancellationsSent])
      );
    } catch (error) {
      console.error('Error saving cancellation log:', error);
    }
  }

  async sendSubscriptionCancelledEmail(
    email: string,
    name: string,
    subscriptionId: string
  ): Promise<void> {
    const cancellationsSent = this.loadCancellationsSent();
    if (cancellationsSent.has(subscriptionId)) {
      console.log(
        `Skipping ${email} - Cancellation notification already sent for subscription ${subscriptionId}`
      );
      return;
    }

    const markup = SUBSCRIPTION_CANCELLED_TEMPLATE.replace(
      '{{name}}',
      name || 'there'
    );

    const $ = cheerio.load(markup);
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    const msg = {
      to: email,
      from: this.defaultSender,
      subject: '2anki.net - Subscription Cancelled',
      text,
      html: markup,
      replyTo: 'support@2anki.net',
    };

    try {
      await sgMail.send(msg);
      this.saveCancellationSent(subscriptionId);
      console.log(`Successfully sent cancellation confirmation to ${email}`);
    } catch (error) {
      console.error(
        `Failed to send cancellation confirmation to ${email}:`,
        error
      );
      throw error;
    }
  }

  async sendSubscriptionScheduledCancellationEmail(
    email: string,
    name: string,
    cancelDate: Date
  ): Promise<void> {
    const formattedDate = cancelDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const markup = SUBSCRIPTION_SCHEDULED_CANCELLATION_TEMPLATE.replace(
      '{{name}}',
      name || 'there'
    ).replace(/{{cancelDate}}/g, formattedDate);

    const $ = cheerio.load(markup);
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    const msg = {
      to: email,
      from: this.defaultSender,
      subject: '2anki.net - Subscription Cancellation Scheduled',
      text,
      html: markup,
      replyTo: 'support@2anki.net',
    };

    try {
      await sgMail.send(msg);
      console.log(
        `Successfully sent scheduled cancellation notification to ${email}`
      );
    } catch (error) {
      console.error(
        `Failed to send scheduled cancellation notification to ${email}:`,
        error
      );
      throw error;
    }
  }

  async sendParserCanaryAlert(to: string, summary: string): Promise<void> {
    const msg = {
      to,
      from: this.defaultSender,
      subject: '[2anki] Parser canary failure — fixture count mismatch',
      text: summary,
      replyTo: 'support@2anki.net',
    };
    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error('[parser-canary] failed to send alert email:', error);
      throw error;
    }
  }
}

export class UnimplementedEmailService implements IEmailService {
  async sendResetEmail(email: string, token: string): Promise<void> {
    console.info('sendResetEmail not handled', email, token);
  }

  sendConversionEmail(email: string, filename: string, contents: Buffer): void {
    console.info('sendConversionEmail not handled', email, filename, contents);
  }

  sendConversionLinkEmail(email: string, filename: string, link: string): void {
    console.info('sendConversionLinkEmail not handled', email, filename, link);
  }

  sendContactEmail(
    name: string,
    email: string,
    message: string,
    attachments: Express.Multer.File[]
  ): Promise<EmailResponse> {
    console.info('sendContactEmail not handled');
    return Promise.resolve({ didSend: false });
  }

  sendSubscriptionCancelledEmail(
    email: string,
    name: string,
    subscriptionId: string
  ): Promise<void> {
    console.info(
      'sendSubscriptionCancelledEmail not handled',
      email,
      name,
      subscriptionId
    );
    return Promise.resolve();
  }

  sendSubscriptionScheduledCancellationEmail(
    email: string,
    name: string,
    cancelDate: Date
  ): Promise<void> {
    console.info(
      'sendSubscriptionScheduledCancellationEmail not handled',
      email,
      name,
      cancelDate
    );
    return Promise.resolve();
  }

  sendHostedAnkiAccessRequestEmail(
    userId: string,
    userEmail: string
  ): Promise<EmailResponse> {
    console.info(
      'sendHostedAnkiAccessRequestEmail not handled',
      userId,
      userEmail
    );
    return Promise.resolve({ didSend: false });
  }

  async sendMagicLinkEmail(
    email: string,
    token: string,
    purpose: 'login' | 'password_reset'
  ): Promise<void> {
    console.info('sendMagicLinkEmail not handled');
  }

  async sendReEngagementEmail(
    to: string,
    name: string,
    token: string
  ): Promise<void> {
    console.info('sendReEngagementEmail not handled', to, name, token);
  }

  async sendInactivityWarningEmail(to: string, token: string, lastConversion?: { deckName: string } | null): Promise<void> {
    console.info('sendInactivityWarningEmail not handled', to, token, lastConversion);
  }

  async sendAbandonedCheckoutRecoveryEmail(to: string, token: string): Promise<void> {
    console.info('sendAbandonedCheckoutRecoveryEmail not handled', to, token);
  }

  async sendTrialEndedEmail(to: string, token: string, deckCount: number): Promise<void> {
    console.info('sendTrialEndedEmail not handled', to, token, deckCount);
  }

  async sendParserCanaryAlert(to: string, summary: string): Promise<void> {
    console.info('sendParserCanaryAlert not handled', to, summary);
  }
}

export const getDefaultEmailService = () => {
  if (process.env.SENDGRID_API_KEY !== undefined) {
    return new EmailService(process.env.SENDGRID_API_KEY!, DEFAULT_SENDER);
  }
  return new UnimplementedEmailService();
};
