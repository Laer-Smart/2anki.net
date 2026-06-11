module.exports.up = async function (knex) {
  await knex.schema.alterTable('ankify_notion_subscriptions', (table) => {
    table.text('target_deck').nullable();
  });
};

module.exports.down = async function (knex) {
  await knex.schema.alterTable('ankify_notion_subscriptions', (table) => {
    table.dropColumn('target_deck');
  });
};
