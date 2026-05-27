import type { Knex } from 'knex';

export interface IAbandonedCheckoutRecoveryRepository {
  claimSession(sessionId: string, userEmail: string, token: string): Promise<boolean>;
  recordEmailSend(userEmail: string, token: string): Promise<void>;
  isMarketingOptedOut(userEmail: string): Promise<boolean>;
}

interface AbandonedCheckoutRecoveryRow {
  session_id: string;
  user_email: string;
  sent_at: Date;
  token: string | null;
}

export class AbandonedCheckoutRecoveryRepository
  implements IAbandonedCheckoutRecoveryRepository
{
  private readonly table = 'abandoned_checkout_recovery_emails';

  constructor(private readonly database: Knex) {}

  async claimSession(sessionId: string, userEmail: string, token: string): Promise<boolean> {
    const rows = await this.database<AbandonedCheckoutRecoveryRow>(this.table)
      .insert({ session_id: sessionId, user_email: userEmail, token })
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
}

export class InMemoryAbandonedCheckoutRecoveryRepository
  implements IAbandonedCheckoutRecoveryRepository
{
  private readonly claimed = new Set<string>();
  private readonly optedOut = new Set<string>();
  private readonly tokensByEmail = new Map<string, string>();
  private readonly tokensBySessionId = new Map<string, string>();

  async claimSession(sessionId: string, _userEmail: string, token: string): Promise<boolean> {
    if (this.claimed.has(sessionId)) {
      return false;
    }
    this.claimed.add(sessionId);
    this.tokensBySessionId.set(sessionId, token);
    return true;
  }

  async recordEmailSend(userEmail: string, token: string): Promise<void> {
    this.tokensByEmail.set(userEmail, token);
  }

  async isMarketingOptedOut(userEmail: string): Promise<boolean> {
    return this.optedOut.has(userEmail);
  }

  seedOptedOut(userEmail: string): void {
    this.optedOut.add(userEmail);
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
    this.tokensByEmail.clear();
    this.tokensBySessionId.clear();
  }
}

export default AbandonedCheckoutRecoveryRepository;
