import { PhotoToFlashcardsUseCase } from './PhotoToFlashcardsUseCase';

jest.mock('node:fs');
jest.mock('node:child_process');

const mockFs = jest.requireMock('node:fs') as typeof import('node:fs');
const mockChild = jest.requireMock('node:child_process') as typeof import('node:child_process');

const STUB_CLAUDE_RESPONSE = `[{"deck":"My Photo","cards":[{"q":"What is photosynthesis?","a":"The process by which plants convert light into energy"},{"q":"What do plants need?","a":"Water, sunlight, and CO2"}]}]`;

jest.mock('../../lib/claude/ClaudeService', () => ({
  getAnthropicClient: jest.fn(),
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
    const stdoutHandler = mockProcess.stdout.on.mock.calls.find(([e]) => e === 'data')?.[1];
    stdoutHandler?.(apkgPath);
    const closeHandler = mockProcess.on.mock.calls.find(([e]) => e === 'close')?.[1];
    closeHandler?.(0);
  }, 0);

  return mockProcess;
}

describe('PhotoToFlashcardsUseCase', () => {
  const mockMessageCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const { getAnthropicClient } = jest.requireMock('../../lib/claude/ClaudeService') as {
      getAnthropicClient: jest.Mock;
    };
    getAnthropicClient.mockReturnValue({
      messages: {
        create: mockMessageCreate,
      },
    });
    mockMessageCreate.mockResolvedValue({
      content: [{ type: 'text', text: STUB_CLAUDE_RESPONSE }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    setupFsMocks();
    setupPythonMock();
  });

  describe('access gate', () => {
    it('throws 403 when hasAccess is false', async () => {
      const useCase = new PhotoToFlashcardsUseCase();
      await expect(
        useCase.execute({
          imageBase64: 'abc123',
          mediaType: 'image/jpeg',
          deckName: 'Test',
          hasAccess: false,
          imageDimensions: { width: 100, height: 100 },
        })
      ).rejects.toMatchObject({ status: 403 });
    });

    it('does not call Claude when access is denied', async () => {
      const useCase = new PhotoToFlashcardsUseCase();
      await expect(
        useCase.execute({
          imageBase64: 'abc123',
          mediaType: 'image/jpeg',
          deckName: 'Test',
          hasAccess: false,
          imageDimensions: { width: 100, height: 100 },
        })
      ).rejects.toMatchObject({ status: 403 });
      expect(mockMessageCreate).not.toHaveBeenCalled();
    });
  });

  describe('token ceiling', () => {
    it('throws 413 when estimated tokens exceed the ceiling (large image)', async () => {
      const useCase = new PhotoToFlashcardsUseCase();
      await expect(
        useCase.execute({
          imageBase64: 'abc123',
          mediaType: 'image/jpeg',
          deckName: 'Test',
          hasAccess: true,
          imageDimensions: { width: 100, height: 100 },
          tokenCeilingOverride: 1,
        })
      ).rejects.toMatchObject({ status: 413 });
      expect(mockMessageCreate).not.toHaveBeenCalled();
    });

    it('proceeds when estimated tokens are within ceiling', async () => {
      const useCase = new PhotoToFlashcardsUseCase();
      const result = await useCase.execute({
        imageBase64: 'abc123',
        mediaType: 'image/jpeg',
        deckName: 'Test',
        hasAccess: true,
        imageDimensions: { width: 100, height: 100 },
        tokenCeilingOverride: 999999,
      });
      expect(result.cardCount).toBeGreaterThan(0);
    });
  });

  describe('card extraction', () => {
    it('returns the correct card count from Claude response', async () => {
      const useCase = new PhotoToFlashcardsUseCase();
      const result = await useCase.execute({
        imageBase64: 'abc123',
        mediaType: 'image/jpeg',
        deckName: 'My Photo',
        hasAccess: true,
        imageDimensions: { width: 100, height: 100 },
      });
      expect(result.cardCount).toBe(2);
    });

    it('returns an apkg file path ending in .apkg', async () => {
      const useCase = new PhotoToFlashcardsUseCase();
      const result = await useCase.execute({
        imageBase64: 'abc123',
        mediaType: 'image/jpeg',
        deckName: 'My Photo',
        hasAccess: true,
        imageDimensions: { width: 100, height: 100 },
      });
      expect(result.apkgPath).toMatch(/\.apkg$/);
    });

    it('calls Claude Vision API with base64 image block', async () => {
      const useCase = new PhotoToFlashcardsUseCase();
      await useCase.execute({
        imageBase64: 'abc123',
        mediaType: 'image/jpeg',
        deckName: 'My Photo',
        hasAccess: true,
        imageDimensions: { width: 100, height: 100 },
      });
      expect(mockMessageCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image',
                  source: expect.objectContaining({ type: 'base64', data: 'abc123' }),
                }),
              ]),
            }),
          ]),
        })
      );
    });
  });
});
