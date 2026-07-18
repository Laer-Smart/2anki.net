module.exports.up = async function (knex) {
  await knex.schema.createTable('mcp_oauth_clients', (table) => {
    table.string('client_id', 64).primary();
    table.string('client_name', 255).nullable();
    table.jsonb('redirect_uris').notNullable();
    table.jsonb('grant_types').notNullable();
    table.jsonb('response_types').notNullable();
    table.string('scope', 512).nullable();
    table.string('token_endpoint_auth_method', 64).notNullable().defaultTo('none');
    table.jsonb('metadata').notNullable();
    table.bigInteger('client_id_issued_at').notNullable();
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('mcp_authorization_codes', (table) => {
    table.increments('id').primary();
    table.string('code_hash', 64).notNullable().unique();
    table
      .string('client_id', 64)
      .notNullable()
      .references('client_id')
      .inTable('mcp_oauth_clients')
      .onDelete('CASCADE');
    table
      .integer('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('redirect_uri', 2048).notNullable();
    table.string('code_challenge', 128).notNullable();
    table.jsonb('scopes').notNullable();
    table.string('resource', 2048).nullable();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('consumed_at', { useTz: true }).nullable();
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('mcp_access_tokens', (table) => {
    table.increments('id').primary();
    table.string('token_hash', 64).notNullable().unique();
    table
      .string('client_id', 64)
      .notNullable()
      .references('client_id')
      .inTable('mcp_oauth_clients')
      .onDelete('CASCADE');
    table
      .integer('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.jsonb('scopes').notNullable();
    table.string('resource', 2048).nullable();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('revoked_at', { useTz: true }).nullable();
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.index(['user_id'], 'mcp_access_tokens_user_id_idx');
  });

  await knex.schema.createTable('mcp_refresh_tokens', (table) => {
    table.increments('id').primary();
    table.string('token_hash', 64).notNullable().unique();
    table
      .string('client_id', 64)
      .notNullable()
      .references('client_id')
      .inTable('mcp_oauth_clients')
      .onDelete('CASCADE');
    table
      .integer('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.jsonb('scopes').notNullable();
    table.string('resource', 2048).nullable();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('revoked_at', { useTz: true }).nullable();
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.index(['user_id'], 'mcp_refresh_tokens_user_id_idx');
  });
};

module.exports.down = async function (knex) {
  await knex.schema.dropTable('mcp_refresh_tokens');
  await knex.schema.dropTable('mcp_access_tokens');
  await knex.schema.dropTable('mcp_authorization_codes');
  await knex.schema.dropTable('mcp_oauth_clients');
};
