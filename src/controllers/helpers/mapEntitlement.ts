import { PlanSource } from '../../routes/middleware/configureUserLocal';
import { PassKind } from '../../data_layer/UserPassRepository';

export type EntitlementPassKind = PassKind | 'unlimited' | null;

export interface Entitlement {
  passKind: EntitlementPassKind;
  passExpiresAt: string | null;
  planSource: PlanSource;
}

const PASS_KINDS: readonly PassKind[] = ['24h', '7d', 'unlimited'];
const PLAN_SOURCES: readonly Exclude<PlanSource, null>[] = [
  'stripe',
  'apple',
  'lifetime',
];

function readPassKind(value: unknown): PassKind | null {
  return PASS_KINDS.includes(value as PassKind) ? (value as PassKind) : null;
}

function readPlanSource(value: unknown): PlanSource {
  return PLAN_SOURCES.includes(value as Exclude<PlanSource, null>)
    ? (value as PlanSource)
    : null;
}

function readPassExpiresAt(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function mapEntitlement(locals: Record<string, unknown>): Entitlement {
  const explicitPassKind = readPassKind(locals.passKind);
  const isSubscriber = locals.subscriber === true;
  const passKind = explicitPassKind ?? (isSubscriber ? 'unlimited' : null);

  return {
    passKind,
    passExpiresAt: readPassExpiresAt(locals.passExpiresAt),
    planSource: readPlanSource(locals.planSource),
  };
}
