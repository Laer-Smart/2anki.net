import type { Knex } from 'knex';

export interface LandingPageYieldRow {
  origin: string | null;
  signups: number;
  subscription_conversions: number;
  pass_conversions: number;
  paid_conversions: number;
}

export interface ILandingPageYieldRepository {
  groupByOrigin(since: Date): Promise<LandingPageYieldRow[]>;
}

const ACTIVE_SUBSCRIPTION_EXISTS = `exists (
  select 1 from subscriptions s
  where s.active = true
  and (
    lower(trim(users.email)) = lower(trim(s.email))
    or lower(trim(users.email)) = s.linked_email
  )
)`;

const PURCHASED_PASS_EXISTS = `exists (
  select 1 from user_passes up where up.user_id = users.id
)`;

export function buildLandingPageYieldQuery(
  database: Knex,
  since: Date
): Knex.QueryBuilder {
  return database('users')
    .select(database.raw('users.signup_origin as origin'))
    .select(database.raw('count(*) as signups'))
    .select(
      database.raw(
        `count(*) filter (where ${ACTIVE_SUBSCRIPTION_EXISTS}) as subscription_conversions`
      )
    )
    .select(
      database.raw(
        `count(*) filter (where ${PURCHASED_PASS_EXISTS}) as pass_conversions`
      )
    )
    .select(
      database.raw(
        `count(*) filter (where ${ACTIVE_SUBSCRIPTION_EXISTS} or ${PURCHASED_PASS_EXISTS}) as paid_conversions`
      )
    )
    .where('users.created_at', '>=', since)
    .groupBy('users.signup_origin')
    .orderBy('signups', 'desc');
}

export class LandingPageYieldRepository implements ILandingPageYieldRepository {
  constructor(private readonly database: Knex) {}

  async groupByOrigin(since: Date): Promise<LandingPageYieldRow[]> {
    const rows = (await buildLandingPageYieldQuery(
      this.database,
      since
    )) as Array<{
      origin: string | null;
      signups: string | number;
      subscription_conversions: string | number;
      pass_conversions: string | number;
      paid_conversions: string | number;
    }>;

    return rows.map((row) => ({
      origin: row.origin ?? null,
      signups: Number(row.signups),
      subscription_conversions: Number(row.subscription_conversions),
      pass_conversions: Number(row.pass_conversions),
      paid_conversions: Number(row.paid_conversions),
    }));
  }
}

export default LandingPageYieldRepository;
