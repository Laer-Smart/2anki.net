module.exports.up = async function (knex) {
  await knex.schema.createTable('conversion_output_stats', (table) => {
    table.text('source').primary();
    table.bigInteger('decks').notNullable().defaultTo(0);
    table.bigInteger('cards').notNullable().defaultTo(0);
    table.bigInteger('empty_back_cards').notNullable().defaultTo(0);
    table.timestamp('first_seen').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_seen').notNullable().defaultTo(knex.fn.now());
  });
};

module.exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('conversion_output_stats');
};
