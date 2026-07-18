import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { McpToolsService } from './McpToolsService';

export const MCP_SERVER_NAME = '2anki';
export const MCP_SERVER_VERSION = '1.0.0';

export interface McpRequestContext {
  owner: string;
  locals: Record<string, unknown>;
  toolsService: McpToolsService;
  recordToolCall: (toolName: string) => void;
}

type ToolShape = Record<string, z.ZodTypeAny>;

interface ToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

interface ToolConfig {
  title: string;
  description: string;
  inputSchema: ToolShape;
}

type ErasedRegisterTool = (
  name: string,
  config: ToolConfig,
  handler: (args: Record<string, unknown>) => Promise<ToolResult>
) => void;

function registerTool<Args>(
  server: McpServer,
  name: string,
  config: ToolConfig,
  handler: (args: Args) => Promise<ToolResult>
): void {
  const erasedServer = server as unknown as {
    registerTool: ErasedRegisterTool;
  };
  erasedServer.registerTool(
    name,
    config,
    handler as (args: Record<string, unknown>) => Promise<ToolResult>
  );
}

function textResult(payload: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

function errorResult(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

export function buildMcpServer(context: McpRequestContext): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  registerTool<Record<string, never>>(
    server,
    'list_my_decks',
    {
      title: 'List my decks',
      description:
        'List the conversion jobs and decks in your 2anki account, newest first.',
      inputSchema: {},
    },
    async () => {
      context.recordToolCall('list_my_decks');
      const decks = await context.toolsService.listMyDecks(context.owner);
      return textResult({ decks });
    }
  );

  registerTool<{ jobId: string }>(
    server,
    'get_deck_preview',
    {
      title: 'Get deck preview',
      description:
        'Preview an .apkg deck you own — total cards, decks, and a sample of cards.',
      inputSchema: {
        jobId: z
          .string()
          .describe('The jobId of the deck, as returned by list_my_decks.'),
      },
    },
    async ({ jobId }) => {
      context.recordToolCall('get_deck_preview');
      try {
        const preview = await context.toolsService.getDeckPreview(
          context.owner,
          jobId
        );
        return textResult(preview);
      } catch (error) {
        return errorResult(
          error instanceof Error ? error.message : 'Could not load the deck.'
        );
      }
    }
  );

  registerTool<{ url?: string; text?: string; filename?: string }>(
    server,
    'convert_to_deck',
    {
      title: 'Convert to Anki deck',
      description:
        'Convert a URL or text into an Anki deck. Returns the deck preview (card count and a sample of cards) for an immediate conversion, or a job id to check with list_my_decks for a queued one — never raw file bytes.',
      inputSchema: {
        url: z
          .string()
          .url()
          .optional()
          .describe('A public URL to a file to convert.'),
        text: z
          .string()
          .optional()
          .describe('Markdown or HTML text to convert into cards.'),
        filename: z
          .string()
          .optional()
          .describe('Optional filename, e.g. notes.md.'),
      },
    },
    async ({ url, text, filename }) => {
      context.recordToolCall('convert_to_deck');
      const result = await context.toolsService.convertToDeck(
        { url, text, filename },
        context.locals
      );
      if (result.kind === 'error') {
        return errorResult(result.message);
      }
      return textResult(result);
    }
  );

  return server;
}
