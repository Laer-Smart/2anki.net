exports.up = async function (knex) {
  await knex.schema.createTable('pause_resume_warning_notices', function (table) {
    table.increments('id').primary();
    table.string('subscription_email', 255).notNullable();
    table.timestamp('resumes_at', { useTz: true }).notNullable();
    table.timestamp('sent_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['subscription_email', 'resumes_at'], {
      indexName: 'pause_resume_notice_unique',
    });
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('pause_resume_warning_notices');
};
