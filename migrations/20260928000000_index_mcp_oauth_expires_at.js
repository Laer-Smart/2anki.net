module.exports.up = async function (knex) {
  await knex.schema.alterTable('mcp_authorization_codes', (table) => {
    table.index(['expires_at'], 'mcp_authorization_codes_expires_at_idx');
  });
  await knex.schema.alterTable('mcp_access_tokens', (table) => {
    table.index(['expires_at'], 'mcp_access_tokens_expires_at_idx');
  });
  await knex.schema.alterTable('mcp_refresh_tokens', (table) => {
    table.index(['expires_at'], 'mcp_refresh_tokens_expires_at_idx');
  });
};

module.exports.down = async function (knex) {
  await knex.schema.alterTable('mcp_authorization_codes', (table) => {
    table.dropIndex(['expires_at'], 'mcp_authorization_codes_expires_at_idx');
  });
  await knex.schema.alterTable('mcp_access_tokens', (table) => {
    table.dropIndex(['expires_at'], 'mcp_access_tokens_expires_at_idx');
  });
  await knex.schema.alterTable('mcp_refresh_tokens', (table) => {
    table.dropIndex(['expires_at'], 'mcp_refresh_tokens_expires_at_idx');
  });
};
