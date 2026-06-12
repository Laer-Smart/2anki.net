module.exports.up = async function (knex) {
  await knex.schema.createTable(
    'subscription_recovery_notifications',
    (table) => {
      table.increments('id').primary();
      table.string('email_hash').notNullable();
      table.timestamp('notified_at').notNullable().defaultTo(knex.fn.now());
      table.index(
        'email_hash',
        'subscription_recovery_notifications_email_hash_idx'
      );
    }
  );
};

module.exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('subscription_recovery_notifications');
};
