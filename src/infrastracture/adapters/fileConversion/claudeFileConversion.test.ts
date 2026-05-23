import type Anthropic from '@anthropic-ai/sdk';
import { convertWithClaude, FileConversionError } from './claudeFileConversion';

const makeAnthropicMock = (responseText: string) => ({
  messages: {
    create: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: responseText }],
    }),
  },
  beta: {
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: responseText }],
      }),
    },
  },
});

describe('convertWithClaude', () => {
  it('returns the text content from the API response', async () => {
    const mock = makeAnthropicMock('<ul class="toggle"><li>Q</li></ul>');
    const result = await convertWithClaude(
      mock as unknown as Anthropic,
      'system prompt',
      [{ type: 'text', text: 'user text' }]
    );
    expect(result).toBe('<ul class="toggle"><li>Q</li></ul>');
  });

  it('throws FileConversionError when the API call fails', async () => {
    const mock = {
      messages: {
        create: jest.fn().mockRejectedValue(new Error('API unavailable')),
      },
      beta: {
        messages: {
          create: jest.fn().mockRejectedValue(new Error('API unavailable')),
        },
      },
    };
    await expect(
      convertWithClaude(mock as unknown as Anthropic, 'system prompt', [
        { type: 'text', text: 'user text' },
      ])
    ).rejects.toBeInstanceOf(FileConversionError);
  });

  it('throws FileConversionError with upstream message when API fails', async () => {
    const mock = {
      messages: {
        create: jest.fn().mockRejectedValue(new Error('rate limit exceeded')),
      },
      beta: {
        messages: {
          create: jest
            .fn()
            .mockRejectedValue(new Error('rate limit exceeded')),
        },
      },
    };
    await expect(
      convertWithClaude(mock as unknown as Anthropic, 'system prompt', [
        { type: 'text', text: 'user text' },
      ])
    ).rejects.toMatchObject({ message: 'rate limit exceeded' });
  });

  it('passes cache_control ephemeral on the system prompt block', async () => {
    const mock = makeAnthropicMock('<p>result</p>');
    await convertWithClaude(mock as unknown as Anthropic, 'my system prompt', [
      { type: 'text', text: 'user text' },
    ]);

    const callArg = (mock.messages.create as jest.Mock).mock.calls[0][0];
    expect(callArg.system).toEqual([
      {
        type: 'text',
        text: 'my system prompt',
        cache_control: { type: 'ephemeral' },
      },
    ]);
  });

  it('uses client.beta.messages.create with pdfs-2024-09-25 beta when pdf flag is set', async () => {
    const mock = makeAnthropicMock('<p>result</p>');
    await convertWithClaude(
      mock as unknown as Anthropic,
      'system prompt',
      [{ type: 'text', text: 'user text' }],
      { pdf: true }
    );

    expect(mock.messages.create).not.toHaveBeenCalled();
    const callArg = (mock.beta.messages.create as jest.Mock).mock.calls[0][0];
    expect(callArg.betas).toContain('pdfs-2024-09-25');
  });

  it('uses client.messages.create (not beta) when pdf flag is not set', async () => {
    const mock = makeAnthropicMock('<p>result</p>');
    await convertWithClaude(mock as unknown as Anthropic, 'system prompt', [
      { type: 'text', text: 'user text' },
    ]);

    expect(mock.messages.create).toHaveBeenCalled();
    expect(mock.beta.messages.create).not.toHaveBeenCalled();
  });

  it('uses 8192 max_tokens', async () => {
    const mock = makeAnthropicMock('<p>result</p>');
    await convertWithClaude(mock as unknown as Anthropic, 'system prompt', [
      { type: 'text', text: 'user text' },
    ]);

    const callArg = (mock.messages.create as jest.Mock).mock.calls[0][0];
    expect(callArg.max_tokens).toBe(8192);
  });

  it('uses the default model when CLAUDE_FILE_CONVERSION_MODEL is unset', async () => {
    const mock = makeAnthropicMock('<p>result</p>');
    delete process.env.CLAUDE_FILE_CONVERSION_MODEL;
    await convertWithClaude(mock as unknown as Anthropic, 'system prompt', [
      { type: 'text', text: 'user text' },
    ]);

    const callArg = (mock.messages.create as jest.Mock).mock.calls[0][0];
    expect(callArg.model).toBe('claude-sonnet-4-6');
  });

  it('uses CLAUDE_FILE_CONVERSION_MODEL env when set', async () => {
    const mock = makeAnthropicMock('<p>result</p>');
    process.env.CLAUDE_FILE_CONVERSION_MODEL = 'claude-opus-4-5';
    await convertWithClaude(mock as unknown as Anthropic, 'system prompt', [
      { type: 'text', text: 'user text' },
    ]);
    delete process.env.CLAUDE_FILE_CONVERSION_MODEL;

    const callArg = (mock.messages.create as jest.Mock).mock.calls[0][0];
    expect(callArg.model).toBe('claude-opus-4-5');
  });
});
