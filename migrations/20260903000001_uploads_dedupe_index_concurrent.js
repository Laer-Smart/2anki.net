exports.config = { transaction: false };

exports.up = async (knex) => {
  await knex.schema.raw('DROP INDEX IF EXISTS uploads_owner_dedupe_key_unique');
  await knex.schema.raw(
    'CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uploads_owner_dedupe_key_unique ON uploads (owner, dedupe_key) WHERE dedupe_key IS NOT NULL'
  );
};

exports.down = async (knex) => {
  await knex.schema.raw('DROP INDEX IF EXISTS uploads_owner_dedupe_key_unique');
  await knex.schema.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS uploads_owner_dedupe_key_unique ON uploads (owner, dedupe_key) WHERE dedupe_key IS NOT NULL'
  );
};
