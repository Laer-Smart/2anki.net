import { AutoSuggestOcclusionsUseCase } from './AutoSuggestOcclusionsUseCase';
import type { AutoOcclusionService } from '../../services/imageOcclusion/AutoOcclusionService';

function makeMockService(rects: unknown[] = []) {
  return {
    suggest: jest.fn().mockResolvedValue({
      rects,
      inputTokens: 500,
      outputTokens: 100,
    }),
  } as unknown as jest.Mocked<AutoOcclusionService>;
}

const BASE_INPUT = {
  imageBase64: 'abc123',
  mediaType: 'image/jpeg' as const,
  width: 1080,
  height: 720,
  hasAccess: true,
};

describe('AutoSuggestOcclusionsUseCase', () => {
  it('throws 403 when user does not have access', async () => {
    const service = makeMockService();
    const useCase = new AutoSuggestOcclusionsUseCase(service);

    await expect(
      useCase.execute({ ...BASE_INPUT, hasAccess: false })
    ).rejects.toMatchObject({ status: 403 });

    expect(service.suggest).not.toHaveBeenCalled();
  });

  it('throws 413 when image exceeds the token ceiling', async () => {
    const service = makeMockService();
    const useCase = new AutoSuggestOcclusionsUseCase(service);

    await expect(
      useCase.execute({
        ...BASE_INPUT,
        width: 10000,
        height: 10000,
      })
    ).rejects.toMatchObject({ status: 413 });

    expect(service.suggest).not.toHaveBeenCalled();
  });

  it('returns suggested rects from the service', async () => {
    const rect = {
      id: 'r1',
      x: 0.1,
      y: 0.1,
      w: 0.2,
      h: 0.05,
      label: 'Mitosis',
      shape: 'rect' as const,
      confidence: 0.9,
      source: 'auto' as const,
    };
    const service = makeMockService([rect]);
    const useCase = new AutoSuggestOcclusionsUseCase(service);

    const result = await useCase.execute(BASE_INPUT);

    expect(result.rects).toHaveLength(1);
    expect(result.rects[0]).toMatchObject({ label: 'Mitosis', source: 'auto' });
  });

  it('returns cached result on second call with the same image', async () => {
    const service = makeMockService([
      { id: 'r1', x: 0.1, y: 0.1, w: 0.2, h: 0.05, label: 'A', shape: 'rect', confidence: 0.9, source: 'auto' },
    ]);
    const useCase = new AutoSuggestOcclusionsUseCase(service);

    await useCase.execute(BASE_INPUT);
    await useCase.execute(BASE_INPUT);

    expect(service.suggest).toHaveBeenCalledTimes(1);
  });

  it('calls the service again for a different image', async () => {
    const service = makeMockService([]);
    const useCase = new AutoSuggestOcclusionsUseCase(service);

    await useCase.execute(BASE_INPUT);
    await useCase.execute({ ...BASE_INPUT, imageBase64: 'different' });

    expect(service.suggest).toHaveBeenCalledTimes(2);
  });
});
