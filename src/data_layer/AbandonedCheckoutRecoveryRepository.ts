import type { Knex } from 'knex';

export interface CheckoutRecoveryDetails {
  url: string;
  expiresAt: Date | null;
}

export interface CheckoutRecoveryLookup {
  recoveryUrl: string | null;
  recoveryUrlExpiresAt: Date | null;
}

export interface IAbandonedCheckoutRecoveryRepository {
  claimSession(
    sessionId: string,
    userEmail: string,
    token: string,
    recovery?: CheckoutRecoveryDetails | null
  ): Promise<boolean>;
  recordEmailSend(userEmail: string, token: string): Promise<void>;
  isMarketingOptedOut(userEmail: string): Promise<boolean>;
  hasLifetimeOrActiveSubscription(userEmail: string): Promise<boolean>;
  hasSendSince(userEmail: string, since: Date): Promise<boolean>;
  getRecoveryByToken(token: string): Promise<CheckoutRecoveryLookup | null>;
}

interface AbandonedCheckoutRecoveryRow {
  session_id: string;
  user_email: string;
  sent_at: Date;
  token: string | null;
  recovery_url: string | null;
  recovery_url_expires_at: Date | string | null;
}

export class AbandonedCheckoutRecoveryRepository implements IAbandonedCheckoutRecoveryRepository {
  private readonly table = 'abandoned_checkout_recovery_emails';

  constructor(private readonly database: Knex) {}

  async claimSession(
    sessionId: string,
    userEmail: string,
    token: string,
    recovery: CheckoutRecoveryDetails | null = null
  ): Promise<boolean> {
    const rows = await this.database<AbandonedCheckoutRecoveryRow>(this.table)
      .insert({
        session_id: sessionId,
        user_email: userEmail,
        token,
        recovery_url: recovery?.url ?? null,
        recovery_url_expires_at: recovery?.expiresAt ?? null,
      })
      .onConflict('session_id')
      .ignore()
      .returning('session_id');
    return rows.length > 0;
  }

  async recordEmailSend(userEmail: string, token: string): Promise<void> {
    await this.database<AbandonedCheckoutRecoveryRow>(this.table)
      .insert({ session_id: `bulk:${token}`, user_email: userEmail, token })
      .onConflict('session_id')
      .ignore();
  }

  async isMarketingOptedOut(userEmail: string): Promise<boolean> {
    const row = await this.database('email_preferences')
      .join('users', 'users.id', 'email_preferences.user_id')
      .where('users.email', userEmail)
      .where('email_preferences.marketing_opt_out', true)
      .first();
    return row != null;
  }

  async hasLifetimeOrActiveSubscription(userEmail: string): Promise<boolean> {
    const lifetimeUser = await this.database('users')
      .where('email', userEmail)
      .where('patreon', true)
      .first();
    if (lifetimeUser != null) {
      return true;
    }
    const activeSubscription = await this.database('subscriptions')
      .where('active', true)
      .where(function () {
        this.where('email', userEmail).orWhere('linked_email', userEmail);
      })
      .first();
    return activeSubscription != null;
  }

  async hasSendSince(userEmail: string, since: Date): Promise<boolean> {
    const row = await this.database<AbandonedCheckoutRecoveryRow>(this.table)
      .where('user_email', userEmail)
      .where('sent_at', '>', since)
      .first();
    return row != null;
  }

  async getRecoveryByToken(
    token: string
  ): Promise<CheckoutRecoveryLookup | null> {
    const row = await this.database<AbandonedCheckoutRecoveryRow>(this.table)
      .where('token', token)
      .first();
    if (row == null) {
      return null;
    }
    return {
      recoveryUrl: row.recovery_url ?? null,
      recoveryUrlExpiresAt:
        row.recovery_url_expires_at == null
          ? null
          : new Date(row.recovery_url_expires_at),
    };
  }
}

export class InMemoryAbandonedCheckoutRecoveryRepository implements IAbandonedCheckoutRecoveryRepository {
  private readonly claimed = new Set<string>();
  private readonly optedOut = new Set<string>();
  private readonly payingEmails = new Set<string>();
  private readonly lastSendByEmail = new Map<string, Date>();
  private readonly tokensByEmail = new Map<string, string>();
  private readonly tokensBySessionId = new Map<string, string>();
  private readonly recoveryByToken = new Map<string, CheckoutRecoveryLookup>();

  async claimSession(
    sessionId: string,
    _userEmail: string,
    token: string,
    recovery: CheckoutRecoveryDetails | null = null
  ): Promise<boolean> {
    if (this.claimed.has(sessionId)) {
      return false;
    }
    this.claimed.add(sessionId);
    this.tokensBySessionId.set(sessionId, token);
    this.recoveryByToken.set(token, {
      recoveryUrl: recovery?.url ?? null,
      recoveryUrlExpiresAt: recovery?.expiresAt ?? null,
    });
    return true;
  }

  async recordEmailSend(userEmail: string, token: string): Promise<void> {
    this.tokensByEmail.set(userEmail, token);
    this.recoveryByToken.set(token, {
      recoveryUrl: null,
      recoveryUrlExpiresAt: null,
    });
  }

  async isMarketingOptedOut(userEmail: string): Promise<boolean> {
    return this.optedOut.has(userEmail);
  }

  async hasLifetimeOrActiveSubscription(userEmail: string): Promise<boolean> {
    return this.payingEmails.has(userEmail);
  }

  async hasSendSince(userEmail: string, since: Date): Promise<boolean> {
    const lastSend = this.lastSendByEmail.get(userEmail);
    return lastSend != null && lastSend > since;
  }

  async getRecoveryByToken(
    token: string
  ): Promise<CheckoutRecoveryLookup | null> {
    return this.recoveryByToken.get(token) ?? null;
  }

  seedOptedOut(userEmail: string): void {
    this.optedOut.add(userEmail);
  }

  seedPaying(userEmail: string): void {
    this.payingEmails.add(userEmail);
  }

  seedSendAt(userEmail: string, sentAt: Date): void {
    this.lastSendByEmail.set(userEmail, sentAt);
  }

  getClaimedSessions(): ReadonlySet<string> {
    return this.claimed;
  }

  getTokenForEmail(userEmail: string): string | undefined {
    return this.tokensByEmail.get(userEmail);
  }

  getTokenForSession(sessionId: string): string | undefined {
    return this.tokensBySessionId.get(sessionId);
  }

  clear(): void {
    this.claimed.clear();
    this.optedOut.clear();
    this.payingEmails.clear();
    this.lastSendByEmail.clear();
    this.tokensByEmail.clear();
    this.tokensBySessionId.clear();
    this.recoveryByToken.clear();
  }
}

export default AbandonedCheckoutRecoveryRepository;
