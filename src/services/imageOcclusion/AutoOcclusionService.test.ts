import { AutoOcclusionService } from './AutoOcclusionService';

jest.mock('../../lib/claude/ClaudeService', () => ({
  getAnthropicClient: jest.fn(),
}));

import { getAnthropicClient } from '../../lib/claude/ClaudeService';

const mockGetAnthropicClient = getAnthropicClient as jest.MockedFunction<typeof getAnthropicClient>;

function makeMockClient(responseText: string) {
  return {
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: responseText }],
        usage: { input_tokens: 1000, output_tokens: 200 },
      }),
    },
  };
}

describe('AutoOcclusionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns suggested rects from a valid Claude response', async () => {
    const rects = [
      { x: 0.1, y: 0.05, w: 0.3, h: 0.08, label: 'Mitosis', confidence: 0.9 },
    ];
    const mockClient = makeMockClient(JSON.stringify({ rects }));
    mockGetAnthropicClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>);

    const service = new AutoOcclusionService();
    const result = await service.suggest({
      imageBase64: 'abc123',
      mediaType: 'image/jpeg',
      width: 1080,
      height: 720,
    });

    expect(result.rects).toHaveLength(1);
    expect(result.rects[0]).toMatchObject({
      label: 'Mitosis',
      source: 'auto',
    });
    expect(result.inputTokens).toBe(1000);
    expect(result.outputTokens).toBe(200);
  });

  it('returns empty rects when Claude response is empty array', async () => {
    const mockClient = makeMockClient(JSON.stringify({ rects: [] }));
    mockGetAnthropicClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>);

    const service = new AutoOcclusionService();
    const result = await service.suggest({
      imageBase64: 'abc123',
      mediaType: 'image/jpeg',
      width: 800,
      height: 600,
    });

    expect(result.rects).toHaveLength(0);
  });

  it('returns empty rects when Claude response fails to parse', async () => {
    const mockClient = makeMockClient('not valid json at all');
    mockGetAnthropicClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>);

    const service = new AutoOcclusionService();
    const result = await service.suggest({
      imageBase64: 'abc123',
      mediaType: 'image/jpeg',
      width: 800,
      height: 600,
    });

    expect(result.rects).toHaveLength(0);
  });

  it('filters out rects below the confidence threshold', async () => {
    const rects = [
      { x: 0.1, y: 0.1, w: 0.2, h: 0.1, label: 'High', confidence: 0.85 },
      { x: 0.4, y: 0.1, w: 0.2, h: 0.1, label: 'Low', confidence: 0.3 },
    ];
    const mockClient = makeMockClient(JSON.stringify({ rects }));
    mockGetAnthropicClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>);

    const service = new AutoOcclusionService();
    const result = await service.suggest({
      imageBase64: 'abc123',
      mediaType: 'image/jpeg',
      width: 800,
      height: 600,
    });

    expect(result.rects).toHaveLength(1);
    expect(result.rects[0].label).toBe('High');
  });

  it('assigns source:auto to all returned rects', async () => {
    const rects = [
      { x: 0.1, y: 0.1, w: 0.2, h: 0.1, label: 'Drug A', confidence: 0.8 },
      { x: 0.4, y: 0.2, w: 0.15, h: 0.08, label: 'Drug B', confidence: 0.75 },
    ];
    const mockClient = makeMockClient(JSON.stringify({ rects }));
    mockGetAnthropicClient.mockReturnValue(mockClient as unknown as ReturnType<typeof getAnthropicClient>);

    const service = new AutoOcclusionService();
    const result = await service.suggest({
      imageBase64: 'abc123',
      mediaType: 'image/jpeg',
      width: 800,
      height: 600,
    });

    expect(result.rects.every((r) => r.source === 'auto')).toBe(true);
  });
});
