import type Anthropic from '@anthropic-ai/sdk';
import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';

import { logClaudeUsage } from '../../../lib/claude/logClaudeUsage';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8192;

export class FileConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileConversionError';
  }
}

interface ConvertOptions {
  pdf?: boolean;
}

function getModel(): string {
  return process.env.CLAUDE_FILE_CONVERSION_MODEL ?? DEFAULT_MODEL;
}

export async function convertWithClaude(
  client: Anthropic,
  systemPrompt: string,
  userContent: Anthropic.ContentBlockParam[],
  options: ConvertOptions = {}
): Promise<string> {
  const systemBlock: Anthropic.Beta.BetaTextBlockParam & {
    cache_control: { type: 'ephemeral' };
  } = {
    type: 'text',
    text: systemPrompt,
    cache_control: { type: 'ephemeral' },
  };

  try {
    if (options.pdf) {
      const response = await client.beta.messages.create({
        model: getModel(),
        max_tokens: MAX_TOKENS,
        system: [systemBlock],
        messages: [
          { role: 'user', content: userContent as BetaContentBlockParam[] },
        ],
        betas: ['pdfs-2024-09-25'],
      });
      logClaudeUsage('claudeFileConversion', response.usage);
      const block = response.content[0];
      return block.type === 'text' ? block.text : '';
    }

    const response = await client.messages.create({
      model: getModel(),
      max_tokens: MAX_TOKENS,
      system: [systemBlock],
      messages: [{ role: 'user', content: userContent }],
    });
    logClaudeUsage('claudeFileConversion', response.usage);
    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    throw new FileConversionError(message);
  }
}
