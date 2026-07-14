module.exports.up = async function (knex) {
  await knex.schema.createTable('pass_winback_notifications', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('campaign').notNullable();
    table.string('token').notNullable();
    table.timestamp('notified_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['user_id', 'campaign'], {
      indexName: 'pass_winback_notifications_user_campaign_uq',
    });
    table.index('token', 'pass_winback_notifications_token_idx');
  });
};

module.exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('pass_winback_notifications');
};
