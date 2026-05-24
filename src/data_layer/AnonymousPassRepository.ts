import type { Knex } from 'knex';
import type { PassKind } from './UserPassRepository';

export interface AnonymousPass {
  id: number;
  stripe_session_id: string;
  kind: PassKind;
  expires_at: Date;
  payment_intent_id: string;
}

export interface IAnonymousPassRepository {
  findBySessionId(stripeSessionId: string): Promise<AnonymousPass | null>;
  findActive(stripeSessionId: string, now: Date): Promise<AnonymousPass | null>;
  insert(params: {
    stripeSessionId: string;
    kind: PassKind;
    expiresAt: Date;
    paymentIntentId: string;
  }): Promise<AnonymousPass>;
}

interface AnonymousPassRow {
  id: number;
  stripe_session_id: string;
  kind: string;
  expires_at: Date;
  payment_intent_id: string;
}

function toAnonymousPass(row: AnonymousPassRow): AnonymousPass {
  return {
    id: row.id,
    stripe_session_id: row.stripe_session_id,
    kind: row.kind as PassKind,
    expires_at: row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at),
    payment_intent_id: row.payment_intent_id,
  };
}

export class AnonymousPassRepository implements IAnonymousPassRepository {
  private readonly table = 'anonymous_passes';

  constructor(private readonly database: Knex) {}

  async findBySessionId(stripeSessionId: string): Promise<AnonymousPass | null> {
    const row = await this.database<AnonymousPassRow>(this.table)
      .where('stripe_session_id', stripeSessionId)
      .first();
    return row ? toAnonymousPass(row) : null;
  }

  async findActive(stripeSessionId: string, now: Date): Promise<AnonymousPass | null> {
    const row = await this.database<AnonymousPassRow>(this.table)
      .where('stripe_session_id', stripeSessionId)
      .where('expires_at', '>', now)
      .first();
    return row ? toAnonymousPass(row) : null;
  }

  async insert(params: {
    stripeSessionId: string;
    kind: PassKind;
    expiresAt: Date;
    paymentIntentId: string;
  }): Promise<AnonymousPass> {
    const existing = await this.database<AnonymousPassRow>(this.table)
      .where('stripe_session_id', params.stripeSessionId)
      .first();
    if (existing) {
      return toAnonymousPass(existing);
    }

    try {
      const [row] = await this.database<AnonymousPassRow>(this.table)
        .insert({
          stripe_session_id: params.stripeSessionId,
          kind: params.kind,
          expires_at: params.expiresAt,
          payment_intent_id: params.paymentIntentId,
        })
        .returning('*');
      return toAnonymousPass(row);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        const idempotent = await this.database<AnonymousPassRow>(this.table)
          .where('stripe_session_id', params.stripeSessionId)
          .first();
        if (idempotent) return toAnonymousPass(idempotent);
      }
      throw err;
    }
  }
}

export class InMemoryAnonymousPassRepository implements IAnonymousPassRepository {
  private readonly rows: AnonymousPass[] = [];
  private nextId = 1;

  async findBySessionId(stripeSessionId: string): Promise<AnonymousPass | null> {
    return this.rows.find((r) => r.stripe_session_id === stripeSessionId) ?? null;
  }

  async findActive(stripeSessionId: string, now: Date): Promise<AnonymousPass | null> {
    const row = this.rows.find(
      (r) => r.stripe_session_id === stripeSessionId && r.expires_at > now
    );
    return row ?? null;
  }

  async insert(params: {
    stripeSessionId: string;
    kind: PassKind;
    expiresAt: Date;
    paymentIntentId: string;
  }): Promise<AnonymousPass> {
    const existing = this.rows.find((r) => r.stripe_session_id === params.stripeSessionId);
    if (existing) return existing;

    const entry: AnonymousPass = {
      id: this.nextId++,
      stripe_session_id: params.stripeSessionId,
      kind: params.kind,
      expires_at: params.expiresAt,
      payment_intent_id: params.paymentIntentId,
    };
    this.rows.push(entry);
    return entry;
  }

  clear(): void {
    this.rows.length = 0;
    this.nextId = 1;
  }
}

export default AnonymousPassRepository;
