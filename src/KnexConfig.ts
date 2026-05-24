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
  },
};

export default KnexConfig;
