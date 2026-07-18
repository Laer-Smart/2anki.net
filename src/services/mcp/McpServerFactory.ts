import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { McpToolsService } from './McpToolsService';
import { McpConvertOptions } from './mcpOptionsToCardSettings';
import { DECK_CAPABILITIES } from './deckCapabilities';

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

  const convertOptionsSchema = z
    .object({
      noteType: z
        .enum(['basic', 'basic-reversed', 'cloze', 'input', 'mcq'])
        .optional()
        .describe(
          'The Anki note type. Cloze also needs {{c1::}} markup in the text.'
        ),
      tags: z
        .array(z.string())
        .optional()
        .describe('Anki tags applied to every card in the deck.'),
      deckName: z
        .string()
        .optional()
        .describe('Name the deck. Use :: to nest subdecks, e.g. MS3::Cardio.'),
      splitByHeadings: z
        .boolean()
        .optional()
        .describe('Turn each heading and section into its own subdeck.'),
      splitSectionsIntoDecks: z
        .boolean()
        .optional()
        .describe('Alias of splitByHeadings.'),
      styleTemplate: z
        .enum(['specialstyle', 'nostyle', 'abhiyan', 'alex_deluxe'])
        .optional()
        .describe('The card visual style. nostyle strips all styling.'),
      tts: z
        .object({
          enabled: z.boolean(),
          language: z
            .string()
            .optional()
            .describe(
              'A fixed voice language, e.g. ja-JP. Omit to auto-detect.'
            ),
          side: z.enum(['front', 'back', 'both']).optional(),
        })
        .optional()
        .describe('Add text-to-speech playback to the cards.'),
    })
    .optional();

  registerTool<{
    url?: string;
    text?: string;
    filename?: string;
    options?: McpConvertOptions;
  }>(
    server,
    'convert_to_deck',
    {
      title: 'Convert to Anki deck',
      description:
        'Convert a URL or text into an Anki deck. Pass options to control the output: request a note type (basic, basic-reversed, cloze, input, or mcq), add tags, name and nest the deck with ::, split sections into subdecks, pick a style, or add text-to-speech. Call deck_capabilities first to learn every option. Returns the deck preview (card count and a sample of cards) for an immediate conversion, or a job id to check with list_my_decks for a queued one — never raw file bytes.',
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
        options: convertOptionsSchema.describe(
          'Curated card options. See deck_capabilities for the full list.'
        ),
      },
    },
    async ({ url, text, filename, options }) => {
      context.recordToolCall('convert_to_deck');
      const result = await context.toolsService.convertToDeck(
        { url, text, filename, options },
        context.owner,
        context.locals
      );
      if (result.kind === 'error') {
        return errorResult(result.message);
      }
      return textResult(result);
    }
  );

  registerTool<{ cards: { front: string; back: string }[]; deckName?: string }>(
    server,
    'create_deck',
    {
      title: 'Create an Anki deck from cards',
      description:
        'Build an Anki deck from structured front/back cards. Returns a deck preview and a no-login download link for the .apkg, plus a job id you can find later with list_my_decks.',
      inputSchema: {
        cards: z
          .array(
            z.object({
              front: z
                .string()
                .min(1)
                .describe('The question or prompt shown first.'),
              back: z.string().describe('The answer shown after.'),
            })
          )
          .min(1)
          .max(500)
          .describe('The Basic front/back cards to put in the deck.'),
        deckName: z
          .string()
          .optional()
          .describe('Optional deck name, e.g. Pharmacology.'),
      },
    },
    async ({ cards, deckName }) => {
      context.recordToolCall('create_deck');
      const result = await context.toolsService.createDeck(
        cards,
        deckName,
        context.owner,
        context.locals
      );
      if (result.kind === 'error') {
        return errorResult(result.message);
      }
      return textResult(result);
    }
  );

  registerTool<Record<string, never>>(
    server,
    'deck_capabilities',
    {
      title: 'Deck capabilities',
      description:
        'Discover what convert_to_deck can produce — the note types with when to use each, the curated card options, the supported input kinds, and the cloze and :: subdeck conventions. Call this once to learn the surface before converting.',
      inputSchema: {},
    },
    async () => {
      context.recordToolCall('deck_capabilities');
      return textResult(DECK_CAPABILITIES);
    }
  );

  return server;
}
