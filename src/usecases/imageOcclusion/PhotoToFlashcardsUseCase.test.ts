import {
  PhotoToFlashcardsUseCase,
  FREE_PHOTO_QUOTA_PER_MONTH,
} from './PhotoToFlashcardsUseCase';
import type { IEventsRepository } from '../../data_layer/EventsRepository';

jest.mock('node:fs');
jest.mock('node:child_process');

const mockFs = jest.requireMock('node:fs') as typeof import('node:fs');
const mockChild = jest.requireMock(
  'node:child_process'
) as typeof import('node:child_process');

const STUB_CLAUDE_RESPONSE = `[{"deck":"My Photo","cards":[{"q":"What is photosynthesis?","a":"The process by which plants convert light into energy"},{"q":"What do plants need?","a":"Water, sunlight, and CO2"}]}]`;

jest.mock('../../lib/claude/ClaudeService', () => ({
  getAnthropicClient: jest.fn(),
}));

jest.mock('../../services/events/track', () => ({
  track: jest.fn(),
}));

function setupFsMocks() {
  (mockFs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
  (mockFs.existsSync as jest.Mock).mockReturnValue(false);
  (mockFs.writeFileSync as jest.Mock).mockImplementation(() => undefined);
  (mockFs.rmSync as jest.Mock).mockImplementation(() => undefined);
}

function setupPythonMock(apkgPath = '/tmp/result.apkg') {
  const mockProcess = {
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn(),
  };
  (mockChild.spawn as jest.Mock).mockReturnValue(mockProcess);

  setTimeout(() => {
    const stdoutHandler = mockProcess.stdout.on.mock.calls.find(
      ([e]) => e === 'data'
    )?.[1];
    stdoutHandler?.(apkgPath);
    const closeHandler = mockProcess.on.mock.calls.find(
      ([e]) => e === 'close'
    )?.[1];
    closeHandler?.(0);
  }, 0);

  return mockProcess;
}

function makeEventsStub(usedThisMonth = 0): IEventsRepository {
  return {
    insertEvents: jest.fn().mockResolvedValue(undefined),
    countByName: jest.fn().mockResolvedValue(0),
    countDistinctUsers: jest.fn().mockResolvedValue(0),
    countByNameForUser: jest.fn().mockResolvedValue(usedThisMonth),
  };
}

const BASE_INPUT = {
  imageBase64: 'abc123',
  mediaType: 'image/jpeg' as const,
  deckName: 'Test',
  owner: 'user@example.com',
  imageDimensions: { width: 100, height: 100 },
};

describe('PhotoToFlashcardsUseCase', () => {
  const mockMessageCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const { getAnthropicClient } = jest.requireMock(
      '../../lib/claude/ClaudeService'
    ) as { getAnthropicClient: jest.Mock };
    getAnthropicClient.mockReturnValue({
      messages: { create: mockMessageCreate },
    });
    mockMessageCreate.mockResolvedValue({
      content: [{ type: 'text', text: STUB_CLAUDE_RESPONSE }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    setupFsMocks();
    setupPythonMock();
  });

  describe('free quota', () => {
    it('blocks a free user at the monthly limit with status 429', async () => {
      const events = makeEventsStub(FREE_PHOTO_QUOTA_PER_MONTH);
      const useCase = new PhotoToFlashcardsUseCase(events);
      await expect(
        useCase.execute({ ...BASE_INPUT, isPaying: false })
      ).rejects.toMatchObject({
        status: 429,
        used: FREE_PHOTO_QUOTA_PER_MONTH,
        limit: FREE_PHOTO_QUOTA_PER_MONTH,
      });
      expect(mockMessageCreate).not.toHaveBeenCalled();
    });

    it('lets a free user through when under the limit', async () => {
      const events = makeEventsStub(FREE_PHOTO_QUOTA_PER_MONTH - 1);
      const useCase = new PhotoToFlashcardsUseCase(events);
      const result = await useCase.execute({ ...BASE_INPUT, isPaying: false });
      expect(result.cardCount).toBe(2);
    });

    it('skips the count check entirely for paying users', async () => {
      const events = makeEventsStub(FREE_PHOTO_QUOTA_PER_MONTH * 10);
      const useCase = new PhotoToFlashcardsUseCase(events);
      const result = await useCase.execute({ ...BASE_INPUT, isPaying: true });
      expect(result.cardCount).toBe(2);
      expect(events.countByNameForUser).not.toHaveBeenCalled();
    });

    it('tracks a vision_photo_converted event on success', async () => {
      const events = makeEventsStub(0);
      const useCase = new PhotoToFlashcardsUseCase(events);
      await useCase.execute({ ...BASE_INPUT, isPaying: false });
      const { track } = jest.requireMock(
        '../../services/events/track'
      ) as { track: jest.Mock };
      expect(track).toHaveBeenCalledWith(
        'vision_photo_converted',
        expect.objectContaining({
          props: expect.objectContaining({ card_count: 2 }),
        })
      );
    });
  });

  describe('token ceiling', () => {
    it('throws 413 when estimated tokens exceed the ceiling', async () => {
      const useCase = new PhotoToFlashcardsUseCase(makeEventsStub());
      await expect(
        useCase.execute({
          ...BASE_INPUT,
          isPaying: true,
          tokenCeilingOverride: 1,
        })
      ).rejects.toMatchObject({ status: 413 });
      expect(mockMessageCreate).not.toHaveBeenCalled();
    });
  });

  describe('card extraction', () => {
    it('returns the correct card count from Claude response', async () => {
      const useCase = new PhotoToFlashcardsUseCase(makeEventsStub());
      const result = await useCase.execute({ ...BASE_INPUT, isPaying: true });
      expect(result.cardCount).toBe(2);
    });

    it('returns an apkg file path ending in .apkg', async () => {
      const useCase = new PhotoToFlashcardsUseCase(makeEventsStub());
      const result = await useCase.execute({ ...BASE_INPUT, isPaying: true });
      expect(result.apkgPath).toMatch(/\.apkg$/);
    });

    it('calls Claude Vision API with base64 image block', async () => {
      const useCase = new PhotoToFlashcardsUseCase(makeEventsStub());
      await useCase.execute({ ...BASE_INPUT, isPaying: true });
      expect(mockMessageCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image',
                  source: expect.objectContaining({
                    type: 'base64',
                    data: 'abc123',
                  }),
                }),
              ]),
            }),
          ]),
        })
      );
    });
  });

  describe('deck builder invocation', () => {
    it('spawns create_deck.py with deck_info.json and the template dir', async () => {
      const useCase = new PhotoToFlashcardsUseCase(makeEventsStub());
      await useCase.execute({ ...BASE_INPUT, isPaying: true });
      expect(mockChild.spawn).toHaveBeenCalledTimes(1);
      const [, argv] = (mockChild.spawn as jest.Mock).mock.calls[0];
      expect(argv).toHaveLength(3);
      expect(argv[0]).toMatch(/create_deck\.py$/);
      expect(argv[1]).toMatch(/deck_info\.json$/);
      expect(argv[2]).toMatch(/templates$/);
    });
  });
});
