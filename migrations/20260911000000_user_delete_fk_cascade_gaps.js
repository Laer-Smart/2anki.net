exports.up = async (knex) => {
  await knex.schema.table('email_preferences', (table) => {
    table.dropForeign(['user_id']);
  });
  await knex.schema.table('email_preferences', (table) => {
    table
      .foreign('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
  });

  await knex.schema.table('favorites', (table) => {
    table.dropForeign(['owner']);
  });
  await knex.schema.table('favorites', (table) => {
    table.foreign('owner').references('id').inTable('users').onDelete('CASCADE');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('email_preferences', (table) => {
    table.dropForeign(['user_id']);
  });
  await knex.schema.table('email_preferences', (table) => {
    table.foreign('user_id').references('id').inTable('users');
  });

  await knex.schema.table('favorites', (table) => {
    table.dropForeign(['owner']);
  });
  await knex.schema.table('favorites', (table) => {
    table.foreign('owner').references('id').inTable('users');
  });
};
