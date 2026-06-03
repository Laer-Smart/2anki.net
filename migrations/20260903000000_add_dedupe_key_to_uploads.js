exports.up = async (knex) => {
  await knex.schema.alterTable('uploads', (t) => {
    t.text('dedupe_key').nullable().defaultTo(null);
  });
  await knex.schema.raw(
    'CREATE UNIQUE INDEX uploads_owner_dedupe_key_unique ON uploads (owner, dedupe_key) WHERE dedupe_key IS NOT NULL'
  );
};

exports.down = async (knex) => {
  await knex.schema.raw('DROP INDEX IF EXISTS uploads_owner_dedupe_key_unique');
  await knex.schema.alterTable('uploads', (t) => {
    t.dropColumn('dedupe_key');
  });
};
