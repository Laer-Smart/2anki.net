module.exports.up = async function (knex) {
  await knex.schema.createTable('api_keys', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('name', 120).notNullable();
    table.string('key_hash', 64).notNullable().unique();
    table.string('prefix', 24).notNullable();
    table.timestamp('last_used_at', { useTz: true }).nullable();
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('revoked_at', { useTz: true }).nullable();
    table.index(['user_id'], 'api_keys_user_id_idx');
  });
};

module.exports.down = async function (knex) {
  await knex.schema.dropTable('api_keys');
};
