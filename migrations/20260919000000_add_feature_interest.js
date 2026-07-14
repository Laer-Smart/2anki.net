exports.up = (knex) =>
  knex.schema.createTable('feature_interest', (table) => {
    table.increments('id').primary();
    table.text('feature_key').notNullable();
    table
      .integer('user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.text('anonymous_id').nullable();
    table.text('comment').nullable();
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.index(['feature_key']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('feature_interest');
