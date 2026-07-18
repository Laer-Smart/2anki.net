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

  it('registers every tool on the real MCP server', () => {
    const server = buildMcpServer(buildContext());
    const registered = (
      server as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;
    expect(Object.keys(registered).sort()).toEqual([
      'convert_to_deck',
      'create_deck',
      'deck_capabilities',
      'get_deck_preview',
      'list_my_decks',
    ]);
  });

  it('records the tool call and returns the note types and options for deck_capabilities', async () => {
    const calls: string[] = [];
    const server = buildMcpServer({
      ...buildContext(),
      recordToolCall: (name) => calls.push(name),
    });
    const capabilities = (
      server as unknown as {
        _registeredTools: Record<
          string,
          { handler: () => Promise<{ content: { text: string }[] }> }
        >;
      }
    )._registeredTools.deck_capabilities;

    const result = await capabilities.handler();
    const payload = JSON.parse(result.content[0].text) as {
      noteTypes: { name: string }[];
      options: { name: string }[];
    };

    expect(calls).toEqual(['deck_capabilities']);
    expect(payload.noteTypes.map((n) => n.name)).toEqual([
      'basic',
      'basic-reversed',
      'cloze',
      'input',
      'mcq',
    ]);
    expect(payload.options.map((o) => o.name)).toEqual(
      expect.arrayContaining([
        'noteType',
        'tags',
        'deckName',
        'styleTemplate',
        'tts',
      ])
    );
  });
});
