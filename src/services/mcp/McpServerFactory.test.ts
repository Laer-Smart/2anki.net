import { buildMcpServer, type McpRequestContext } from './McpServerFactory';
import type { McpToolsService } from './McpToolsService';

const buildContext = (): McpRequestContext => ({
  owner: 'user-1',
  locals: {},
  toolsService: {} as McpToolsService,
  recordToolCall: () => {},
});

describe('buildMcpServer', () => {
  it('builds a server without throwing', () => {
    expect(() => buildMcpServer(buildContext())).not.toThrow();
  });

  it('registers the three tools on the real MCP server', () => {
    const server = buildMcpServer(buildContext());
    const registered = (
      server as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(Object.keys(registered).sort()).toEqual([
      'convert_to_deck',
      'get_deck_preview',
      'list_my_decks',
    ]);
  });
});
