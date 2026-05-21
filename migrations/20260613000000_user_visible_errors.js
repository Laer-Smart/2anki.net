exports.up = async (knex) => {
  await knex.schema.createTable('user_visible_errors', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.integer('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('surface').notNullable();
    t.text('code').notNullable();
    t.jsonb('context').nullable();
    t.timestamp('occurred_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['surface', 'code', 'occurred_at'], 'user_visible_errors_surface_code_occurred_at_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('user_visible_errors');
};
