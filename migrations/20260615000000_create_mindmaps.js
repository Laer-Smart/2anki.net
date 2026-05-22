exports.up = async (knex) => {
  await knex.schema.createTable('mindmaps', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('title').notNullable().defaultTo('Untitled');
    t.jsonb('data').notNullable().defaultTo(JSON.stringify({ nodes: [], edges: [] }));
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['user_id'], 'mindmaps_user_id_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('mindmaps');
};
