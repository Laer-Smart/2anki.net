exports.up = async (knex) => {
  await knex.schema.dropTableIfExists('pitch_dismissals');
  await knex.schema.createTable('pitch_dismissals', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('placement').notNullable();
    t.timestamp('dismissed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['user_id', 'placement']);
    t.index('user_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('pitch_dismissals');
};
