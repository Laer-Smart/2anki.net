exports.up = async (knex) => {
  await knex.schema.createTable('error_resolutions', (t) => {
    t.specificType('message_hash', 'char(64)').primary();
    t.timestamp('resolved_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.integer('resolved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('error_resolutions');
};
