exports.up = async (knex) => {
  await knex.schema.createTable('feature_flags', (t) => {
    t.text('key').primary();
    t.boolean('value').notNullable().defaultTo(false);
    t.text('description');
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    t.integer('updated_by').references('id').inTable('users').onDelete('SET NULL');
  });

  await knex('feature_flags').insert([
    {
      key: 'ai-converter-floor-v1',
      value: false,
      description:
        'AI converter floor v1 — per #2726 spec. Off by default; flip from /ops to start the canary.',
    },
  ]);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('feature_flags');
};
