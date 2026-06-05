import { ensureAnkifyModels } from './ensureAnkifyModels';
import { ANKIFY_BASIC_MODEL, ANKIFY_CLOZE_MODEL } from './ankifyModels';
import { AnkiConnectClient } from './AnkiConnectClient';

const makeStub = (modelNames: string[]) => {
  const stub = {
    modelNames: jest.fn(async () => modelNames),
    createModel: jest.fn(async () => ({ id: 1 })),
  };
  return stub as unknown as AnkiConnectClient & typeof stub;
};

describe('ensureAnkifyModels', () => {
  test('creates both Ankify models when AnkiConnect has neither', async () => {
    const ac = makeStub(['Kaishi 1.5k', 'JlabNote', 'PrettyYomitan']);
    const cache = new Set<string>();

    await ensureAnkifyModels(ac, cache);

    expect(ac.createModel).toHaveBeenCalledTimes(2);
    const created = (ac.createModel as jest.Mock).mock.calls.map(
      (args) => (args[0] as { modelName: string }).modelName
    );
    expect(created).toEqual(
      expect.arrayContaining([ANKIFY_BASIC_MODEL, ANKIFY_CLOZE_MODEL])
    );
    expect(cache.has(ANKIFY_BASIC_MODEL)).toBe(true);
    expect(cache.has(ANKIFY_CLOZE_MODEL)).toBe(true);
  });

  test('skips creation entirely when both models already exist', async () => {
    const ac = makeStub([ANKIFY_BASIC_MODEL, ANKIFY_CLOZE_MODEL, 'Other']);
    const cache = new Set<string>();

    await ensureAnkifyModels(ac, cache);

    expect(ac.createModel).not.toHaveBeenCalled();
    expect(cache.has(ANKIFY_BASIC_MODEL)).toBe(true);
    expect(cache.has(ANKIFY_CLOZE_MODEL)).toBe(true);
  });

  test('a second call with the same cache makes no AnkiConnect round-trip', async () => {
    const ac = makeStub([]);
    const cache = new Set<string>();

    await ensureAnkifyModels(ac, cache);
    (ac.modelNames as jest.Mock).mockClear();
    (ac.createModel as jest.Mock).mockClear();

    await ensureAnkifyModels(ac, cache);

    expect(ac.modelNames).not.toHaveBeenCalled();
    expect(ac.createModel).not.toHaveBeenCalled();
  });

  test('treats createModel "already exists" failure as success (race-safe)', async () => {
    const ac = makeStub([]);
    (ac.createModel as jest.Mock).mockRejectedValueOnce(
      new Error('Model name already exists')
    );
    const cache = new Set<string>();

    await ensureAnkifyModels(ac, cache);

    expect(cache.has(ANKIFY_BASIC_MODEL)).toBe(true);
    expect(cache.has(ANKIFY_CLOZE_MODEL)).toBe(true);
  });
});
