module.exports.up = async function (knex) {
  await knex.schema.alterTable('deck_shares', (table) => {
    table.boolean('is_public').notNullable().defaultTo(false);
    table.string('title', 120).nullable();
    table.integer('card_count').nullable();
  });
};

module.exports.down = async function (knex) {
  await knex.schema.alterTable('deck_shares', (table) => {
    table.dropColumn('is_public');
    table.dropColumn('title');
    table.dropColumn('card_count');
  });
};
