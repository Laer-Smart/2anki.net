exports.up = (knex) =>
  knex.schema.alterTable('emoji_feedback', (table) => {
    table.index(['created_at'], 'emoji_feedback_created_at_idx');
  });

exports.down = (knex) =>
  knex.schema.alterTable('emoji_feedback', (table) => {
    table.dropIndex(['created_at'], 'emoji_feedback_created_at_idx');
  });
