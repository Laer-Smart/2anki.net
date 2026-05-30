import { Knex } from 'knex';

const KnexConfig: Knex.Config = {
  client: 'pg',
  connection:
    process.env.DATABASE_URL || 'postgresql://aa:focaccia@localhost:5432/n',
  pool: {
    min: 2,
    max: 20,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: process.env.MIGRATIONS_DIR || 'migrations',
    // Local dev DBs accumulate knex_migrations rows for files that were later
    // renamed on main, which makes migrate.latest() crash the boot with
    // "migration directory is corrupt". Skip that check in local dev only;
    // prod and CI keep strict validation.
    disableMigrationsListValidation: process.env.LOCAL_DEV === 'true',
  },
};

export default KnexConfig;
