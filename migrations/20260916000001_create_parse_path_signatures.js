module.exports.up = async function (knex) {
  await knex.schema.createTable('parse_path_signatures', (table) => {
    table.text('parse_path').primary();
    table.bigInteger('occurrences').notNullable().defaultTo(0);
    table.timestamp('first_seen').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_seen').notNullable().defaultTo(knex.fn.now());
  });
};

module.exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('parse_path_signatures');
};
