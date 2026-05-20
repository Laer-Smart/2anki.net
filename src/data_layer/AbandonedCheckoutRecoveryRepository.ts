import type { Knex } from 'knex';

export interface IAbandonedCheckoutRecoveryRepository {
  claimSession(sessionId: string, userEmail: string): Promise<boolean>;
}

interface AbandonedCheckoutRecoveryRow {
  session_id: string;
  user_email: string;
  sent_at: Date;
}

export class AbandonedCheckoutRecoveryRepository
  implements IAbandonedCheckoutRecoveryRepository
{
  private readonly table = 'abandoned_checkout_recovery_emails';

  constructor(private readonly database: Knex) {}

  async claimSession(sessionId: string, userEmail: string): Promise<boolean> {
    const rows = await this.database<AbandonedCheckoutRecoveryRow>(this.table)
      .insert({ session_id: sessionId, user_email: userEmail })
      .onConflict('session_id')
      .ignore()
      .returning('session_id');
    return rows.length > 0;
  }
}

export class InMemoryAbandonedCheckoutRecoveryRepository
  implements IAbandonedCheckoutRecoveryRepository
{
  private readonly claimed = new Set<string>();

  async claimSession(sessionId: string, _userEmail: string): Promise<boolean> {
    if (this.claimed.has(sessionId)) {
      return false;
    }
    this.claimed.add(sessionId);
    return true;
  }

  getClaimedSessions(): ReadonlySet<string> {
    return this.claimed;
  }

  clear(): void {
    this.claimed.clear();
  }
}

export default AbandonedCheckoutRecoveryRepository;
