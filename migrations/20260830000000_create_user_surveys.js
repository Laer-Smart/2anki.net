const TABLE = 'user_surveys';

exports.up = async function up(knex) {
  await knex.schema.dropTableIfExists(TABLE);
  await knex.schema.createTable(TABLE, (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.text('survey_key').notNullable().defaultTo('post_login_v1');
    table.text('improvement').nullable();
    table.text('studying').nullable();
    table.text('status').notNullable();
    table.unique(['user_id', 'survey_key']);
    table.index('user_id');
    table.timestamps(true, true);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists(TABLE);
};
