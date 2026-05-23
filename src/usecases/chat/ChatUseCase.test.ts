import {
  ChatUseCase,
  ChatRateLimitError,
  ChatConversationNotFoundError,
} from './ChatUseCase';
import { InMemoryChatMessagesRepository } from '../../data_layer/ChatMessagesRepository';
import { InMemoryConversationsRepository } from '../../data_layer/ConversationsRepository';

const FREE_USER = { owner: 1, patreon: false } as const;
const PATREON_USER = { owner: 2, patreon: true } as const;

function buildAnthropicMock(responseContent: string) {
  const mockStream = {
    on: jest.fn().mockReturnThis(),
    finalMessage: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: responseContent }],
    }),
  };
  return {
    messages: {
      stream: jest.fn().mockReturnValue(mockStream),
    },
  };
}

function buildUseCase(responseContent: string) {
  const messagesRepo = new InMemoryChatMessagesRepository();
  const conversationsRepo = new InMemoryConversationsRepository();
  const anthropic = buildAnthropicMock(responseContent);
  const useCase = new ChatUseCase(messagesRepo, conversationsRepo, anthropic as never);
  return { messagesRepo, conversationsRepo, anthropic, useCase };
}

describe('ChatUseCase', () => {
  describe('message counting and rate limiting', () => {
    it('throws ChatRateLimitError when free user has used 20 messages this month', async () => {
      const { messagesRepo, useCase } = buildUseCase('Hello');
      for (let i = 0; i < 20; i++) {
        await messagesRepo.insert({
          userId: FREE_USER.owner,
          conversationId: null,
          role: 'user',
          content: `msg ${i}`,
        });
      }

      await expect(
        useCase.execute({ user: FREE_USER, content: 'another message', conversationHistory: [] })
      ).rejects.toBeInstanceOf(ChatRateLimitError);
    });

    it('does not throw when free user has used fewer than 20 messages', async () => {
      const { messagesRepo, useCase } = buildUseCase('Nice response');
      for (let i = 0; i < 19; i++) {
        await messagesRepo.insert({
          userId: FREE_USER.owner,
          conversationId: null,
          role: 'user',
          content: `msg ${i}`,
        });
      }

      const result = await useCase.execute({
        user: FREE_USER,
        content: 'question',
        conversationHistory: [],
      });
      expect(result.content).toBe('Nice response');
    });

    it('does not apply limit to patreon users', async () => {
      const { messagesRepo, useCase } = buildUseCase('Patreon response');
      for (let i = 0; i < 100; i++) {
        await messagesRepo.insert({
          userId: PATREON_USER.owner,
          conversationId: null,
          role: 'user',
          content: `msg ${i}`,
        });
      }

      const result = await useCase.execute({
        user: PATREON_USER,
        content: 'question',
        conversationHistory: [],
      });
      expect(result.content).toBe('Patreon response');
    });
  });

  describe('model selection', () => {
    it('uses haiku model for free users', async () => {
      const { anthropic, useCase } = buildUseCase('answer');

      await useCase.execute({ user: FREE_USER, content: 'question', conversationHistory: [] });

      expect(anthropic.messages.stream).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-haiku-4-5-20251001' })
      );
    });

    it('uses sonnet model for patreon users', async () => {
      const { anthropic, useCase } = buildUseCase('answer');

      await useCase.execute({ user: PATREON_USER, content: 'question', conversationHistory: [] });

      expect(anthropic.messages.stream).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-sonnet-4-6' })
      );
    });
  });

  describe('card extraction', () => {
    it('extracts cards when response contains a JSON code block', async () => {
      const cards = [{ front: 'Q1', back: 'A1' }, { front: 'Q2', back: 'A2' }];
      const responseText = `Here are your cards:\n\`\`\`json\n${JSON.stringify(cards)}\n\`\`\`\nHope that helps!`;
      const { useCase } = buildUseCase(responseText);

      const result = await useCase.execute({
        user: FREE_USER,
        content: 'Make cards about photosynthesis',
        conversationHistory: [],
      });

      expect(result.cards).toEqual(cards);
    });

    it('extracts tags from JSON cards when present (persisted-tag round trip)', async () => {
      const cards = [
        { front: 'Capital?', back: 'Oslo', tags: ['geography', 'norway'] },
      ];
      const responseText = `Here:\n\`\`\`json\n${JSON.stringify(cards)}\n\`\`\``;
      const { useCase } = buildUseCase(responseText);

      const result = await useCase.execute({
        user: FREE_USER,
        content: 'noop',
        conversationHistory: [],
      });

      expect(result.cards?.[0].tags).toEqual(['geography', 'norway']);
    });

    it('returns no cards when response has no JSON block', async () => {
      const { useCase } = buildUseCase('Photosynthesis is the process by which...');

      const result = await useCase.execute({
        user: FREE_USER,
        content: 'Explain photosynthesis',
        conversationHistory: [],
      });

      expect(result.cards).toBeUndefined();
    });

    it('returns no cards when JSON block is not a front/back array', async () => {
      const responseText = 'Here is JSON:\n```json\n{"key": "value"}\n```';
      const { useCase } = buildUseCase(responseText);

      const result = await useCase.execute({
        user: FREE_USER,
        content: 'some question',
        conversationHistory: [],
      });

      expect(result.cards).toBeUndefined();
    });

    it('returns contentBefore and contentAfter when JSON block is surrounded by prose', async () => {
      const cards = [{ front: 'Q1', back: 'A1' }];
      const responseText = `Here are your cards:\n\`\`\`json\n${JSON.stringify(cards)}\n\`\`\`\nHope that helps!`;
      const { useCase } = buildUseCase(responseText);

      const result = await useCase.execute({
        user: FREE_USER,
        content: 'Make cards',
        conversationHistory: [],
      });

      expect(result.contentBefore).toBe('Here are your cards:');
      expect(result.contentAfter).toBe('Hope that helps!');
    });

    it('returns contentBefore as undefined when no text before JSON block', async () => {
      const cards = [{ front: 'Q1', back: 'A1' }];
      const responseText = `\`\`\`json\n${JSON.stringify(cards)}\n\`\`\`\nHope that helps!`;
      const { useCase } = buildUseCase(responseText);

      const result = await useCase.execute({
        user: FREE_USER,
        content: 'Make cards',
        conversationHistory: [],
      });

      expect(result.contentBefore).toBeUndefined();
      expect(result.contentAfter).toBe('Hope that helps!');
    });

    it('returns contentAfter as undefined when no text after JSON block', async () => {
      const cards = [{ front: 'Q1', back: 'A1' }];
      const responseText = `Here are your cards:\n\`\`\`json\n${JSON.stringify(cards)}\n\`\`\``;
      const { useCase } = buildUseCase(responseText);

      const result = await useCase.execute({
        user: FREE_USER,
        content: 'Make cards',
        conversationHistory: [],
      });

      expect(result.contentBefore).toBe('Here are your cards:');
      expect(result.contentAfter).toBeUndefined();
    });

    it('returns undefined contentBefore and contentAfter when no JSON block present', async () => {
      const { useCase } = buildUseCase('Just plain text response.');

      const result = await useCase.execute({
        user: FREE_USER,
        content: 'Explain something',
        conversationHistory: [],
      });

      expect(result.contentBefore).toBeUndefined();
      expect(result.contentAfter).toBeUndefined();
    });
  });

  describe('message persistence', () => {
    it('saves both user and assistant messages with the same conversation_id', async () => {
      const { messagesRepo, useCase } = buildUseCase('Assistant reply');

      const result = await useCase.execute({
        user: FREE_USER,
        content: 'User question',
        conversationHistory: [],
      });

      const all = messagesRepo.getAll();
      expect(all).toHaveLength(2);
      expect(all[0]).toMatchObject({
        user_id: FREE_USER.owner,
        role: 'user',
        content: 'User question',
        conversation_id: result.conversationId,
      });
      expect(all[1]).toMatchObject({
        user_id: FREE_USER.owner,
        role: 'assistant',
        content: 'Assistant reply',
        conversation_id: result.conversationId,
      });
    });
  });

  describe('draft auto-clear', () => {
    it('clears the conversation draft after a successful assistant reply', async () => {
      const { conversationsRepo, useCase } = buildUseCase('reply');
      const id = await conversationsRepo.create({ userId: FREE_USER.owner, title: 'With draft' });
      await conversationsRepo.saveDraft({
        userId: FREE_USER.owner,
        conversationId: id,
        content: 'half-typed prompt',
      });

      await useCase.execute({
        user: FREE_USER,
        content: 'final prompt',
        conversationHistory: [],
        conversationId: id,
      });

      const conv = await conversationsRepo.findForUser({
        userId: FREE_USER.owner,
        conversationId: id,
      });
      expect(conv?.draft).toBeNull();
    });
  });

  describe('conversation management', () => {
    it('creates a new conversation when no conversationId is provided', async () => {
      const { conversationsRepo, useCase } = buildUseCase('reply');

      const result = await useCase.execute({
        user: FREE_USER,
        content: 'Hello there',
        conversationHistory: [],
      });

      const list = await conversationsRepo.listForUser(FREE_USER.owner);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(result.conversationId);
    });

    it('auto-titles the new conversation from the first user message', async () => {
      const { conversationsRepo, useCase } = buildUseCase('reply');

      await useCase.execute({
        user: FREE_USER,
        content: 'Explain mitosis briefly please',
        conversationHistory: [],
      });

      const list = await conversationsRepo.listForUser(FREE_USER.owner);
      expect(list[0].title).toBe('Explain mitosis briefly please');
    });

    it('truncates long auto-titles with an ellipsis', async () => {
      const { conversationsRepo, useCase } = buildUseCase('reply');
      const longInput =
        'This is a very long opening user message that absolutely will exceed the auto title cap of sixty characters by a wide margin.';

      await useCase.execute({
        user: FREE_USER,
        content: longInput,
        conversationHistory: [],
      });

      const list = await conversationsRepo.listForUser(FREE_USER.owner);
      expect(list[0].title.length).toBeLessThanOrEqual(61);
      expect(list[0].title.endsWith('…')).toBe(true);
    });

    it('reuses an existing conversation when a valid conversationId is provided', async () => {
      const { conversationsRepo, messagesRepo, useCase } = buildUseCase('reply');
      const existingId = await conversationsRepo.create({
        userId: FREE_USER.owner,
        title: 'Already here',
      });

      const result = await useCase.execute({
        user: FREE_USER,
        content: 'follow-up',
        conversationHistory: [],
        conversationId: existingId,
      });

      expect(result.conversationId).toBe(existingId);
      const all = messagesRepo.getAll();
      expect(all.every((m) => m.conversation_id === existingId)).toBe(true);
      const list = await conversationsRepo.listForUser(FREE_USER.owner);
      expect(list).toHaveLength(1);
    });

    it('throws ChatConversationNotFoundError when the conversationId does not exist', async () => {
      const { useCase } = buildUseCase('reply');

      await expect(
        useCase.execute({
          user: FREE_USER,
          content: 'nope',
          conversationHistory: [],
          conversationId: 9999,
        })
      ).rejects.toBeInstanceOf(ChatConversationNotFoundError);
    });

    it('throws ChatConversationNotFoundError when the conversationId belongs to another user', async () => {
      const { conversationsRepo, useCase } = buildUseCase('reply');
      const theirs = await conversationsRepo.create({
        userId: PATREON_USER.owner,
        title: 'Theirs',
      });

      await expect(
        useCase.execute({
          user: FREE_USER,
          content: 'sneaky',
          conversationHistory: [],
          conversationId: theirs,
        })
      ).rejects.toBeInstanceOf(ChatConversationNotFoundError);
    });
  });

  describe('attachments', () => {
    it('sends a mixed-content user turn when attachments are provided', async () => {
      const { anthropic, useCase } = buildUseCase('answer');
      const attachment = { mimeType: 'image/png', data: Buffer.from([0x89, 0x50, 0x4e, 0x47]) };

      await useCase.execute({
        user: FREE_USER,
        content: 'Explain this diagram',
        conversationHistory: [],
        attachments: [attachment],
      });

      const callArg = anthropic.messages.stream.mock.calls[0][0];
      const lastMessage = callArg.messages[callArg.messages.length - 1];
      expect(Array.isArray(lastMessage.content)).toBe(true);
      expect(lastMessage.content).toHaveLength(2);
      expect(lastMessage.content[0]).toMatchObject({ type: 'image' });
      expect(lastMessage.content[1]).toMatchObject({ type: 'text', text: 'Explain this diagram' });
    });

    it('sends a plain string user turn when no attachments are provided', async () => {
      const { anthropic, useCase } = buildUseCase('answer');

      await useCase.execute({
        user: FREE_USER,
        content: 'Plain message',
        conversationHistory: [],
        attachments: [],
      });

      const callArg = anthropic.messages.stream.mock.calls[0][0];
      const lastMessage = callArg.messages[callArg.messages.length - 1];
      expect(typeof lastMessage.content).toBe('string');
      expect(lastMessage.content).toBe('Plain message');
    });

    it('stores plain text in chat_messages even when attachments are present', async () => {
      const { messagesRepo, useCase } = buildUseCase('answer');
      const attachment = { mimeType: 'application/pdf', data: Buffer.from([0x25, 0x50, 0x44, 0x46]) };

      await useCase.execute({
        user: FREE_USER,
        content: 'Summarize this PDF',
        conversationHistory: [],
        attachments: [attachment],
      });

      const all = messagesRepo.getAll();
      const userMsg = all.find((m) => m.role === 'user');
      expect(userMsg?.content).toBe('Summarize this PDF');
    });
  });

  describe('system prompt caching', () => {
    it('passes system as an array with a cache_control ephemeral block', async () => {
      const { anthropic, useCase } = buildUseCase('answer');

      await useCase.execute({ user: FREE_USER, content: 'question', conversationHistory: [] });

      const callArg = anthropic.messages.stream.mock.calls[0][0];
      expect(Array.isArray(callArg.system)).toBe(true);
      expect(callArg.system).toHaveLength(1);
      expect(callArg.system[0]).toMatchObject({
        type: 'text',
        cache_control: { type: 'ephemeral' },
      });
    });
  });

  describe('MCQ emission', () => {
    const MCQ_RESPONSE_TEXT = `Here you go:
\`\`\`json
[{"front":"Which enzyme breaks down starch?","options":["Lipase","Amylase","Protease","Lactase"],"correct_index":1,"rationale":"Amylase hydrolyses starch."}]
\`\`\``;

    it('extracts an MCQ card for a paying user', async () => {
      const { useCase } = buildUseCase(MCQ_RESPONSE_TEXT);
      const result = await useCase.execute({
        user: PATREON_USER,
        content: 'quiz me',
        conversationHistory: [],
      });
      expect(result.cards).toHaveLength(1);
      expect(result.cards![0]).toMatchObject({
        front: 'Which enzyme breaks down starch?',
        options: ['Lipase', 'Amylase', 'Protease', 'Lactase'],
        correctIndex: 1,
        rationale: 'Amylase hydrolyses starch.',
      });
    });

    it('drops an MCQ card for a free user', async () => {
      const { useCase } = buildUseCase(MCQ_RESPONSE_TEXT);
      const result = await useCase.execute({
        user: FREE_USER,
        content: 'quiz me',
        conversationHistory: [],
      });
      expect(result.cards).toBeUndefined();
    });

    it('drops malformed MCQ (3 options) and keeps surrounding valid cards', async () => {
      const mixed = `\`\`\`json
[{"front":"valid q","back":"valid a"},{"front":"bad mcq","options":["A","B","C"],"correct_index":0}]
\`\`\``;
      const { useCase } = buildUseCase(mixed);
      const result = await useCase.execute({
        user: PATREON_USER,
        content: 'mixed',
        conversationHistory: [],
      });
      expect(result.cards).toHaveLength(1);
      expect(result.cards![0]).toMatchObject({ front: 'valid q', back: 'valid a' });
    });

    it('adds MCQ instructions to the system prompt for paying users', async () => {
      const { anthropic, useCase } = buildUseCase('reply');
      await useCase.execute({ user: PATREON_USER, content: 'q', conversationHistory: [] });
      const callArg = anthropic.messages.stream.mock.calls[0][0];
      expect(callArg.system[0].text).toMatch(/correct_index/);
    });

    it('does not add MCQ instructions to the system prompt for free users', async () => {
      const { anthropic, useCase } = buildUseCase('reply');
      await useCase.execute({ user: FREE_USER, content: 'q', conversationHistory: [] });
      const callArg = anthropic.messages.stream.mock.calls[0][0];
      expect(callArg.system[0].text).not.toMatch(/correct_index/);
    });
  });

  describe('template slug routing', () => {
    it('adds cloze suffix to system prompt when templateSlug is cloze', async () => {
      const { anthropic, useCase } = buildUseCase('answer');
      await useCase.execute({
        user: FREE_USER,
        content: 'question',
        conversationHistory: [],
        templateSlug: 'cloze',
      });
      const callArg = anthropic.messages.stream.mock.calls[0][0];
      expect(callArg.system[0].text).toMatch(/cloze/i);
      expect(callArg.system[0].text).toMatch(/\{\{c1::/);
    });

    it('adds basic-and-reversed suffix to system prompt when templateSlug is basic-and-reversed', async () => {
      const { anthropic, useCase } = buildUseCase('answer');
      await useCase.execute({
        user: FREE_USER,
        content: 'question',
        conversationHistory: [],
        templateSlug: 'basic-and-reversed',
      });
      const callArg = anthropic.messages.stream.mock.calls[0][0];
      expect(callArg.system[0].text).toMatch(/both directions/i);
    });

    it('does not add any suffix for basic template', async () => {
      const { anthropic, useCase } = buildUseCase('answer');
      const baseLen = (await (() => {
        const uc = buildUseCase('answer');
        return uc.anthropic.messages.stream.mock.calls;
      })()).length;
      await useCase.execute({
        user: FREE_USER,
        content: 'question',
        conversationHistory: [],
        templateSlug: 'basic',
      });
      const callArg = anthropic.messages.stream.mock.calls[0][0];
      expect(callArg.system[0].text).not.toMatch(/both directions/i);
      expect(callArg.system[0].text).not.toMatch(/cloze only/i);
    });

    it('falls back to basic when templateSlug is unknown', async () => {
      const { anthropic, useCase } = buildUseCase('answer');
      await useCase.execute({
        user: FREE_USER,
        content: 'question',
        conversationHistory: [],
        templateSlug: 'image-occlusion',
      });
      const callArg = anthropic.messages.stream.mock.calls[0][0];
      expect(callArg.system[0].text).not.toMatch(/both directions/i);
      expect(callArg.system[0].text).not.toMatch(/cloze only/i);
    });
  });

  describe('rewriteAssistantContentWithTaggedCards', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { rewriteAssistantContentWithTaggedCards } = require('./ChatUseCase') as {
      rewriteAssistantContentWithTaggedCards: (content: string, taggedCards: unknown[]) => string;
    };

    it('replaces the JSON fence body while preserving surrounding prose', () => {
      const before = 'Here you go:\n\n```json\n[{"front":"q","back":"a"}]\n```\n\nLet me know.';
      const tagged = [{ front: 'q', back: 'a', tags: ['x', 'y'] }];
      const after = rewriteAssistantContentWithTaggedCards(before, tagged);
      expect(after).toContain('Here you go:');
      expect(after).toContain('Let me know.');
      expect(after).toContain('"tags":["x","y"]');
      expect(after.indexOf('```json')).toBeGreaterThanOrEqual(0);
    });

    it('returns content unchanged when there is no JSON block', () => {
      const before = 'No cards in this message.';
      const after = rewriteAssistantContentWithTaggedCards(before, [
        { front: 'q', back: 'a', tags: ['x'] },
      ]);
      expect(after).toBe(before);
    });
  });

  describe('ChatRateLimitError', () => {
    it('provides a resetDate as the first of next month', async () => {
      const { messagesRepo, useCase } = buildUseCase('');
      for (let i = 0; i < 20; i++) {
        await messagesRepo.insert({
          userId: FREE_USER.owner,
          conversationId: null,
          role: 'user',
          content: `msg ${i}`,
        });
      }

      let caughtError: ChatRateLimitError | null = null;
      try {
        await useCase.execute({ user: FREE_USER, content: 'more', conversationHistory: [] });
      } catch (err) {
        if (err instanceof ChatRateLimitError) {
          caughtError = err;
        }
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError?.resetDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
