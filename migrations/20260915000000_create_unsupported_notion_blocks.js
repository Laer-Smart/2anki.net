module.exports.up = async function (knex) {
  await knex.schema.createTable('unsupported_notion_blocks', (table) => {
    table.text('block_type').primary();
    table.bigInteger('occurrences').notNullable().defaultTo(0);
    table.timestamp('first_seen').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_seen').notNullable().defaultTo(knex.fn.now());
  });
};

module.exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('unsupported_notion_blocks');
};
