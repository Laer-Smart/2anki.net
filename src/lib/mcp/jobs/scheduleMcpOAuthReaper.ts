import type { IMcpAuthorizationCodeRepository } from '../../../data_layer/McpAuthorizationCodeRepository';
import type { IMcpOAuthClientRepository } from '../../../data_layer/McpOAuthClientRepository';
import type { IMcpTokenRepository } from '../../../data_layer/McpTokenRepository';

export const MCP_OAUTH_REAP_INTERVAL_MS = 60 * 60 * 1000;

export const MCP_ORPHAN_CLIENT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface McpOAuthReaperRepos {
  authorizationCodes: Pick<IMcpAuthorizationCodeRepository, 'deleteExpired'>;
  tokens: Pick<
    IMcpTokenRepository,
    'deleteExpiredAccessTokens' | 'deleteExpiredRefreshTokens'
  >;
  clients: Pick<IMcpOAuthClientRepository, 'deleteOrphaned'>;
}

export interface McpOAuthReapResult {
  authorizationCodes: number;
  accessTokens: number;
  refreshTokens: number;
  orphanedClients: number;
}

export const reapMcpOAuth = async (
  repos: McpOAuthReaperRepos,
  now: Date
): Promise<McpOAuthReapResult> => {
  const authorizationCodes = await repos.authorizationCodes.deleteExpired(now);
  const accessTokens = await repos.tokens.deleteExpiredAccessTokens(now);
  const refreshTokens = await repos.tokens.deleteExpiredRefreshTokens(now);

  const orphanCutoffSeconds = Math.floor(
    (now.getTime() - MCP_ORPHAN_CLIENT_MAX_AGE_MS) / 1000
  );
  const orphanedClients =
    await repos.clients.deleteOrphaned(orphanCutoffSeconds);

  return { authorizationCodes, accessTokens, refreshTokens, orphanedClients };
};

export const scheduleMcpOAuthReaper = (
  repos: McpOAuthReaperRepos,
  options: { intervalMs?: number } = {}
): NodeJS.Timeout => {
  const intervalMs = options.intervalMs ?? MCP_OAUTH_REAP_INTERVAL_MS;

  const tick = async () => {
    try {
      const result = await reapMcpOAuth(repos, new Date());
      console.info(
        `[mcp-oauth-reaper] completed — deleted ${result.authorizationCodes} authorization code(s), ` +
          `${result.accessTokens} access token(s), ${result.refreshTokens} refresh token(s), ` +
          `${result.orphanedClients} orphaned client(s)`
      );
    } catch (error) {
      console.error('[mcp-oauth-reaper] tick failed', error);
    }
  };

  const handle = setInterval(tick, intervalMs);
  handle.unref();
  return handle;
};
