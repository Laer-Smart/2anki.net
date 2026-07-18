import express, { RequestHandler } from 'express';
import {
  createOAuthMetadata,
  mcpAuthMetadataRouter,
  getOAuthProtectedResourceMetadataUrl,
} from '@modelcontextprotocol/sdk/server/auth/router.js';
import { authorizationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/authorize.js';
import { tokenHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/token.js';
import { clientRegistrationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/register.js';
import { revocationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/revoke.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import type { OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';

export const MCP_AUTHORIZE_PATH = '/mcp/authorize';
export const MCP_TOKEN_PATH = '/mcp/token';
export const MCP_REGISTER_PATH = '/mcp/register';
export const MCP_REVOKE_PATH = '/mcp/revoke';

export interface McpRouterDeps {
  provider: OAuthServerProvider;
  issuerUrl: URL;
  resourceUrl: URL;
  onAuthenticatedPost: RequestHandler;
}

export function createMcpRouter(deps: McpRouterDeps): express.Router {
  const router = express.Router();
  const { provider, issuerUrl, resourceUrl } = deps;

  const baseMetadata = createOAuthMetadata({
    provider,
    issuerUrl,
    scopesSupported: ['mcp'],
  });
  const oauthMetadata = {
    ...baseMetadata,
    authorization_endpoint: new URL(MCP_AUTHORIZE_PATH, issuerUrl).href,
    token_endpoint: new URL(MCP_TOKEN_PATH, issuerUrl).href,
    ...(baseMetadata.registration_endpoint
      ? { registration_endpoint: new URL(MCP_REGISTER_PATH, issuerUrl).href }
      : {}),
    ...(baseMetadata.revocation_endpoint
      ? { revocation_endpoint: new URL(MCP_REVOKE_PATH, issuerUrl).href }
      : {}),
  };

  router.use(
    mcpAuthMetadataRouter({
      oauthMetadata,
      resourceServerUrl: resourceUrl,
      scopesSupported: ['mcp'],
      resourceName: '2anki',
    })
  );

  router.use(MCP_AUTHORIZE_PATH, authorizationHandler({ provider }));
  router.use(MCP_TOKEN_PATH, tokenHandler({ provider }));
  if (baseMetadata.registration_endpoint) {
    router.use(
      MCP_REGISTER_PATH,
      clientRegistrationHandler({ clientsStore: provider.clientsStore })
    );
  }
  if (baseMetadata.revocation_endpoint) {
    router.use(MCP_REVOKE_PATH, revocationHandler({ provider }));
  }

  const bearer = requireBearerAuth({
    verifier: provider,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(resourceUrl),
  });

  router.post('/mcp', bearer, deps.onAuthenticatedPost);
  router.get('/mcp', bearer, (_req, res) => {
    res.set('Allow', 'POST');
    res.status(405).json({ error: 'method_not_allowed' });
  });
  router.delete('/mcp', bearer, (_req, res) => {
    res.set('Allow', 'POST');
    res.status(405).json({ error: 'method_not_allowed' });
  });

  return router;
}
