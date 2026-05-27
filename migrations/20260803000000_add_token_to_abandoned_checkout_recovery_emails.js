exports.up = async (knex) => {
  await knex.schema.alterTable('abandoned_checkout_recovery_emails', (t) => {
    t.string('token', 128).nullable().unique();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('abandoned_checkout_recovery_emails', (t) => {
    t.dropColumn('token');
  });
};
