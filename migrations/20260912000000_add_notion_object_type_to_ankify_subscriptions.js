module.exports.up = async function (knex) {
  await knex.schema.alterTable('ankify_notion_subscriptions', (table) => {
    table.text('notion_object_type').nullable();
  });
};

module.exports.down = async function (knex) {
  await knex.schema.alterTable('ankify_notion_subscriptions', (table) => {
    table.dropColumn('notion_object_type');
  });
};
