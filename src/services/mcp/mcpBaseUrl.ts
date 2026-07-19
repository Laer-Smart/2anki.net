export function mcpBaseUrl(): string {
  return (process.env.MCP_ISSUER_URL ?? 'https://2anki.net').replace(/\/$/, '');
}
