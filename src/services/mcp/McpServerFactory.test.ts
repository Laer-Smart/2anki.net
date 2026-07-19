import { buildMcpServer, type McpRequestContext } from './McpServerFactory';
import type { McpToolsService } from './McpToolsService';

const buildContext = (
  overrides: Partial<McpRequestContext> = {}
): McpRequestContext => ({
  owner: 'user-1',
  locals: {},
  toolsService: {} as McpToolsService,
  recordToolCall: () => {},
  ...overrides,
});

type ToolHandler = (
  args: Record<string, unknown>
) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

const getHandler = (context: McpRequestContext, name: string): ToolHandler => {
  const server = buildMcpServer(context);
  const registered = (
    server as unknown as {
      _registeredTools: Record<string, { handler: ToolHandler }>;
    }
  )._registeredTools;
  return registered[name].handler;
};

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
      'photo_to_deck',
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

describe('get_deck_preview handler', () => {
  it('passes a jobId through to getDeckPreview and returns the preview', async () => {
    const getDeckPreview = jest.fn(async () => ({
      cardCount: 3,
      deckCount: 1,
      decks: [],
      sampleCards: [],
    }));
    const handler = getHandler(
      buildContext({
        owner: 'user-1',
        toolsService: { getDeckPreview } as unknown as McpToolsService,
      }),
      'get_deck_preview'
    );
    const result = await handler({ jobId: 'job-1' });
    expect(getDeckPreview).toHaveBeenCalledWith('user-1', 'job-1');
    expect(result.isError).toBeUndefined();
  });

  it('falls back to the key param when jobId is absent', async () => {
    const getDeckPreview = jest.fn(async () => ({
      cardCount: 1,
      deckCount: 1,
      decks: [],
      sampleCards: [],
    }));
    const handler = getHandler(
      buildContext({
        owner: 'user-1',
        toolsService: { getDeckPreview } as unknown as McpToolsService,
      }),
      'get_deck_preview'
    );
    await handler({ key: 'deck.apkg' });
    expect(getDeckPreview).toHaveBeenCalledWith('user-1', 'deck.apkg');
  });

  it('returns a clean error when neither jobId nor key is given', async () => {
    const getDeckPreview = jest.fn();
    const handler = getHandler(
      buildContext({
        toolsService: { getDeckPreview } as unknown as McpToolsService,
      }),
      'get_deck_preview'
    );
    const result = await handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      'Provide a jobId (from list_my_decks) or a deck key.'
    );
    expect(getDeckPreview).not.toHaveBeenCalled();
  });

  it('logs and surfaces the real error message on failure', async () => {
    const getDeckPreview = jest.fn(async () => {
      throw new Error('Deck not found.');
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const handler = getHandler(
      buildContext({
        toolsService: { getDeckPreview } as unknown as McpToolsService,
      }),
      'get_deck_preview'
    );
    const result = await handler({ jobId: 'missing' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Deck not found.');
    expect(errorSpy).toHaveBeenCalledWith(
      '[mcp] get_deck_preview failed for missing: Deck not found.'
    );
    errorSpy.mockRestore();
  });
});
