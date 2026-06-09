import {
  AnkiConnectClient,
  AnkiConnectCreateModelParams,
} from './AnkiConnectClient';
import {
  ankifyBasicCreateModelParams,
  ankifyClozeCreateModelParams,
} from './ankifyModels';
import {
  AnkifyTemplateOverrides,
  buildBasicModelFromTemplate,
} from './templateOverrides';

const ALREADY_EXISTS_PATTERN = /already\s+exists/i;

const isAlreadyExistsError = (error: unknown): boolean =>
  error instanceof Error && ALREADY_EXISTS_PATTERN.test(error.message);

const ensureSingleModel = async (
  ac: AnkiConnectClient,
  cache: Set<string>,
  params: AnkiConnectCreateModelParams
): Promise<void> => {
  if (cache.has(params.modelName)) {
    return;
  }
  try {
    await ac.createModel(params);
  } catch (error) {
    if (!isAlreadyExistsError(error)) {
      throw error;
    }
  }
  cache.add(params.modelName);
};

const resolveBasicParams = (
  overrides: AnkifyTemplateOverrides | null
): AnkiConnectCreateModelParams =>
  overrides
    ? buildBasicModelFromTemplate(
        overrides.basicTemplate,
        overrides.basicModelName
      )
    : ankifyBasicCreateModelParams();

export const ensureAnkifyModels = async (
  ac: AnkiConnectClient,
  cache: Set<string>,
  overrides: AnkifyTemplateOverrides | null = null
): Promise<void> => {
  const basicParams = resolveBasicParams(overrides);
  const clozeParams = ankifyClozeCreateModelParams();

  if (cache.has(basicParams.modelName) && cache.has(clozeParams.modelName)) {
    return;
  }

  const existing = new Set(await ac.modelNames());
  for (const name of existing) {
    if (name === basicParams.modelName || name === clozeParams.modelName) {
      cache.add(name);
    }
  }

  await ensureSingleModel(ac, cache, basicParams);
  await ensureSingleModel(ac, cache, clozeParams);
};
