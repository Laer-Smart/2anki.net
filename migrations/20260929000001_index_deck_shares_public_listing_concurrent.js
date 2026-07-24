exports.config = { transaction: false };

exports.up = async (knex) => {
  await knex.schema.raw(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS deck_shares_public_listing_idx ON deck_shares (created_at DESC) WHERE is_public = true AND revoked_at IS NULL'
  );
};

exports.down = async (knex) => {
  await knex.schema.raw(
    'DROP INDEX CONCURRENTLY IF EXISTS deck_shares_public_listing_idx'
  );
};
