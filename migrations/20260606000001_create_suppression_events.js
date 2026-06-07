const TABLE = 'suppression_events';

exports.up = async function up(knex) {
  await knex.schema.createTable(TABLE, (table) => {
    table.increments('id').primary();
    table.text('email_hash').notNullable();
    table.text('event_type').notNullable();
    table.text('sg_event_id').notNullable();
    table.timestamp('event_at', { useTz: true }).notNullable();
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.unique(['sg_event_id']);
    table.index(['email_hash', 'event_at']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTable(TABLE);
};
