exports.up = async (knex) => {
  await knex.schema.table('email_preferences', (table) => {
    table.dropForeign(['user_id']);
    table
      .foreign('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
  });

  await knex.schema.table('favorites', (table) => {
    table.dropForeign(['owner']);
    table.foreign('owner').references('id').inTable('users').onDelete('CASCADE');
  });

  await knex.raw(
    'CREATE INDEX IF NOT EXISTS favorites_owner_index ON favorites (owner)'
  );
};

exports.down = async (knex) => {
  await knex.raw('DROP INDEX IF EXISTS favorites_owner_index');

  await knex.schema.table('email_preferences', (table) => {
    table.dropForeign(['user_id']);
    table
      .foreign('user_id')
      .references('id')
      .inTable('users')
      .onDelete('NO ACTION');
  });

  await knex.schema.table('favorites', (table) => {
    table.dropForeign(['owner']);
    table.foreign('owner').references('id').inTable('users').onDelete('NO ACTION');
  });
};
