module.exports.up = async function (knex) {
  await knex.schema.alterTable('deck_shares', (table) => {
    table.boolean('is_public').notNullable().defaultTo(false);
    table.string('title', 120).nullable();
    table.integer('card_count').nullable();
  });
  await knex.raw(
    'create index deck_shares_public_listing_idx on deck_shares (created_at desc) where is_public = true and revoked_at is null'
  );
};

module.exports.down = async function (knex) {
  await knex.raw('drop index if exists deck_shares_public_listing_idx');
  await knex.schema.alterTable('deck_shares', (table) => {
    table.dropColumn('is_public');
    table.dropColumn('title');
    table.dropColumn('card_count');
  });
};
