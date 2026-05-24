exports.up = async function up(knex) {
  await knex.schema.createTable('deleted_user_usage', (table) => {
    table.specificType('email_sha256', 'char(64)').primary();
    table.integer('cards_used_this_month').notNullable().defaultTo(0);
    table.timestamp('cards_month_started_at', { useTz: true }).nullable();
    table.integer('pdf_prints_this_month').notNullable().defaultTo(0);
    table.timestamp('prints_month_started_at', { useTz: true }).nullable();
    table
      .timestamp('deleted_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    'CREATE INDEX deleted_user_usage_deleted_at_idx ON deleted_user_usage (deleted_at)'
  );
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('deleted_user_usage');
};
