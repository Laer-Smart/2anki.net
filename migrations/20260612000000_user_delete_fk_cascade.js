exports.up = async (knex) => {
  await knex.schema.table('inactivity_emails', (table) => {
    table.dropForeign(['user_id']);
  });
  await knex.schema.table('inactivity_emails', (table) => {
    table
      .foreign('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
  });

  await knex.schema.table('re_engagement_emails', (table) => {
    table.dropForeign(['user_id']);
  });
  await knex.schema.table('re_engagement_emails', (table) => {
    table
      .foreign('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('inactivity_emails', (table) => {
    table.dropForeign(['user_id']);
  });
  await knex.schema.table('inactivity_emails', (table) => {
    table.foreign('user_id').references('id').inTable('users');
  });

  await knex.schema.table('re_engagement_emails', (table) => {
    table.dropForeign(['user_id']);
  });
  await knex.schema.table('re_engagement_emails', (table) => {
    table.foreign('user_id').references('id').inTable('users');
  });
};
