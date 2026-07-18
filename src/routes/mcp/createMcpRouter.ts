import express, { RequestHandler } from 'express';
import {
  mcpAuthRouter,
  getOAuthProtectedResourceMetadataUrl,
} from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import type { OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';

export interface McpRouterDeps {
  provider: OAuthServerProvider;
  issuerUrl: URL;
  resourceUrl: URL;
  onAuthenticatedPost: RequestHandler;
}

export function createMcpRouter(deps: McpRouterDeps): express.Router {
  const router = express.Router();

  router.use(
    mcpAuthRouter({
      provider: deps.provider,
      issuerUrl: deps.issuerUrl,
      resourceServerUrl: deps.resourceUrl,
      scopesSupported: ['mcp'],
      resourceName: '2anki',
    }) as RequestHandler
  );

  const bearer = requireBearerAuth({
    verifier: deps.provider,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(deps.resourceUrl),
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
