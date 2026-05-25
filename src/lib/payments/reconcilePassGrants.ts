import type { Knex } from 'knex';

export interface StripeListParams {
  created?: { gte?: number };
  limit?: number;
}

export interface StripePaymentIntent {
  id: string;
  status: string;
  created: number;
  metadata: Record<string, string> | null;
}

export interface StripeClient {
  paymentIntents: {
    list(params: StripeListParams): Promise<{ data: StripePaymentIntent[] }>;
  };
}

export interface PassGrantMismatch {
  paymentIntentId: string;
  passKind: string;
  userId: number | null;
  sessionId: string;
  reason: 'missing_from_user_passes' | 'missing_from_anonymous_passes';
}

export interface ReconcilePassGrantsResult {
  checked: number;
  healed: number;
  alerts: PassGrantMismatch[];
}

interface UserPassRow {
  stripe_payment_intent_id: string;
}

interface AnonymousPassRow {
  payment_intent_id: string;
}

interface SessionMetadata {
  pass_kind?: string;
  pass_anonymous?: string;
  user_id?: string;
}

const DURATION_24H_MS = 24 * 60 * 60 * 1000;
const DURATION_7D_MS = 7 * 24 * 60 * 60 * 1000;

const durationFor = (kind: string): number =>
  kind === '7d' ? DURATION_7D_MS : DURATION_24H_MS;

export const reconcilePassGrants = async (
  stripe: StripeClient,
  db: Knex,
  windowHours = 1
): Promise<ReconcilePassGrantsResult> => {
  const since = Math.floor((Date.now() - windowHours * 60 * 60 * 1000) / 1000);

  const intents = await stripe.paymentIntents.list({
    created: { gte: since },
    limit: 100,
  });

  let checked = 0;
  let healed = 0;
  const alerts: PassGrantMismatch[] = [];

  for (const intent of intents.data) {
    if (intent.status !== 'succeeded') {
      continue;
    }

    const sessionId = (intent.metadata as Record<string, string>)?.checkout_session_id ?? null;
    if (sessionId == null) {
      continue;
    }

    const meta = (intent.metadata ?? {}) as SessionMetadata;
    const passKind = meta.pass_kind;
    if (passKind !== '24h' && passKind !== '7d') {
      continue;
    }

    checked++;
    const isAnonymous = meta.pass_anonymous === '1';

    if (isAnonymous) {
      const existing = await db<AnonymousPassRow>('anonymous_passes')
        .where('payment_intent_id', intent.id)
        .first();

      if (existing == null) {
        const mismatch: PassGrantMismatch = {
          paymentIntentId: intent.id,
          passKind,
          userId: null,
          sessionId,
          reason: 'missing_from_anonymous_passes',
        };
        alerts.push(mismatch);
        console.warn('[pass-reconcile] anonymous pass not found in DB, healing', {
          payment_intent_id_prefix: intent.id.slice(0, 12),
          pass_kind: passKind,
        });

        const durationMs = durationFor(passKind);
        const createdAt = new Date(intent.created * 1000);
        const expiresAt = new Date(createdAt.getTime() + durationMs);

        try {
          await db('anonymous_passes').insert({
            stripe_session_id: sessionId,
            kind: passKind,
            expires_at: expiresAt,
            payment_intent_id: intent.id,
          }).onConflict('stripe_session_id').ignore();
          healed++;
        } catch (err) {
          console.error('[pass-reconcile] failed to heal anonymous pass', err);
        }
      }
    } else {
      const rawUserId = meta.user_id;
      const userId = rawUserId == null ? null : Number.parseInt(rawUserId, 10);
      if (userId == null || Number.isNaN(userId) || userId <= 0) {
        continue;
      }

      const existing = await db<UserPassRow>('user_passes')
        .where('stripe_payment_intent_id', intent.id)
        .first();

      if (existing == null) {
        const mismatch: PassGrantMismatch = {
          paymentIntentId: intent.id,
          passKind,
          userId,
          sessionId,
          reason: 'missing_from_user_passes',
        };
        alerts.push(mismatch);
        console.warn('[pass-reconcile] user pass not found in DB, healing', {
          user_id: userId,
          pass_kind: passKind,
          payment_intent_id_prefix: intent.id.slice(0, 12),
        });

        const durationMs = durationFor(passKind);
        const createdAt = new Date(intent.created * 1000);
        const expiresAt = new Date(createdAt.getTime() + durationMs);

        try {
          await db('user_passes').insert({
            user_id: userId,
            kind: passKind,
            expires_at: expiresAt,
            stripe_payment_intent_id: intent.id,
          }).onConflict('stripe_payment_intent_id').ignore();
          healed++;
        } catch (err) {
          console.error('[pass-reconcile] failed to heal user pass', err);
        }
      }
    }
  }

  if (alerts.length > 0) {
    console.error('[pass-reconcile] mismatches found', {
      count: alerts.length,
      healed,
      window_hours: windowHours,
    });
  }

  return { checked, healed, alerts };
};
