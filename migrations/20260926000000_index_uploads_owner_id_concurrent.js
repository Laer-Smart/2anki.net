exports.config = { transaction: false };

exports.up = async (knex) => {
  await knex.schema.raw(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS uploads_owner_id_idx ON uploads (owner, id DESC)'
  );
};

exports.down = async (knex) => {
  await knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS uploads_owner_id_idx');
};
