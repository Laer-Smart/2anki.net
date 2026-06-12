import type { Request, Response } from 'express';
import TagCardsController from './TagCardsController';
import { TagCardsUseCase } from '../usecases/chat/TagCardsUseCase';
import { InMemoryChatMessagesRepository } from '../data_layer/ChatMessagesRepository';

function makeAnthropic(text: string) {
  return {
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text }],
        usage: { input_tokens: 5, output_tokens: 5 },
      }),
    },
  } as unknown as ConstructorParameters<typeof TagCardsUseCase>[0];
}

function makeRes(locals: Record<string, unknown>) {
  const res = {
    locals,
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & {
    statusCode: number;
    body: unknown;
  };
}

async function repoAtCount(userId: number, count: number) {
  const repo = new InMemoryChatMessagesRepository();
  for (let i = 0; i < count; i++) {
    await repo.insert({
      userId,
      conversationId: null,
      role: 'user',
      content: `msg ${i}`,
    });
  }
  return repo;
}

describe('TagCardsController', () => {
  it('returns 429 with a resetDate for a free user over the monthly cap', async () => {
    const anthropic = makeAnthropic('[["geography"]]');
    const create = (anthropic.messages as unknown as { create: jest.Mock })
      .create;
    const repo = await repoAtCount(7, 20);
    const controller = new TagCardsController(
      new TagCardsUseCase(anthropic, repo)
    );

    const req = { body: { cards: [{ front: 'q', back: 'a' }] } } as Request;
    const res = makeRes({ owner: 7, patreon: false, subscriber: false });

    await controller.tag(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.body).toMatchObject({ error: 'Message limit reached' });
    expect((res.body as { resetDate: string }).resetDate).toMatch(
      /^\d{4}-\d{2}-\d{2}T/
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('returns 200 with tags for a free user under the cap', async () => {
    const anthropic = makeAnthropic('[["geography"]]');
    const repo = await repoAtCount(7, 19);
    const controller = new TagCardsController(
      new TagCardsUseCase(anthropic, repo)
    );

    const req = { body: { cards: [{ front: 'q', back: 'a' }] } } as Request;
    const res = makeRes({ owner: 7, patreon: false, subscriber: false });

    await controller.tag(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ tags: [['geography']] });
  });

  it('does not cap a subscriber over the free limit', async () => {
    const anthropic = makeAnthropic('[["geography"]]');
    const repo = await repoAtCount(7, 50);
    const controller = new TagCardsController(
      new TagCardsUseCase(anthropic, repo)
    );

    const req = { body: { cards: [{ front: 'q', back: 'a' }] } } as Request;
    const res = makeRes({ owner: 7, patreon: false, subscriber: true });

    await controller.tag(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ tags: [['geography']] });
  });
});
