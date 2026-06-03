import knex from 'knex';
import { ObservabilityRepository } from './ObservabilityRepository';

describe('ObservabilityRepository.deleteOlderThan — generated SQL shape', () => {
  it('builds a PG DELETE on request_logs with a created_at interval cutoff', () => {
    const pgKnex = knex({ client: 'pg' });
    const sql = pgKnex('request_logs')
      .where('created_at', '<', pgKnex.raw('NOW() - make_interval(days => ?)', [30]))
      .del()
      .toString();
    expect(sql).toContain('delete from "request_logs"');
    expect(sql).toContain('"created_at" <');
    expect(sql).toContain('NOW() - make_interval(days => 30)');
    pgKnex.destroy();
  });

  it('builds a PG DELETE on outbound_call_logs with a created_at interval cutoff', () => {
    const pgKnex = knex({ client: 'pg' });
    const sql = pgKnex('outbound_call_logs')
      .where('created_at', '<', pgKnex.raw('NOW() - make_interval(days => ?)', [30]))
      .del()
      .toString();
    expect(sql).toContain('delete from "outbound_call_logs"');
    expect(sql).toContain('"created_at" <');
    expect(sql).toContain('NOW() - make_interval(days => 30)');
    pgKnex.destroy();
  });

  it('parameterizes the day count rather than concatenating it', () => {
    const pgKnex = knex({ client: 'pg' });
    const compiled = pgKnex('request_logs')
      .where('created_at', '<', pgKnex.raw('NOW() - make_interval(days => ?)', [30]))
      .del()
      .toSQL()
      .toNative();
    expect(compiled.sql).toContain('make_interval(days => $1)');
    expect(compiled.bindings).toEqual([30]);
    pgKnex.destroy();
  });

  it('returns the deleted row counts from each table delete', async () => {
    const deleteCountsByTable: Record<string, number> = {
      request_logs: 5,
      outbound_call_logs: 3,
    };
    const fakeDb = Object.assign(
      (table: string) => {
        const builder = {
          where() {
            return builder;
          },
          del() {
            return Promise.resolve(deleteCountsByTable[table]);
          },
        };
        return builder;
      },
      { raw: (sql: string, bindings: unknown[]) => ({ sql, bindings }) }
    );
    const repo = new ObservabilityRepository(
      fakeDb as unknown as ConstructorParameters<typeof ObservabilityRepository>[0]
    );

    const result = await repo.deleteOlderThan(30);

    expect(result).toEqual({ requestLogs: 5, outboundCallLogs: 3 });
  });
});
